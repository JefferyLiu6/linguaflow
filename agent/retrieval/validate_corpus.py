"""Offline validation of the shared drill, reference, coverage and evaluation bundle.

Checks structural consistency, not linguistic correctness or source endorsement.
No network requests, embeddings, database writes, or LLM calls.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

from .loader import ContrastNote
from .embeddings import format_chunk_text

ROOT = Path(__file__).resolve().parents[2]
BUNDLE_FILES = {
    "drills": "data/english-drills.json",
    "revisions": "data/english-drill-revisions.json",
    "references": "agent/knowledge/references.json",
    "coverage": "agent/knowledge/en/coverage.json",
    "dataset": "agent/knowledge/dataset.json",
    "structured": "agent/knowledge/evaluation/structured.json",
    "freeform": "agent/knowledge/evaluation/freeform.json",
    "challenge": "agent/knowledge/evaluation/challenge.json",
}


def load_bundle(root: Path = ROOT) -> dict[str, Any]:
    data = {key: json.loads((root / path).read_text()) for key, path in BUNDLE_FILES.items()}
    path = root / "agent/knowledge/en/contrasts.jsonl"
    data["notes"] = []
    for number, line in enumerate(path.read_text().splitlines(), 1):
        if line.strip():
            try:
                data["notes"].append(json.loads(line))
            except ValueError as exc:
                raise ValueError(f"{path}:{number}: invalid JSON") from exc
    return data


def canonical_example(drill: dict) -> str:
    import re
    prompt = drill["prompt"]
    answer = re.sub(r"\[[^]]+\]", lambda _: drill["answer"], prompt) if "[" in prompt else drill["answer"]
    return prompt + " -> " + answer


def validate_bundle(data: dict[str, Any]) -> dict:
    errors: list[str] = []
    def require(condition, message):
        if not condition:
            errors.append(message)
    def index(rows, field, label):
        ids = [row.get(field) for row in rows]
        require(all(isinstance(i, str) and i.strip() for i in ids), f"{label}: blank/malformed IDs")
        require(len(ids) == len(set(ids)), f"{label}: duplicate IDs")
        return {row.get(field): row for row in rows}

    drills = index(data["drills"], "id", "drills")
    notes = index(data["notes"], "id", "notes")
    sources = index(data["references"]["sources"], "id", "references")
    coverage = index(data["coverage"]["items"], "item_id", "coverage")
    require(set(coverage) == set(drills), "coverage: every drill must have exactly one disposition")
    require(len(notes) > 0, "notes: corpus must not be empty")
    require(data["dataset"].get("version") == "2.0.0", "dataset: unsupported version")
    allowed_topics = {"travel", "daily", "food", "sport", "tech", "work", "health", "money", "family", "nature", "education", "culture", "politics", "science", "shopping", "emergency"}
    allowed_groups = {"DB_EN", "DB_EN_VOCAB", "DB_EN_PHRASES", "DB_EN_SPORT", "DB_EN_TECH", "DB_EN_FOOD", "DB_EN_WORK", "DB_EN_HEALTH", "DB_EN_MONEY", "DB_EN_FAMILY", "DB_EN_NATURE", "DB_EN_EDUCATION", "DB_EN_CULTURE", "DB_EN_POLITICS", "DB_EN_SCIENCE", "DB_EN_SHOPPING", "DB_EN_EMERGENCY"}
    for id, drill in drills.items():
        require(drill.get("group") in allowed_groups, f"{id}: unknown app partition group")
        for field in ("instruction", "prompt", "answer", "group", "promptLang"):
            require(isinstance(drill.get(field), str) and bool(drill[field].strip()), f"{id}: empty {field}")
        require(drill.get("type") in {"translation", "substitution", "transformation"}, f"{id}: invalid type")
        require(drill.get("category") in {"vocab", "phrase", "sentence"}, f"{id}: invalid category")
        require(drill.get("topic") in allowed_topics, f"{id}: invalid topic")
        require(all(isinstance(v, str) and v.strip() for v in drill.get("variants", [])), f"{id}: blank variant")
        require(len(drill.get("variants", [])) == len(set(drill.get("variants", []))), f"{id}: duplicate variants")
    for id, source in sources.items():
        require(str(source.get("url", "")).startswith("https://"), f"{id}: HTTPS reference required")
        for field in ("publisher", "title", "supports", "limits", "checked_on", "verification", "use"):
            require(bool(source.get(field)), f"{id}: missing source {field}")
    revisions = index(data["revisions"]["changes"], "item_id", "revisions")
    for id, revision in revisions.items():
        require(id in drills, f"{id}: revision refers to unknown drill")
        require(bool(revision.get("reason")), f"{id}: revision rationale required")
        require(set(revision.get("reference_ids", [])) <= set(sources), f"{id}: unknown revision reference")
        for field, change in revision.get("fields", {}).items():
            require(drills.get(id, {}).get(field) == change.get("after"), f"{id}: revision after-value differs from canonical {field}")
    example_ids: list[str] = []
    byte_sizes = []
    for id, raw in notes.items():
        try:
            note = ContrastNote.model_validate(raw)
        except (ValueError, TypeError) as exc:
            errors.append(f"{id}: schema error: {exc}")
            continue
        require(not(set(raw) - set(ContrastNote.model_fields)), f"{id}: unknown note fields")
        require(note.version == "2.0.0", f"{id}: unsupported note version")
        require(note.language == "en" and note.kind == "contrast_note", f"{id}: invalid language/kind")
        require(set(note.good_for_routes) == {"explain", "clarify"}, f"{id}: invalid routes")
        for field in ("id", "concept_id", "title", "text", "when_to_use", "selection_rationale", "reference_scope"):
            require(bool(getattr(note, field).strip()), f"{id}: blank {field}")
        require(note.review_status == "ai_assisted_source_checked", f"{id}: unexpected review status")
        require(note.human_review_status in {"pending", "reviewed"}, f"{id}: invalid human review status")
        require(len(note.tags) == len(set(note.tags)) and all(t and t == t.strip() for t in note.tags), f"{id}: duplicate/untrimmed tags")
        require(bool(note.reference_ids) and set(note.reference_ids) <= set(sources), f"{id}: missing/unknown reference")
        require(len(note.authoring_item_ids) == len(set(note.authoring_item_ids)), f"{id}: duplicate authoring IDs")
        require(set(note.authoring_item_ids) <= set(drills), f"{id}: unknown authoring item")
        for item in note.authoring_item_ids:
            require(id in coverage.get(item, {}).get("note_ids", []), f"{id}: authoring link absent from coverage")
        require(sum(e.origin == "original" for e in note.examples) >= 3, f"{id}: at least three original examples required")
        require(bool(note.counterexamples) and all(c.text.strip() and c.reason.strip() for c in note.counterexamples), f"{id}: counterexample required")
        for example in note.examples:
            example_ids.append(example.example_id)
            require(bool(example.example_id.strip()) and bool(example.text.strip()), f"{id}: blank example identity/text")
            if example.origin == "original":
                require(example.source_item_id is None, f"{id}: original example must not borrow a drill ID")
            else:
                drill = drills.get(example.source_item_id)
                require(drill is not None, f"{id}: adaptation needs a real drill")
                if drill:
                    require(example.text == canonical_example(drill), f"{id}: adaptation differs from canonical drill {example.source_item_id}")
        # Conservative upper bound for byte-based tokenization; avoids tokenizer downloads in CI.
        size = len(format_chunk_text(note).encode("utf-8"))
        byte_sizes.append(size)
        require(size <= 8000, f"{id}: chunk exceeds conservative 8000-byte budget")
    require(len(example_ids) == len(set(example_ids)), "examples: duplicate IDs")
    for id, row in coverage.items():
        require(row.get("status") in {"direct", "generic", "unsupported"}, f"{id}: invalid coverage status")
        require(bool(row.get("reason")), f"{id}: coverage rationale required")
        require(set(row.get("note_ids", [])) <= set(notes), f"{id}: unknown coverage note")
        require(bool(row.get("note_ids")) == (row.get("status") != "unsupported"), f"{id}: coverage state contradicts note list")
        if row.get("status") == "direct":
            require(all(id in notes[n].get("authoring_item_ids", []) for n in row["note_ids"]), f"{id}: direct coverage lacks authoring link")
    cases = data["structured"] + data["freeform"] + data["challenge"]
    index(cases, "case_id", "evaluation")
    positive_notes = set()
    for row in cases:
        cid = row["case_id"]
        target = row.get("expected_note_id")
        require(target is None or target in notes, f"{cid}: unknown gold note")
        if target:
            positive_notes.add(target)
        require(row.get("split") in {"development", "challenge"}, f"{cid}: unsupported split claim")
        item = row["current_item"]
        if row.get("provenance") == "canonical_drill":
            drill = drills.get(item.get("id"))
            require(drill is not None, f"{cid}: unknown canonical drill")
            if drill:
                require(all(item.get(k) == drill[k] for k in ("type", "category", "topic", "instruction", "prompt", "answer")), f"{cid}: fixture differs from canonical drill")
                require(item.get("expected_answer") == drill["answer"], f"{cid}: stale expected_answer")
        else:
            require(row.get("provenance") == "original_synthetic", f"{cid}: unknown provenance")
            require(str(item.get("id", "")).startswith("eval_") and item.get("id") not in drills, f"{cid}: synthetic ID collides with real drill namespace")
    require(positive_notes == set(notes), "evaluation: each note needs positive gold coverage")
    digest = hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
    return {
        "schema_version": 1, "dataset_version": data["dataset"].get("version"),
        "status": "failed" if errors else "passed", "bundle_sha256": digest,
        "counts": {"drills": len(drills), "notes": len(notes), "examples": len(example_ids), "references": len(sources), "evaluation_cases": len(cases), "positive_gold_notes": len(positive_notes)},
        "coverage": dict(Counter(r["status"] for r in coverage.values())),
        "chunk_utf8_bytes": {"min": min(byte_sizes, default=0), "max": max(byte_sizes, default=0)},
        "errors": errors,
        "limitations": ["Structural validation does not establish linguistic correctness.", "AI-assisted editorial/source review; independent human review pending.", "Evaluation is development/challenge data, not held-out evidence.", "Coverage is a reviewed diagnostic mapping, not enforced runtime routing."],
    }


def validate_corpus(root: Path = ROOT) -> dict:
    return validate_bundle(load_bundle(root))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        report = validate_corpus()
    except (ValueError, TypeError, KeyError, OSError) as exc:
        report = {"status": "failed", "errors": [str(exc)]}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
