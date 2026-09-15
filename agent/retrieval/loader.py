from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from typing import Literal

from pydantic import BaseModel, Field


class ContrastExample(BaseModel):
    text: str
    source_item_id: str | None = None
    example_id: str = ""
    origin: Literal["original", "drill_adaptation"] = "original"


class Counterexample(BaseModel):
    text: str
    reason: str


class ContrastNote(BaseModel):
    id: str
    concept_id: str
    language: str
    kind: str
    tags: list[str] = Field(default_factory=list)
    title: str
    text: str
    when_to_use: str
    examples: list[ContrastExample] = Field(default_factory=list)
    authoring_item_ids: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)
    good_for_routes: list[str] = Field(default_factory=list)
    version: str = "1.0.0"
    selection_rationale: str = ""
    reference_ids: list[str] = Field(default_factory=list)
    reference_scope: str = ""
    review_status: str = ""
    human_review_status: str = "pending"
    counterexamples: list[Counterexample] = Field(default_factory=list)


KNOWLEDGE_ROOT = Path(__file__).resolve().parent.parent / "knowledge"


@lru_cache(maxsize=8)
def load_contrast_docs(language: str) -> list[ContrastNote]:
    path = KNOWLEDGE_ROOT / language / "contrasts.jsonl"
    if not path.exists():
        return []

    docs: list[ContrastNote] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            line = line.strip()
            if not line:
                continue
            try:
                docs.append(ContrastNote.model_validate(json.loads(line)))
            except (ValueError, TypeError) as exc:
                raise ValueError(f"{path}:{line_number}: {exc}") from exc
    ids = [doc.id for doc in docs]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{path}: duplicate document IDs")
    return docs
