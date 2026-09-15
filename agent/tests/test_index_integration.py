"""Disposable real pgvector tests. Never use application DATABASE_URL implicitly."""
import os
from pathlib import Path
import uuid
import pytest

URL = os.getenv('RETRIEVAL_TEST_DATABASE_URL')
pytestmark = pytest.mark.skipif(not URL, reason='Disposable pgvector URL not configured')


@pytest.fixture
def database(monkeypatch):
    import psycopg2
    from psycopg2 import sql
    from retrieval import db
    schema = 'retrieval_test_' + uuid.uuid4().hex
    admin = psycopg2.connect(URL, connect_timeout=5, options="-c statement_timeout=10000 -c lock_timeout=5000"); admin.autocommit = True
    with admin.cursor() as cur:
        cur.execute('CREATE EXTENSION IF NOT EXISTS vector')
        cur.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
    def connect():
        conn = psycopg2.connect(URL, connect_timeout=5, options="-c statement_timeout=10000 -c lock_timeout=5000")
        with conn.cursor() as cur:
            cur.execute(sql.SQL('SET search_path TO {}, public').format(sql.Identifier(schema)))
        conn.commit()
        return conn
    monkeypatch.setattr(db, '_get_conn', connect)
    root = Path(__file__).resolve().parents[2]
    conn = connect()
    with conn.cursor() as cur:
        for name in ('20260425000001_add_retrieval_docs', '20260915000001_retrieval_publication_manifest'):
            cur.execute((root / 'prisma/migrations' / name / 'migration.sql').read_text())
    conn.commit(); conn.close()
    try:
        yield connect
    finally:
        with admin.cursor() as cur:
            cur.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))
        admin.close()


def vectors(notes):
    return [[1.0] + [0.0] * 1535 for _ in notes]


def test_publish_query_rollback_conflict_and_version_guard(database):
    from retrieval import db
    from retrieval.loader import load_contrast_docs
    notes = load_contrast_docs('en')
    with pytest.raises(db.IndexUnavailable, match='index_missing'):
        db.query_by_vector(vectors(notes)[0])
    outcome = db.publish_corpus(notes, vectors(notes), expected_generation=None)
    assert outcome['inserted'] == 31
    previous = db.read_manifest('en')
    assert len(db.query_by_vector(vectors(notes)[0], limit=5)) == 5
    # SQL failure after earlier rows have been modified must roll everything back.
    conn = database()
    with conn.cursor() as cur:
        cur.execute('''CREATE FUNCTION reject_note() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN IF NEW.title = 'FAIL_PUBLICATION' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$''')
        cur.execute('CREATE TRIGGER reject_note BEFORE UPDATE ON retrieval_doc FOR EACH ROW EXECUTE FUNCTION reject_note()')
    conn.commit(); conn.close()
    changed = [n.model_copy(deep=True) for n in notes]
    changed[0].title = 'earlier changed row'; changed[-1].title = 'FAIL_PUBLICATION'
    with pytest.raises(Exception, match='injected failure'):
        db.publish_corpus(changed, vectors(changed), expected_generation=previous['generation'])
    assert db.read_manifest('en') == previous
    conn = database()
    with conn.cursor() as cur:
        cur.execute('SELECT title FROM retrieval_doc WHERE id=%s', (notes[0].id,))
        assert cur.fetchone()[0] == notes[0].title
    conn.close()
    with pytest.raises(db.IndexUnavailable, match='index_publication_conflict'):
        db.publish_corpus(notes, vectors(notes), expected_generation='stale-generation')
    changed[-1].title = notes[-1].title
    db.publish_corpus(changed, vectors(changed), expected_generation=previous['generation'])
    with pytest.raises(db.IndexUnavailable, match='index_version_mismatch'):
        db.query_by_vector(vectors(notes)[0])


