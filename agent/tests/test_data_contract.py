from copy import deepcopy
from unittest.mock import patch
import pytest
from retrieval.validate_corpus import load_bundle, validate_bundle
from retrieval.retrieve import retrieve_contrast_note
from retrieval.sync_embeddings import sync_language


def test_current_bundle_is_valid_and_has_complete_dispositions():
    report = validate_bundle(load_bundle())
    assert report["errors"] == []
    assert sum(report["coverage"].values()) == report["counts"]["drills"]
    assert report["counts"]["positive_gold_notes"] == report["counts"]["notes"]


@pytest.mark.parametrize("defect", ["duplicate", "adaptation", "reference", "coverage", "fixture", "revision"])
def test_corruption_is_rejected(defect):
    bundle = deepcopy(load_bundle())
    if defect == "duplicate":
        bundle["notes"].append(deepcopy(bundle["notes"][0]))
    elif defect == "adaptation":
        example = next(e for n in bundle["notes"] for e in n["examples"] if e["origin"] == "drill_adaptation")
        example["text"] = "Different exercise"
    elif defect == "reference":
        bundle["notes"][0]["reference_ids"] = ["fabricated"]
    elif defect == "coverage":
        bundle["coverage"]["items"].pop()
    elif defect == "fixture":
        row = next(c for c in bundle["structured"] if c["provenance"] == "canonical_drill")
        row["current_item"]["expected_answer"] = "stale answer"
    elif defect == "revision":
        change = bundle["revisions"]["changes"][0]
        next(iter(change["fields"].values()))["after"] = "drift"
    assert validate_bundle(bundle)["status"] == "failed"


@pytest.mark.parametrize("instruction", ["Correct subject-verb agreement.", "Use the present perfect tense.", "Name this astronomical object."])
def test_broad_card_tags_do_not_establish_concept_coverage(instruction):
    result = retrieve_contrast_note(language="en", route="explain", current_item={
        "id": "eval_scope_probe", "category": "sentence", "topic": "daily",
        "type": "transformation", "instruction": instruction,
    })
    assert not result["hit"]


def test_invalid_corpus_stops_before_external_calls():
    with patch("retrieval.validate_corpus.validate_corpus", return_value={"errors": ["bad source"]}), \
         patch("retrieval.sync_embeddings.embed_texts") as embed:
        with pytest.raises(ValueError, match="bad source"):
            sync_language("en")
    embed.assert_not_called()

