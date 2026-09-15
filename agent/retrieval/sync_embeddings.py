"""Validate, prepare vectors, then atomically publish one complete language corpus."""
from __future__ import annotations
import argparse
from dataclasses import dataclass, field
from .db import read_manifest, publish_corpus
from .embeddings import embed_texts, format_chunk_text
from .loader import load_contrast_docs
from .manifest import manifest_for, valid_vector


@dataclass
class SyncStats:
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    deactivated: int = 0
    errors: list[str] = field(default_factory=list)

    def summary(self):
        return "  ".join(f"{key} {getattr(self, key)}" for key in ("inserted", "updated", "skipped", "failed", "deactivated"))


def sync_language(language, *, rebuild=False, dry_run=False, batch_size=20):
    if batch_size < 1:
        raise ValueError("batch_size must be positive")
    from .validate_corpus import validate_corpus
    validation = validate_corpus()
    if validation["errors"]:
        raise ValueError("Corpus validation failed: " + "; ".join(validation["errors"]))
    load_contrast_docs.cache_clear()
    notes = load_contrast_docs(language)
    manifest = manifest_for(notes)  # Empty corpora require a deliberate separate retirement procedure.
    if dry_run:
        print(f"[sync] offline plan: {len(notes)} notes, fingerprint={manifest['fingerprint']}; DB state not inspected")
        return SyncStats(skipped=len(notes))
    try:
        previous = read_manifest(language)
        if not rebuild and previous and previous["complete"] and previous["fingerprint"] == manifest["fingerprint"] and previous["note_count"] == len(notes):
            return SyncStats(skipped=len(notes))
        vectors = []
        for start in range(0, len(notes), batch_size):
            batch = notes[start:start + batch_size]
            result = embed_texts([format_chunk_text(n) for n in batch])
            if result is None or len(result) != len(batch) or not all(valid_vector(v) for v in result):
                raise ValueError("embedding batch failed validation; no publication performed")
            vectors.extend(result)
        # Detect source edits made while the provider was running.
        load_contrast_docs.cache_clear()
        if manifest_for(load_contrast_docs(language)) != manifest:
            raise ValueError("Corpus changed during preparation; retry from a stable checkout")
        outcome = publish_corpus(notes, vectors, expected_generation=previous["generation"] if previous else None)
        return SyncStats(**outcome)
    except Exception as exc:
        return SyncStats(failed=len(notes), errors=[str(exc)])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", default="en")
    parser.add_argument("--rebuild", action="store_true", help="Re-embed and atomically replace even an unchanged corpus")
    parser.add_argument("--dry-run", action="store_true", help="Validate offline; no DB or provider calls")
    args = parser.parse_args(argv)
    try:
        stats = sync_language(args.language, rebuild=args.rebuild, dry_run=args.dry_run)
    except (ValueError, OSError) as exc:
        print(f"[sync] invalid input: {exc}")
        return 1
    print(stats.summary())
    for error in stats.errors:
        print(error)
    return 1 if stats.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
