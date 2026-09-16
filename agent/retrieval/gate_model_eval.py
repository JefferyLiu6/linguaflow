"""Offline model comparison only; never imported by the serving path.

Use the same CLI as gate_eval. Frozen plans include this wrapper's source hash.
Public synthetic development cases only; serving MODEL remains unchanged.
"""
from . import evidence_gate, gate_eval

EXPERIMENT_MODEL = 'gpt-4.1-mini-2025-04-14'


def main():
    evidence_gate.MODEL = EXPERIMENT_MODEL
    evidence_gate.PROMPT += '''
Interpret a learner's plain-language description semantically: they do not need to name a grammatical category explicitly. A request to make the receiver the subject can ask for passive voice without saying passive. Applicability guidance describes the intended task, not required keyword matches.
For support_quote, copy a SHORT EXACT contiguous passage of at least 20 characters ONLY from the selected reference's rule field. Do not copy when_to_use or title. Do not join separated passages, add ellipses, normalize punctuation, or paraphrase the quote. Keep the rationale under 35 words.'''
    gate_eval.FILES = [*gate_eval.FILES, 'gate_model_eval.py']
    gate_eval.main()


if __name__ == '__main__':
    main()