def test_reader_sees_old_snapshot_until_commit_and_missing_notes_deactivate(database, monkeypatch):
    from retrieval import db
    from retrieval.loader import load_contrast_docs
    notes = load_contrast_docs('en')
    db.publish_corpus(notes, vectors(notes), expected_generation=None)
    previous = db.read_manifest('en')
    changed = notes[:-1]
    class ObserveCommit:
        def __init__(self): self.conn = database()
        def __getattr__(self, name): return getattr(self.conn, name)
        def commit(self):
            reader = database()
            with reader.cursor() as cur:
                cur.execute('SELECT fingerprint FROM retrieval_index_manifest WHERE language=%s', ('en',))
                assert cur.fetchone()[0] == previous['fingerprint']
                cur.execute('SELECT count(*) FROM retrieval_doc WHERE active=true')
                assert cur.fetchone()[0] == 31
            reader.close()
            self.conn.commit()
    monkeypatch.setattr(db, '_get_conn', ObserveCommit)
    assert db.publish_corpus(changed, vectors(changed), expected_generation=previous['generation'])['deactivated'] == 1
    monkeypatch.setattr(db, '_get_conn', database)
    assert db.read_manifest('en')['note_count'] == 30


def test_vector_ranking_uses_stored_embeddings(database):
    from retrieval import db
    from retrieval.loader import load_contrast_docs
    notes = load_contrast_docs('en')
    distinct = []
    for index in range(len(notes)):
        vector = [0.0] * 1536
        vector[index] = 1.0
        distinct.append(vector)
    db.publish_corpus(notes, distinct, expected_generation=None)
    result = db.query_by_vector(distinct[7], limit=3)
    assert result[0]['id'] == notes[7].id
    assert result[0]['vector_score'] == pytest.approx(1.0)
    assert all(row['vector_score'] == pytest.approx(0.0) for row in result[1:])


def test_incomplete_index_is_rejected_then_repaired_by_sync(database, monkeypatch):
    from retrieval import db
    from retrieval.loader import load_contrast_docs
    from retrieval.sync_embeddings import sync_language
    notes = load_contrast_docs('en')
    db.publish_corpus(notes, vectors(notes), expected_generation=None)
    conn = database()
    with conn.cursor() as cur:
        cur.execute('UPDATE retrieval_doc SET embedding=NULL WHERE id=%s', (notes[0].id,))
    conn.commit(); conn.close()
    assert db.read_manifest('en')['complete'] is False
    with pytest.raises(db.IndexUnavailable, match='index_incomplete'):
        db.query_by_vector(vectors(notes)[0])
    batches = []
    def embed(texts):
        batches.append(len(texts))
        return vectors(texts)
    monkeypatch.setattr('retrieval.sync_embeddings.embed_texts', embed)
    repaired = sync_language('en')
    assert repaired.failed == 0 and repaired.updated == 31
    assert batches == [20, 11]
    assert db.read_manifest('en')['complete'] is True
    batches.clear()
    assert sync_language('en').skipped == 31
    assert batches == []
    assert sync_language('en', rebuild=True).updated == 31
    assert batches == [20, 11]


def test_simultaneous_publishers_have_exactly_one_winner(database):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from retrieval import db
    from retrieval.loader import load_contrast_docs
    from retrieval.manifest import manifest_for
    notes = load_contrast_docs('en')
    db.publish_corpus(notes, vectors(notes), expected_generation=None)
    previous = db.read_manifest('en')
    start = Barrier(2, timeout=10)
    def publish(suffix):
        changed = [note.model_copy(deep=True) for note in notes]
        changed[0].title += suffix
        start.wait()
        try:
            db.publish_corpus(changed, vectors(changed), expected_generation=previous['generation'])
            return manifest_for(changed)['fingerprint']
        except db.IndexUnavailable as exc:
            assert exc.reason == 'index_publication_conflict'
            return None
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(publish, suffix) for suffix in (' first', ' second')]
        results = [future.result(timeout=20) for future in futures]
    winners = [result for result in results if result is not None]
    assert len(winners) == 1
    assert db.read_manifest('en')['fingerprint'] == winners[0]
    assert db.read_manifest('en')['complete'] is True
    # Restore the prior corpus by deliberate republication; reads become compatible again.
    db.publish_corpus(notes, vectors(notes), expected_generation=db.read_manifest('en')['generation'])
    assert db.query_by_vector(vectors(notes)[0])


