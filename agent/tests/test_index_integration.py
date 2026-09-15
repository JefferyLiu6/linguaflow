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
    admin = psycopg2.connect(URL); admin.autocommit = True
    with admin.cursor() as cur:
        cur.execute('CREATE EXTENSION IF NOT EXISTS vector')
        cur.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
    def connect():
        conn = psycopg2.connect(URL)
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
