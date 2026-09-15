import math
from dataclasses import replace
from unittest.mock import patch

import pytest
from retrieval.lexical import BM25Index, tokenize
from retrieval.lexical_benchmark import build_report, summarize, query_text
from retrieval.eval_cases_freeform import all_freeform_cases


def test_single_term_score_matches_hand_calculation():
    index = BM25Index([("a", "passive passive"), ("b", "active")])
    result = index.rank("passive")[0]
    expected = math.log(2) * (2 * 2.2) / (2 + 1.2 * (0.25 + 0.75 * 2 / 1.5))
    assert result.note_id == "a"
    assert result.score == pytest.approx(expected)
    assert result.matched_terms == ("passive",)


def test_query_repetition_no_overlap_and_empty_index():
    index = BM25Index([("a", "passive voice"), ("b", "active voice")])
    assert index.rank("passive") == index.rank("passive passive")
    assert index.rank("quantum") == []
    assert index.rank("the and") == []
    assert BM25Index([]).rank("passive") == []
    assert "not" in tokenize("It is not correct")


def test_deterministic_ties_and_invalid_parameters():
    assert [c.note_id for c in BM25Index([("z", "word"), ("a", "word")]).rank("word")] == ["a", "z"]
    with pytest.raises(ValueError):
        BM25Index([("a", "x"), ("a", "y")])
    with pytest.raises(ValueError):
        BM25Index([], k1=float("nan"))
    with pytest.raises(ValueError):
        BM25Index([]).rank("x", limit=0)


def test_query_never_uses_gold_label_or_item_id():
    case = all_freeform_cases()[0]
    changed = replace(case, expected_note_id="leaked_gold", current_item={**case.current_item, "id": "leaked_id"})
    for include in (False, True):
        assert query_text(case, include_card=include) == query_text(changed, include_card=include)
    assert query_text(case, include_card=False) == case.question


def test_metrics_separate_ranking_from_selection():
    rows = [
        {"expected_note_id": "a", "selected_note_id": "wrong", "gold_rank": 3},
        {"expected_note_id": "b", "selected_note_id": None, "gold_rank": None},
        {"expected_note_id": None, "selected_note_id": "wrong", "gold_rank": None},
    ]
    metrics = summarize(rows, ranking=True)
    assert metrics["positive_accuracy"] == 0
    assert metrics["recall_at_3"] == 0.5
    assert metrics["mrr_at_5"] == pytest.approx(1 / 6)
    assert metrics["false_positive_rate"] == 1
    assert summarize([], ranking=True)["positive_accuracy"] is None


def test_report_pairs_same_cases_and_keeps_bad_results_visible():
    report = build_report()
    assert report["quality_gate"] is False
    for arms in report["sets"].values():
        ids = [[r["case_id"] for r in arm["results"]] for arm in arms.values()]
        assert all(value == ids[0] for value in ids)
        for name in ("bm25_question", "bm25_question_card"):
            assert arms[name]["summary"] == summarize(arms[name]["results"], ranking=True)
    with patch("retrieval.lexical_benchmark.validate_corpus", return_value={"errors": ["corrupt"]}):
        with pytest.raises(ValueError, match="corrupt"):
            build_report()


def test_review_packet_keeps_labels_unresolved_and_preserves_predictions():
    from retrieval.lexical_benchmark import review_packet
    report = build_report()
    packet = review_packet(report)
    assert packet["cases"]
    assert all(row["review_status"] == "pending" and row["acceptable_note_ids"] is None for row in packet["cases"])
    assert packet["provenance"] == report["provenance"]
    for row in packet["cases"]:
        assert any(p["selected_note_id"] != row["existing_gold_note_id"] for p in row["predictions"].values())
