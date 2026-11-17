"""Offline exact-target BM25 diagnostic for authored expansion development probes.

Not the serving retriever, held-out evidence, or an answer-quality release gate.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .benchmark import fingerprint
from .embeddings import format_chunk_text
from .lexical import BM25Index
from .loader import ContrastNote
from .validate_corpus import load_bundle, validate_bundle


def metrics(rows):
    count = len(rows)
    return {
        "cases": count,
        **{f"hit_at_{k}": sum(r["target_rank"] is not None and r["target_rank"] <= k for r in rows) / count if count else None for k in (1, 3, 5)},
        "mrr_at_5": sum(1 / r["target_rank"] if r["target_rank"] else 0 for r in rows) / count if count else None,
    }


def evaluate(bundle=None):
    bundle = load_bundle() if bundle is None else bundle
    validation = validate_bundle(bundle)
    if validation["errors"]:
        raise ValueError("Invalid corpus bundle: " + "; ".join(validation["errors"]))
    notes = [ContrastNote.model_validate(raw) for raw in bundle["notes"]]
    index = BM25Index([(note.id, format_chunk_text(note)) for note in notes])
    rows = []
    for case in bundle["expansion"]:
        # Only learner question text enters retrieval: no title, bucket or gold label.
        ranked = [candidate.note_id for candidate in index.rank(case["question"], limit=5)]
        target = case["expected_note_id"]
        rows.append({"case_id": case["case_id"], "bucket": case["bucket"],
                     "expected_note_id": target, "retrieved_note_ids": ranked,
                     "target_rank": ranked.index(target) + 1 if target in ranked else None})
    return {
        "status": "development_diagnostic_only", "quality_gate": False,
        "corpus_revision": bundle["dataset"]["corpus_revision"],
        "note_count": len(notes), "corpus_sha256": fingerprint(bundle["notes"]),
        "cases_sha256": fingerprint(bundle["expansion"]),
        "method": "BM25 question-only; k1=1.2, b=0.75, top_k=5",
        "summary": metrics(rows),
        "buckets": {bucket: metrics([r for r in rows if r["bucket"] == bucket]) for bucket in sorted({r["bucket"] for r in rows})},
        "results": rows,
        "limitations": [
            "Questions were authored alongside notes; scores are not held-out generalization evidence.",
            "Exact target labels are not exhaustive judgments of all relevant notes.",
            "Offline BM25 is not the production vector/hybrid retriever.",
            "No provider, database, generated answer, latency, cost or learning outcome was evaluated.",
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    report = evaluate()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
