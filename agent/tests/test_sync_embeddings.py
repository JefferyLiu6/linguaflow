from dataclasses import replace
from unittest.mock import patch
import pytest
from retrieval.loader import load_contrast_docs
from retrieval.manifest import manifest_for
from retrieval.sync_embeddings import sync_language
from retrieval.db import IndexUnavailable


def test_dry_run_is_offline():
    with patch('retrieval.sync_embeddings.read_manifest') as read, patch('retrieval.sync_embeddings.publish_corpus') as publish, patch('retrieval.sync_embeddings.embed_texts') as embed:
        assert sync_language('en', dry_run=True).skipped == 31
    read.assert_not_called(); publish.assert_not_called(); embed.assert_not_called()


def test_unchanged_snapshot_skips_provider_and_publication():
    m = manifest_for(load_contrast_docs('en'))
    with patch('retrieval.sync_embeddings.read_manifest', return_value={**m, 'generation': 'old', 'complete': True}), patch('retrieval.sync_embeddings.publish_corpus') as publish, patch('retrieval.sync_embeddings.embed_texts') as embed:
        assert sync_language('en').skipped == 31
    publish.assert_not_called(); embed.assert_not_called()


def test_rebuild_prepares_all_batches_before_single_publication():
    notes = load_contrast_docs('en'); m = manifest_for(notes)
    events = []
    def embed(texts):
        events.append('embed'); return [[0.1] * 1536 for _ in texts]
    def publish(notes, vectors, *, expected_generation):
        events.append('publish')
        assert len(vectors) == len(notes) == 31
        assert expected_generation == 'old'
        return {'updated': 31}
    with patch('retrieval.sync_embeddings.read_manifest', return_value={**m, 'generation': 'old', 'complete': True}), patch('retrieval.sync_embeddings.publish_corpus', side_effect=publish), patch('retrieval.sync_embeddings.embed_texts', side_effect=embed):
        assert sync_language('en', rebuild=True).updated == 31
    assert events == ['embed', 'embed', 'publish']


@pytest.mark.parametrize('vectors', [None, [], [[0.1]], [[float('nan')] * 1536], [[0.0] * 1536]])
def test_bad_batch_cannot_publish(vectors):
    with patch('retrieval.sync_embeddings.read_manifest', return_value=None), patch('retrieval.sync_embeddings.publish_corpus') as publish, patch('retrieval.sync_embeddings.embed_texts', return_value=vectors):
        assert sync_language('en', batch_size=1).failed == 31
    publish.assert_not_called()


def test_unavailable_database_fails_before_spending_on_embeddings():
    with patch('retrieval.sync_embeddings.read_manifest', side_effect=IndexUnavailable()), patch('retrieval.sync_embeddings.embed_texts') as embed:
        assert sync_language('en').failed == 31
    embed.assert_not_called()


def test_publish_failure_is_not_counted_as_partial_success():
    with patch('retrieval.sync_embeddings.read_manifest', return_value=None), patch('retrieval.sync_embeddings.publish_corpus', side_effect=IndexUnavailable('index_publication_conflict')), patch('retrieval.sync_embeddings.embed_texts', side_effect=lambda texts: [[0.1] * 1536 for _ in texts]):
        stats = sync_language('en')
    assert stats.failed == 31 and stats.updated == stats.inserted == 0
    assert stats.errors == ['index_publication_conflict']


def test_manifest_covers_metadata_prompt_and_configuration():
    notes = load_contrast_docs('en')
    original = manifest_for(notes)
    assert manifest_for(list(reversed(notes))) == original
    changed = [n.model_copy(deep=True) for n in notes]
    changed[0].avoid.append('New prompt caution')
    assert manifest_for(changed)['fingerprint'] != original['fingerprint']
    with patch('retrieval.manifest.EMBED_MODEL', 'different-model'):
        assert manifest_for(notes)['fingerprint'] != original['fingerprint']
    with pytest.raises(ValueError): manifest_for([])


def test_version_failure_is_visible_in_freeform_and_invalidates_eval():
    from retrieval.hybrid import retrieve_for_freeform_question
    from retrieval.eval_runner import evaluate_freeform_case
    from retrieval.eval_cases_freeform import all_freeform_cases
    with patch('retrieval.hybrid.embed_text', return_value=[0.1] * 1536), patch('retrieval.hybrid.query_by_vector', side_effect=IndexUnavailable('index_version_mismatch')):
        assert retrieve_for_freeform_question('why?')['reason'] == 'index_version_mismatch'
        with pytest.raises(RuntimeError): evaluate_freeform_case(all_freeform_cases()[0])
