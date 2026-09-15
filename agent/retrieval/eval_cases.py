"""Versioned development fixtures; canonical IDs are validated against shared drills."""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

@dataclass(frozen=True)
class RetrievalEvalCase:
    case_id: str
    language: str
    route: str
    current_item: dict[str, Any]
    expected_note_id: str | None
    expected_tags: tuple[str, ...] = field(default_factory=tuple)
    description: str = ""
    bucket: str = "uncategorized"
    provenance: str = "original_synthetic"
    split: str = "development"


def all_retrieval_cases() -> list[RetrievalEvalCase]:
    path = Path(__file__).resolve().parents[1] / "knowledge/evaluation/structured.json"
    rows = json.loads(path.read_text())
    return [RetrievalEvalCase(**{**r, "expected_tags": tuple(r.get("expected_tags", []))}) for r in rows]
