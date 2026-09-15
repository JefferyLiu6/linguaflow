"""Offline BM25 experiment. Not wired into application serving.

One canonical note per document; fixed k1=1.2, b=0.75. Scores are uncalibrated
ranking scores, not relevance probabilities. No fitting to evaluation labels.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

# Fixed function-word filter; preserve negation, content words and morphology.
STOPWORDS = frozenset("a an the and or of to in on at by for from with as is are was were be been being it its this that these those i you he she we they me my your our their how what why when where can could would should do does did have has had please".split())


def tokenize(text: str) -> list[str]:
    return [word for word in re.findall(r"[^\W_]+", text.casefold(), flags=re.UNICODE) if word not in STOPWORDS]


@dataclass(frozen=True)
class Candidate:
    note_id: str
    score: float
    matched_terms: tuple[str, ...]


class BM25Index:
    def __init__(self, documents: list[tuple[str, str]], *, k1: float = 1.2, b: float = 0.75):
        if not math.isfinite(k1) or k1 <= 0 or not math.isfinite(b) or not 0 <= b <= 1:
            raise ValueError("Invalid BM25 parameters")
        ids = [id for id, _ in documents]
        if len(ids) != len(set(ids)) or any(not id.strip() for id in ids):
            raise ValueError("Document IDs must be nonblank and unique")
        self.k1, self.b = k1, b
        self.documents = [(id, Counter(tokenize(text))) for id, text in documents]
        self.average_length = sum(sum(counts.values()) for _, counts in self.documents) / len(documents) if documents else 0
        frequency: Counter[str] = Counter()
        for _, counts in self.documents:
            frequency.update(counts.keys())
        self.idf = {term: math.log(1 + (len(documents) - count + 0.5) / (count + 0.5)) for term, count in frequency.items()}

    def rank(self, query: str, *, limit: int = 5) -> list[Candidate]:
        if limit < 1:
            raise ValueError("limit must be positive")
        terms = set(tokenize(query))  # Query repetition does not multiply evidence.
        candidates = []
        for id, counts in self.documents:
            matched = sorted(terms & counts.keys())
            if not matched or not self.average_length:
                continue
            normalization = self.k1 * (1 - self.b + self.b * sum(counts.values()) / self.average_length)
            score = sum(self.idf[t] * counts[t] * (self.k1 + 1) / (counts[t] + normalization) for t in matched)
            candidates.append(Candidate(id, score, tuple(matched)))
        return sorted(candidates, key=lambda c: (-c.score, c.note_id))[:limit]
