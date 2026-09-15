"""Regression evidence must distinguish retrieval errors from unavailable services."""
import json
from dataclasses import replace
from unittest.mock import patch

import pytest

from retrieval.benchmark import build_report, fingerprint, main, quality_failures
from retrieval.eval_cases import all_retrieval_cases
from retrieval.eval_cases_freeform import all_freeform_cases
from retrieval.eval_runner import evaluate_freeform_case, main as eval_main


def test_ablation_removes_ids_without_mutating_cases():
    cases = all_retrieval_cases()
    original = [dict(case.current_item) for case in cases]
    from retrieval.eval_runner import run_eval_cases
    with patch("retrieval.benchmark.all_retrieval_cases", return_value=cases), \
         patch("retrieval.benchmark.run_eval_cases", wraps=run_eval_cases) as run:
        report = build_report()
    assert [case.current_item for case in cases] == original
    assert all(not case.current_item["id"] for case in run.call_args_list[1].args[0])
    assert report["status"] == "passed"
    assert len(report["arms"]["metadata"]["results"]) == len(cases)


def test_fingerprint_is_order_stable_and_content_sensitive():
    assert fingerprint({"a": 1, "b": 2}) == fingerprint({"b": 2, "a": 1})
    assert fingerprint({"a": 1}) != fingerprint({"a": 2})


def test_report_fingerprints_are_reproducible():
    first, second = build_report(), build_report()
    for key in ("source_sha256", "corpus_sha256", "cases_sha256"):
        assert first["provenance"][key] == second["provenance"][key]


def test_gate_rejects_empty_dataset_and_regressions():
    summary = {"positive_cases": 0, "negative_cases": 0,
               "exact_note_match_rate": 0, "false_positive_rate": 0}
    assert quality_failures(summary, 0.85, 0)
    summary.update(positive_cases=5, negative_cases=5, exact_note_match_rate=0.8,
                   false_positive_rate=0.2)
    assert len(quality_failures(summary, 0.85, 0)) == 2


def test_unknown_labels_and_duplicate_cases_are_rejected():
    case = all_retrieval_cases()[0]
    for cases in ([case, case], [replace(case, expected_note_id="missing")]):
        with patch("retrieval.benchmark.all_retrieval_cases", return_value=cases):
            with pytest.raises(ValueError):
                build_report()


def test_cli_writes_failure_artifact_and_returns_nonzero(tmp_path):
    cases = all_retrieval_cases()
    wrong_label = "en_single_precise_verb"
    cases = [replace(c, expected_note_id=wrong_label) if c.expected_note_id else c for c in cases]
    path = tmp_path / "report.json"
    with patch("retrieval.benchmark.all_retrieval_cases", return_value=cases):
        assert main(["--output", str(path)]) == 1
    assert json.loads(path.read_text())["status"] == "failed"



@pytest.mark.parametrize("reason", ["embeddings_unavailable", "db_unavailable"])
def test_live_evaluation_rejects_infrastructure_misses_even_for_negative_cases(reason):
    case = next(c for c in all_freeform_cases() if c.expected_note_id is None)
    with patch("retrieval.hybrid.retrieve_for_freeform_question", return_value={"reason": reason}):
        with pytest.raises(RuntimeError, match="Infrastructure fallback"):
            evaluate_freeform_case(case)


def test_live_evaluation_allows_genuine_abstention():
    case = next(c for c in all_freeform_cases() if c.expected_note_id is None)
    debug = {"reason": "freeform_below_threshold", "note": None, "hit": False,
             "latency_ms": 1, "retrieval_mode": "metadata_only", "vector_score": None}
    with patch("retrieval.hybrid.retrieve_for_freeform_question", return_value=debug):
        assert evaluate_freeform_case(case).exact_note_match


def test_legacy_live_cli_returns_nonzero_when_services_fail():
    with patch("sys.argv", ["eval_runner", "--arm", "freeform"]), \
         patch("retrieval.eval_runner.run_freeform_eval", side_effect=RuntimeError("unavailable")):
        assert eval_main() == 2
