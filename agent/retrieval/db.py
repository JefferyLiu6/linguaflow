"""Atomic retrieval publication and version-checked reads.

Only publish_corpus writes documents. No provider calls occur in its transaction.
Reads fail explicitly so evaluation can distinguish stale indexes from abstention.
"""
from __future__ import annotations
import hashlib
import json
import logging
import os
import uuid
from .manifest import manifest_for, valid_vector
from .embeddings import format_chunk_text

log = logging.getLogger("retrieval.db")


class IndexUnavailable(RuntimeError):
    def __init__(self, reason="db_unavailable"):
        self.reason = reason
        super().__init__(reason)


def _get_conn():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise IndexUnavailable()
    try:
        import psycopg2
        return psycopg2.connect(url, connect_timeout=5, options="-c statement_timeout=10000 -c lock_timeout=5000")
    except Exception as exc:
        raise IndexUnavailable() from exc


def chunk_hash(text):
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def read_manifest(language):
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute('''SELECT fingerprint, generation, "noteCount",
                (SELECT count(*) FROM retrieval_doc d WHERE d.language=m.language AND d.kind='contrast_note' AND active=true),
                (SELECT count(*) FROM retrieval_doc d WHERE d.language=m.language AND d.kind='contrast_note' AND active=true AND "indexVersion"=m.fingerprint AND embedding IS NOT NULL)
                FROM retrieval_index_manifest m WHERE language = %s''', (language,))
            row = cur.fetchone()
        return {"fingerprint": row[0], "generation": row[1], "note_count": row[2], "complete": row[2] == row[3] == row[4]} if row else None
    except Exception as exc:
        raise IndexUnavailable() from exc
    finally:
        conn.close()


def publish_corpus(notes, embeddings, *, expected_generation):
    manifest = manifest_for(notes)
    if len(embeddings) != len(notes) or not all(valid_vector(v) for v in embeddings):
        raise ValueError("Invalid publication vectors")
    language = manifest["language"]
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            # Also serializes first publication, before any manifest row exists.
            cur.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", ("linguaflow-retrieval:" + language,))
            cur.execute('SELECT generation FROM retrieval_index_manifest WHERE language = %s', (language,))
            previous = cur.fetchone()
            if (previous[0] if previous else None) != expected_generation:
                raise IndexUnavailable("index_publication_conflict")
            cur.execute('SELECT id FROM retrieval_doc WHERE language = %s AND kind = %s AND active = true', (language, "contrast_note"))
            old_ids = {row[0] for row in cur.fetchall()}
            ids = {note.id for note in notes}
            for note, embedding in zip(notes, embeddings):
                text = format_chunk_text(note)
                cur.execute('''INSERT INTO retrieval_doc
                    (id, "conceptId", language, kind, title, "chunkText", tags, "authoringItemIds", active, embedding, "chunkHash", "indexVersion", "updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,true,%s::vector,%s,%s,NOW())
                    ON CONFLICT (id) DO UPDATE SET "conceptId"=EXCLUDED."conceptId", language=EXCLUDED.language,
                    kind=EXCLUDED.kind, title=EXCLUDED.title, "chunkText"=EXCLUDED."chunkText", tags=EXCLUDED.tags,
                    "authoringItemIds"=EXCLUDED."authoringItemIds", active=true, embedding=EXCLUDED.embedding,
                    "chunkHash"=EXCLUDED."chunkHash", "indexVersion"=EXCLUDED."indexVersion", "updatedAt"=NOW()
                    WHERE retrieval_doc.language = EXCLUDED.language AND retrieval_doc.kind = EXCLUDED.kind''',
                    (note.id, note.concept_id, language, note.kind, note.title, text, json.dumps(note.tags),
                     json.dumps(note.authoring_item_ids), str(embedding), chunk_hash(text), manifest["fingerprint"]))
                if cur.rowcount != 1:
                    raise ValueError("Document ID collides with another language/kind")
            cur.execute('UPDATE retrieval_doc SET active=false, "updatedAt"=NOW() WHERE language=%s AND kind=%s AND active=true AND id <> ALL(%s)', (language, "contrast_note", sorted(ids)))
            deactivated = cur.rowcount
            cur.execute('SELECT count(*) FROM retrieval_doc WHERE language=%s AND kind=%s AND active=true AND "indexVersion"=%s AND embedding IS NOT NULL', (language, "contrast_note", manifest["fingerprint"]))
            if cur.fetchone()[0] != len(notes):
                raise ValueError("Incomplete publication")
            cur.execute('''INSERT INTO retrieval_index_manifest (language, fingerprint, generation, "noteCount", config, "publishedAt")
                VALUES (%s,%s,%s,%s,%s::jsonb,NOW()) ON CONFLICT (language) DO UPDATE SET
                fingerprint=EXCLUDED.fingerprint, generation=EXCLUDED.generation, "noteCount"=EXCLUDED."noteCount",
                config=EXCLUDED.config, "publishedAt"=EXCLUDED."publishedAt"''',
                (language, manifest["fingerprint"], str(uuid.uuid4()), len(notes), json.dumps(manifest["config"])))
        conn.commit()
        return {"inserted": len(ids - old_ids), "updated": len(ids & old_ids), "deactivated": deactivated}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query_by_vector(embedding, *, language="en", kind="contrast_note", limit=10):
    from .loader import load_contrast_docs
    if not valid_vector(embedding) or limit < 1 or kind != "contrast_note":
        raise IndexUnavailable("index_query_invalid")
    expected = manifest_for(load_contrast_docs(language))
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            # Manifest, completeness and candidate reads share one MVCC statement snapshot.
            cur.execute('''WITH state AS (
                SELECT m.*,
                  (SELECT count(*) FROM retrieval_doc d WHERE d.language=m.language AND d.kind=%s AND d.active=true) AS active_count,
                  (SELECT count(*) FROM retrieval_doc d WHERE d.language=m.language AND d.kind=%s AND d.active=true AND d."indexVersion"=m.fingerprint AND d.embedding IS NOT NULL) AS valid_count
                FROM retrieval_index_manifest m WHERE m.language=%s
            )
            SELECT s.fingerprint, s."noteCount", s.active_count, s.valid_count,
                   d.id, d."conceptId", d.title, d.tags, d."authoringItemIds", d.vector_score
            FROM state s LEFT JOIN LATERAL (
                SELECT id, "conceptId", title, tags, "authoringItemIds", 1-(embedding <=> %s::vector) AS vector_score
                FROM retrieval_doc WHERE language=%s AND kind=%s AND active=true AND "indexVersion"=s.fingerprint
                AND embedding IS NOT NULL AND s.fingerprint=%s AND s.active_count=s."noteCount" AND s.valid_count=s."noteCount"
                ORDER BY embedding <=> %s::vector, id LIMIT %s
            ) d ON true''',
                (kind, kind, language, str(embedding), language, kind, expected["fingerprint"], str(embedding), limit))
            rows = cur.fetchall()
        if not rows:
            raise IndexUnavailable("index_missing")
        fingerprint, count, active, valid = rows[0][:4]
        if fingerprint != expected["fingerprint"] or count != expected["note_count"]:
            raise IndexUnavailable("index_version_mismatch")
        if active != count or valid != count or rows[0][4] is None:
            raise IndexUnavailable("index_incomplete")
        return [{"id": row[4], "concept_id": row[5], "title": row[6], "tags": row[7], "authoring_item_ids": row[8], "vector_score": float(row[9])} for row in rows]
    except IndexUnavailable:
        raise
    except Exception as exc:
        raise IndexUnavailable() from exc
    finally:
        conn.close()
