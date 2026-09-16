"""Offline model comparison only; never imported by the serving path.

Use the same CLI as gate_eval. Frozen plans include this wrapper's source hash.
Public synthetic development cases only; serving MODEL remains unchanged.
"""
from . import evidence_gate, gate_eval

EXPERIMENT_MODEL = 'gpt-4.1-mini-2025-04-14'


def main():
    evidence_gate.MODEL = EXPERIMENT_MODEL
    gate_eval.FILES = [*gate_eval.FILES, 'gate_model_eval.py']
    gate_eval.main()


if __name__ == '__main__':
    main()
