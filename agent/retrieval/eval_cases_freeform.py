"""Freeform development and challenge sets. Neither is an independent held-out set."""
from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

@dataclass(frozen=True)
class FreeformEvalCase:
    case_id: str
    question: str
    current_item: dict[str, Any]
    expected_note_id: str | None
    description: str = ""
    bucket: str = "freeform"
    provenance: str = "original_synthetic"
    split: str = "development"


def all_freeform_cases(*, challenge: bool = False) -> list[FreeformEvalCase]:
    name = "challenge.json" if challenge else "freeform.json"
    path = Path(__file__).resolve().parents[1] / "knowledge/evaluation" / name
    return [FreeformEvalCase(**r) for r in json.loads(path.read_text())]
