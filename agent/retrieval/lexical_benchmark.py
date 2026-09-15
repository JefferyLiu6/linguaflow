"""Compare metadata and fixed BM25 arms on unchanged freeform/challenge fixtures.

Usage: python -m retrieval.lexical_benchmark --output runs/lexical-evidence.json
This diagnostic exits nonzero on invalid input, not on low relevance scores.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from .benchmark import fingerprint, source_fingerprint, git_revision
from .embeddings import format_chunk_text, CHUNK_FORMAT_VERSION
from .eval_cases_freeform import all_freeform_cases
from .eval_runner import evaluate_freeform_case_metadata
from .lexical import BM25Index, STOPWORDS
from .loader import load_contrast_docs
from .validate_corpus import validate_corpus

THRESHOLDS = (0.0, 2.0, 4.0, 8.0, 12.0)


def query_text(case, *, include_card: bool) -> str:
    parts = [case.question]
    if include_card:
        # Same content available to the existing freeform vector formatter.
        parts += [str(case.current_item.get(key) or "") for key in ("instruction", "prompt", "answer")]
    return "\n".join(parts)


def summarize(rows: list[dict], *, ranking: bool) -> dict:
    positive = [r for r in rows if r["expected_note_id"] is not None]
    negative = [r for r in rows if r["expected_note_id"] is None]
    def fraction(numerator, denominator):
        return numerator / denominator if denominator else None
    summary = {
        "positive_cases": len(positive), "negative_cases": len(negative),
        "correct_positive": sum(r["selected_note_id"] == r["expected_note_id"] for r in positive),
        "false_positives": sum(r["selected_note_id"] is not None for r in negative),
        "missed_positives": sum(r["selected_note_id"] is None for r in positive),
    }
    summary["positive_accuracy"] = fraction(summary["correct_positive"], len(positive))
    summary["false_positive_rate"] = fraction(summary["false_positives"], len(negative))
    if ranking:
        ranks = [r["gold_rank"] for r in positive]
        for k in (1, 3, 5):
            summary[f"recall_at_{k}"] = fraction(sum(rank is not None and rank <= k for rank in ranks), len(positive))
        summary["mrr_at_5"] = fraction(sum(1 / rank for rank in ranks if rank is not None), len(positive))
    return summary


def build_report() -> dict:
    validation = validate_corpus()
    if validation["errors"]:
        raise ValueError("Invalid bundle: " + "; ".join(validation["errors"]))
    docs = load_contrast_docs("en")
    index = BM25Index([(doc.id, format_chunk_text(doc)) for doc in docs])
    sets = {}
    case_sets = {"development": all_freeform_cases(), "challenge": all_freeform_cases(challenge=True)}
    for split, cases in case_sets.items():
        metadata = []
        for case in cases:
            result = evaluate_freeform_case_metadata(case)
            metadata.append({"case_id": case.case_id, "question": case.question, "expected_note_id": case.expected_note_id, "selected_note_id": result.selected_note_id})
        arms = {"metadata": {"summary": summarize(metadata, ranking=False), "results": metadata}}
        for name, include_card in (("bm25_question", False), ("bm25_question_card", True)):
            rows = []
            for case in cases:
                query = query_text(case, include_card=include_card)
                candidates = index.rank(query)
                ids = [candidate.note_id for candidate in candidates]
                rows.append({
                    "case_id": case.case_id, "question": case.question, "query": query,
                    "expected_note_id": case.expected_note_id,
                    "selected_note_id": ids[0] if ids else None,
                    "gold_rank": ids.index(case.expected_note_id) + 1 if case.expected_note_id in ids else None,
                    "candidates": [asdict(candidate) for candidate in candidates],
                })
            sensitivity = []
            for threshold in THRESHOLDS:
                adjusted = [{**row, "selected_note_id": row["selected_note_id"] if row["candidates"] and row["candidates"][0]["score"] > threshold else None} for row in rows]
                sensitivity.append({"threshold_strictly_greater_than": threshold, "summary": summarize(adjusted, ranking=False)})
            arms[name] = {"summary": summarize(rows, ranking=True), "results": rows, "threshold_sensitivity": sensitivity}
        sets[split] = arms
    return {
        "schema_version": 1, "status": "diagnostic_completed", "quality_gate": False,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "provenance": {"git_revision": git_revision(), "bundle_sha256": validation["bundle_sha256"],
                       "source_sha256": source_fingerprint(), "cases_sha256": fingerprint({name: [asdict(c) for c in cases] for name, cases in case_sets.items()})},
        "configuration": {"k1": index.k1, "b": index.b, "candidate_limit": 5, "default_min_score_exclusive": 0,
                          "chunk_format": CHUNK_FORMAT_VERSION, "stopwords": sorted(STOPWORDS),
                          "tokenization": "Unicode casefold, alphanumeric tokens; no stemming; unique query terms", "thresholds": THRESHOLDS},
        "limitations": ["Development/challenge data with corpus-aware authorship; no independent held-out results.",
                        "Single gold note; plausible alternative relevance requires independent adjudication.",
                        "BM25 score is not confidence. Threshold sweep is sensitivity only; no serving threshold selected.",
                        "No vector calls, generated answers, service latency, or learner outcomes measured.",
                        "Runtime retrieval policy unchanged. A completed diagnostic is not a passed quality gate."],
        "sets": sets,
    }


def review_packet(report: dict) -> dict:
    """Unresolved disagreements; proposed labels are deliberately left empty."""
    cases = []
    for split, arms in report["sets"].items():
        by_arm = {name: {row["case_id"]: row for row in arm["results"]} for name, arm in arms.items()}
        for row in arms["bm25_question"]["results"]:
            predictions = {name: rows[row["case_id"]] for name, rows in by_arm.items()}
            if all(item["selected_note_id"] == row["expected_note_id"] for item in predictions.values()):
                continue
            cases.append({
                "case_id": row["case_id"], "split": split, "question": row["question"],
                "existing_gold_note_id": row["expected_note_id"],
                "predictions": predictions,
                "review_status": "pending", "reviewer": None,
                "acceptable_note_ids": None, "corpus_covers_question": None,
                "reason": None, "action": None,
            })
    return {"provenance": report["provenance"], "instructions": [
        "Review the question, full fixture context, and candidate note text before judging relevance.",
        "Record all sufficient notes or an empty list for no coverage; null means unreviewed.",
        "Choose an action: keep label, correct label, clarify query, revise note, or leave unresolved.",
        "This packet shows model predictions and existing labels; it is not a blinded or held-out review.",
        "Preserve the original benchmark and record a rationale before changing labels."], "cases": cases}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--review-output", type=Path)
    args = parser.parse_args(argv)
    try:
        report = build_report()
    except (ValueError, OSError, TypeError, KeyError) as exc:
        report = {"status": "invalid", "errors": [str(exc)]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    if args.review_output and report["status"] != "invalid":
        args.review_output.parent.mkdir(parents=True, exist_ok=True)
        args.review_output.write_text(json.dumps(review_packet(report), indent=2) + "\n")
    for split, arms in report.get("sets", {}).items():
        for name, arm in arms.items():
            print(split, name, json.dumps(arm["summary"]))
    return 1 if report["status"] == "invalid" else 0


if __name__ == "__main__":
    raise SystemExit(main())