def test_local_operations_benchmark(database):
    """A controlled database experiment, never a claim about endpoint latency."""
    output = os.getenv('RETRIEVAL_OPERATIONS_OUTPUT')
    if not output:
        # Ordinary integration runs already exercise these guards above.
        return
    from collections import Counter
    from concurrent.futures import ThreadPoolExecutor
    from datetime import datetime, timezone
    import hashlib
    import json
    import platform
    import time
    from retrieval import db
    from retrieval.answer_study import percentile
    from retrieval.loader import load_contrast_docs
    from retrieval.manifest import manifest_for
    notes = load_contrast_docs('en')
    embeddings = [[float(i == j) for j in range(1536)] for i in range(len(notes))]
    results = []

    def query(index):
        start = time.perf_counter()
        expected_id = notes[index % len(notes)].id
        try:
            rows = db.query_by_vector(embeddings[index % len(notes)], limit=10)
            status = 'success' if rows[0]['id'] == expected_id else 'wrong_top_result'
        except db.IndexUnavailable as exc:
            status = exc.reason
        return {'request_index': index, 'elapsed_ms': (time.perf_counter()-start)*1000, 'status': status}

    def scenario(name, expected, concurrency):
        start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            samples = list(pool.map(query, range(100)))
        elapsed = time.perf_counter()-start
        counts = dict(Counter(row['status'] for row in samples))
        results.append({'scenario': name, 'concurrency': concurrency, 'requests': 100,
            'wall_seconds': elapsed, 'completed_requests_per_second': 100/elapsed,
            'p50_ms': percentile([s['elapsed_ms'] for s in samples], .50),
            'p95_ms': percentile([s['elapsed_ms'] for s in samples], .95),
            'status_counts': counts, 'expected_status': expected,
            'unexpected_results': sum(s['status'] != expected for s in samples), 'samples': samples})

    # No manifest: guard must never be counted as a successful abstention.
    for concurrency in (1, 5):
        scenario('missing_index', 'index_missing', concurrency)
    db.publish_corpus(notes, embeddings, expected_generation=None)
    first = query(0)
    for i in range(10):
        assert query(i)['status'] == 'success'
    for concurrency in (1, 5):
        scenario('warm_complete_index', 'success', concurrency)
    conn = database()
    with conn.cursor() as cur:
        cur.execute('UPDATE retrieval_doc SET embedding=NULL WHERE id=%s', (notes[0].id,))
    conn.commit(); conn.close()
    for concurrency in (1, 5):
        scenario('incomplete_index', 'index_incomplete', concurrency)
    root = Path(__file__).resolve().parents[2]
    sources = list((root/'agent/retrieval').glob('*.py')) + [Path(__file__), root/'scripts/check_retrieval_index.py']
    report = {'status': 'passed' if all(x['unexpected_results']==0 for x in results) and first['status']=='success' else 'failed',
        'created_at_utc': datetime.now(timezone.utc).isoformat(),
        'environment': {'python': platform.python_version(), 'platform': platform.platform()},
        'corpus_fingerprint': manifest_for(notes)['fingerprint'],
        'vector_fixture': '31 distinct orthogonal 1536-dimensional synthetic vectors; not provider embeddings',
        'first_query_after_publication': first, 'warmup_queries': 10, 'scenarios': results,
        'source_sha256': {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
        'limitations': ['Local disposable PostgreSQL only, no external API calls or application endpoint.',
            'Times include corpus loading, fingerprinting, fresh connection, fixture search_path setup, SQL and result conversion; exclude executor queue time.',
            'Concurrency is a bounded closed-loop worker pool, not an arrival-rate or saturation test.',
            'One first query after publication is not a cold process/database measurement.',
            'Synthetic vectors test ranking and guards, not semantic quality; corpus has only 31 notes.',
            'No provider outage, remote network, HTTP timeout, multi-instance or end-to-end generation load was measured.']}
    target = Path(output); target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2)+'\n')
    assert report['status'] == 'passed'
