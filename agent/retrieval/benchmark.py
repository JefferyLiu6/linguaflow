"""Offline, reproducible retrieval regression evidence. No embedding/LLM calls."""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
from dataclasses import asdict, replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .eval_cases import all_retrieval_cases
from .eval_runner import run_eval_cases, summarize_results
from .loader import load_contrast_docs
from .retrieve import MIN_RETRIEVAL_SCORE

ROOT = Path(__file__).resolve().parents[2]


def fingerprint(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def source_fingerprint() -> str:
    # Hash contents as well as filenames: a dirty checkout is still identifiable.
    paths = sorted((ROOT / "agent/retrieval").glob("*.py"))
    return fingerprint({str(p.relative_to(ROOT)): p.read_text() for p in paths})


def git_revision() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def quality_failures(summary: dict, min_exact: float, max_false_positive: float) -> list[str]:
    failures = []
    if not summary["positive_cases"] or not summary["negative_cases"]:
        failures.append("The benchmark must contain both positive and negative cases.")
    if summary["exact_note_match_rate"] < min_exact:
        failures.append(f"Positive exact match is below {min_exact:.3f}.")
    if summary["false_positive_rate"] > max_false_positive:
        failures.append(f"Negative false-positive rate exceeds {max_false_positive:.3f}.")
    return failures


def build_report(*, min_exact: float = 0.85, max_false_positive: float = 0.0) -> dict:
    cases = all_retrieval_cases()
    docs = load_contrast_docs("en")
    ids = [case.case_id for case in cases]
    doc_ids = [doc.id for doc in docs]
    if len(set(ids)) != len(ids) or len(set(doc_ids)) != len(doc_ids):
        raise ValueError("Case IDs and corpus document IDs must be unique.")
    unknown = {case.expected_note_id for case in cases if case.expected_note_id} - set(doc_ids)
    if unknown:
        raise ValueError(f"Expected document IDs absent from corpus: {sorted(unknown)}")
    # Same questions and labels; remove the item ID, disabling both direct authoring links and ID-derived taxonomy.
    ablated = [replace(case, current_item={**case.current_item, "id": ""}) for case in cases]
    arms = {}
    for name, arm_cases in (("metadata", cases), ("metadata_without_item_id", ablated)):
        results = run_eval_cases(arm_cases)
        arms[name] = {
            "summary": summarize_results(results),
            "results": [asdict(result) for result in results],
        }
    failures = quality_failures(arms["metadata"]["summary"], min_exact, max_false_positive)
    from .eval_runner import run_freeform_eval_metadata, summarize_freeform_results
    from .eval_cases_freeform import all_freeform_cases
    challenge = run_freeform_eval_metadata(all_freeform_cases(challenge=True))
    return {
        "challenge_diagnostic": {
            "summary": summarize_freeform_results(challenge),
            "results": [asdict(r) for r in challenge],
            "gate": False,
            "note": "All-concept and realistic scope diagnostics; known failures remain visible, not relabeled to pass.",
        },
        "schema_version": 2,
        "status": "failed" if failures else "passed",
        "provenance": {
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "git_revision": git_revision(),
            "source_sha256": source_fingerprint(),
            "corpus_sha256": fingerprint([doc.model_dump() for doc in docs]),
            "cases_sha256": fingerprint([asdict(case) for case in cases]),
            "python_version": platform.python_version(),
            "corpus_size": len(docs),
            "min_retrieval_score": MIN_RETRIEVAL_SCORE,
        },
        "gate": {
            "arm": "metadata", "min_exact_match": min_exact,
            "max_false_positive": max_false_positive, "failures": failures,
        },
        "limitations": [
            "Author-written development cases; not an independent held-out benchmark.",
            "Removing item IDs removes both authoring matches and ID-derived taxonomy; it does not isolate either effect.",
            "No live vector search, generated-answer quality, user impact, or production latency measured.",
            "The ablation is diagnostic and does not determine the regression gate.",
        ],
        "arms": arms,
    }


def probability(value: str) -> float:
    number = float(value)
    if not 0 <= number <= 1:
        raise argparse.ArgumentTypeError("Expected a number between 0 and 1.")
    return number


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--min-exact-match", type=probability, default=0.85)
    parser.add_argument("--max-false-positive", type=probability, default=0.0)
    args = parser.parse_args(argv)
    report = build_report(min_exact=args.min_exact_match, max_false_positive=args.max_false_positive)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    for arm, data in report["arms"].items():
        summary = data["summary"]
        print(f"{arm}: exact={summary['exact_note_match_rate']:.3f}, "
              f"false_positive={summary['false_positive_rate']:.3f}, "
              f"n={summary['total_cases']}")
    print(f"Gate: {report['status']}; report: {args.output}")
    for failure in report["gate"]["failures"]:
        print(failure)
    return 1 if report["gate"]["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
