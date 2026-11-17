"""Sequential provider budget guard for the evaluation process only.

Reserve uncached input at a conservative UTF-8-byte token bound plus framing,
and the full output limit before each request. Unknown usage retains its entire
reservation and stops further collection. This is a pricing estimate, not an invoice.
"""
from contextlib import contextmanager
import json
import math
from unittest.mock import patch


class BudgetExceeded(RuntimeError):
    pass


class Budget:
    def __init__(self, prices, max_usd, max_requests):
        if not math.isfinite(max_usd) or max_usd <= 0 or max_requests < 1:
            raise ValueError('Positive finite collection limits required')
        self.prices = prices
        self.max_usd = max_usd
        self.max_requests = max_requests
        self.charged = 0.0
        self.entries = []
        self.stopped = None

    def reserve(self, kind, kwargs):
        if self.stopped:
            raise BudgetExceeded(self.stopped)
        model = kwargs.get('model')
        if model not in self.prices:
            self.stopped = 'unpriced_model'
            raise BudgetExceeded(self.stopped)
        output = kwargs.get('max_tokens', 0)
        if kind == 'chat' and (type(output) is not int or not 1 <= output <= 2000):
            self.stopped = 'unbounded_output'
            raise BudgetExceeded(self.stopped)
        # Covers messages, JSON schema and input strings. IDs and numerical
        # settings add bytes too; the extra allowance covers protocol framing.
        input_bound = len(json.dumps(kwargs, ensure_ascii=False).encode()) + 4096
        price = self.prices[model]
        reservation = (input_bound * price['input'] + output * price['output']) / 1e6
        if len(self.entries) >= self.max_requests or self.charged + reservation > self.max_usd:
            self.stopped = 'collection_budget_exhausted'
            raise BudgetExceeded(self.stopped)
        entry = {'model': model, 'kind': kind, 'status': 'reserved',
                 'input_token_upper_bound': input_bound, 'output_token_limit': output,
                 'reserved_usd': reservation, 'accounted_usd': reservation}
        self.entries.append(entry)
        self.charged += reservation
        return entry

    def settle(self, entry, response):
        usage = getattr(response, 'usage', None)
        inputs = getattr(usage, 'prompt_tokens', None)
        outputs = getattr(usage, 'completion_tokens', 0) if entry['kind'] == 'chat' else 0
        if type(inputs) is not int or type(outputs) is not int or inputs < 0 or outputs < 0:
            self.unknown(entry)
            raise BudgetExceeded('provider_usage_unknown')
        price = self.prices[entry['model']]
        # Intentionally charge all input at uncached pricing for the budget.
        # The ordinary report separately calculates recorded cached-token cost.
        actual = (inputs * price['input'] + outputs * price['output']) / 1e6
        self.charged += actual - entry['accounted_usd']
        entry.update(status='measured', input_tokens=inputs, output_tokens=outputs, accounted_usd=actual)
        if inputs > entry['input_token_upper_bound'] or outputs > entry['output_token_limit']:
            self.stopped = 'provider_usage_exceeded_reservation'
            raise BudgetExceeded(self.stopped)

    def unknown(self, entry):
        if entry['status'] == 'reserved':
            entry['status'] = 'usage_unknown'
            self.stopped = 'provider_usage_unknown'

    def receipt(self):
        return {'max_usd': self.max_usd, 'max_requests': self.max_requests,
                'provider_requests_attempted': len(self.entries),
                'accounted_upper_usd': self.charged, 'stop_reason': self.stopped,
                'unknown_usage_requests': sum(e['status'] == 'usage_unknown' for e in self.entries),
                'pricing': 'uncached input; unknown usage retains reservation', 'requests': self.entries}


@contextmanager
def guarded_clients(budget):
    """Wrap both SDK entry points; disable retries and patch only in this sequential CLI."""
    from openai import OpenAI, AsyncOpenAI

    def synchronous(*args, **kwargs):
        kwargs['max_retries'] = 0
        client = OpenAI(*args, **kwargs)
        original = client.embeddings.create

        def create(**request):
            entry = budget.reserve('embedding', request)
            try:
                response = original(**request)
                budget.settle(entry, response)
                return response
            except BaseException:
                budget.unknown(entry)
                raise
        client.embeddings.create = create
        return client

    def asynchronous(*args, **kwargs):
        kwargs['max_retries'] = 0
        client = AsyncOpenAI(*args, **kwargs)
        original = client.chat.completions.create

        async def create(**request):
            entry = budget.reserve('chat', request)
            try:
                response = await original(**request)
                budget.settle(entry, response)
                return response
            except BaseException:
                budget.unknown(entry)
                raise
        client.chat.completions.create = create
        return client

    with patch('openai.OpenAI', synchronous), patch('openai.AsyncOpenAI', asynchronous):
        yield
