from unittest.mock import MagicMock, patch
import pytest
from retrieval import db
from retrieval.loader import load_contrast_docs
from retrieval.manifest import manifest_for


def connection():
    conn = MagicMock()
    cur = conn.cursor.return_value.__enter__.return_value
    cur.rowcount = 1
    return conn, cur


def test_publisher_commits_once_and_closes_after_complete_write():
    notes = load_contrast_docs('en')[:2]
    conn, cur = connection()
    cur.fetchone.side_effect = [None, (2,)]
    cur.fetchall.return_value = []
    with patch('retrieval.db._get_conn', return_value=conn):
        assert db.publish_corpus(notes, [[0.1] * 1536] * 2, expected_generation=None)['inserted'] == 2
    conn.commit.assert_called_once(); conn.rollback.assert_not_called(); conn.close.assert_called_once()


def test_late_publication_failure_rolls_back_and_never_commits():
    notes = load_contrast_docs('en')[:2]
    conn, cur = connection()
    cur.fetchone.side_effect = [None, (2,)]
    cur.fetchall.return_value = []
    def execute(sql, *args):
        if sql.startswith('INSERT INTO retrieval_index_manifest'):
            raise RuntimeError('manifest write failed')
    cur.execute.side_effect = execute
    with patch('retrieval.db._get_conn', return_value=conn):
        with pytest.raises(RuntimeError, match='manifest write failed'):
            db.publish_corpus(notes, [[0.1] * 1536] * 2, expected_generation=None)
    conn.rollback.assert_called_once(); conn.commit.assert_not_called(); conn.close.assert_called_once()


@pytest.mark.parametrize('defect,reason', [('missing','index_missing'), ('stale','index_version_mismatch'), ('partial','index_incomplete')])
def test_reader_rejects_unusable_indexes(defect, reason):
    notes = load_contrast_docs('en'); m = manifest_for(notes)
    conn, cur = connection()
    row = [m['fingerprint'],31,31,31,notes[0].id,notes[0].concept_id,notes[0].title,[],[],1.0]
    if defect == 'stale': row[0] = 'old'
    if defect == 'partial': row[3] = 30
    cur.fetchall.return_value = [] if defect == 'missing' else [row]
    with patch('retrieval.db._get_conn', return_value=conn):
        with pytest.raises(db.IndexUnavailable, match=reason): db.query_by_vector([0.1] * 1536)
    conn.close.assert_called_once()


def test_embedding_response_indices_preserve_text_vector_alignment(monkeypatch):
    from types import SimpleNamespace
    from retrieval.embeddings import embed_texts
    monkeypatch.setenv('OPENAI_API_KEY', 'unit-test-placeholder')
    response = SimpleNamespace(data=[SimpleNamespace(index=1,embedding=[2.0]),SimpleNamespace(index=0,embedding=[1.0])])
    with patch('openai.OpenAI') as client:
        client.return_value.embeddings.create.return_value = response
        assert embed_texts(['first','second']) == [[1.0],[2.0]]
        response.data[0].index = 0
        assert embed_texts(['first','second']) is None
