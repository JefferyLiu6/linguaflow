"""DeepEval custom metrics over saved judgments; zero additional judge calls.

Import only in explicit offline integration checks. Disable library telemetry.
"""
import os
os.environ['DEEPEVAL_TELEMETRY_OPT_OUT'] = 'YES'
os.environ['CONFIDENT_AI_TELEMETRY_OPT_OUT'] = 'YES'
from deepeval.metrics import BaseMetric


class SavedRubricMetric(BaseMetric):
    def __init__(self, key, scale=1, threshold=.8):
        self.key = key
        self.scale = scale
        self.threshold = threshold
        self.score = None
        self.reason = None
        self.error = None
        self.success = False
        self.async_mode = False
        self.strict_mode = False
        self.evaluation_model = 'saved-custom-judge-verdict'

    def measure(self, test_case, *args, **kwargs):
        self.error = None
        data = test_case.additional_metadata or {}
        if data.get('judge_status') != 'ok' or data.get('scores', {}).get(self.key) is None:
            self.error = 'Metric unavailable; do not treat an unjudged or inapplicable case as passing'
            raise ValueError(self.error)
        self.score = float(data['scores'][self.key])/self.scale
        self.reason = data.get('judge_reason','Saved custom rubric')
        self.success = self.score >= self.threshold
        return self.score

    async def a_measure(self, test_case, *args, **kwargs):
        return self.measure(test_case)

    def is_successful(self):
        return self.error is None and self.score is not None and self.score >= self.threshold

    @property
    def __name__(self):
        return 'LinguaFlow '+self.key
