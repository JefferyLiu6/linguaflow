from copy import deepcopy
import hashlib

import pytest

from retrieval.expansion_benchmark import evaluate, metrics
from retrieval.validate_corpus import ROOT, load_bundle, validate_bundle


def test_expansion_preserves_original_notes_and_covers_every_new_concept():
    raw = (ROOT / 'agent/knowledge/en/contrasts.jsonl').read_bytes()
    original = b''.join(raw.splitlines(keepends=True)[:31])
    assert hashlib.sha256(original).hexdigest() == '9544bc6c0b356dca009f253433c15430da2f2f3dfde10a1608b283e4f916b884'
    bundle = load_bundle()
    assert len(bundle['notes']) == 200
    additions = bundle['notes'][31:]
    assert len({note['concept_id'] for note in bundle['notes']}) == 200
    assert len({note['text'] for note in additions}) == 169
    assert len(bundle['expansion']) == 169
    assert {case['expected_note_id'] for case in bundle['expansion']} == {note['id'] for note in additions}
    for note in additions:
        assert note['authoring_item_ids'] == []
        assert len({example['text'] for example in note['examples']}) == 3
    assert validate_bundle(bundle)['errors'] == []


@pytest.mark.parametrize('defect,expected', [
    ('count', 'declared note count'), ('blank', 'blank expansion question'),
    ('duplicate', 'duplicate questions'), ('split', 'remain development'),
    ('target', 'unknown gold note'),
])
def test_invalid_expansion_cannot_produce_a_diagnostic(defect, expected):
    bundle = deepcopy(load_bundle())
    row = bundle['expansion'][0]
    if defect == 'count': bundle['dataset']['note_count'] = 199
    if defect == 'blank': row['question'] = ' '
    if defect == 'duplicate': row['question'] = bundle['expansion'][1]['question']
    if defect == 'split': row['split'] = 'challenge'
    if defect == 'target': row['expected_note_id'] = 'missing'
    with pytest.raises(ValueError, match=expected): evaluate(bundle)


def test_metrics_count_misses_and_empty_sets_without_inventing_success():
    result = metrics([{'target_rank': 1}, {'target_rank': 3}, {'target_rank': None}])
    assert result['hit_at_1'] == pytest.approx(1 / 3)
    assert result['hit_at_3'] == result['hit_at_5'] == pytest.approx(2 / 3)
    assert result['mrr_at_5'] == pytest.approx(4 / 9)
    assert metrics([])['hit_at_1'] is None


def test_diagnostic_never_uses_gold_or_bucket_as_retrieval_input(monkeypatch):
    from retrieval import expansion_benchmark as benchmark
    seen = []
    def rank(self, query, *, limit):
        seen.append(query)
        return []
    monkeypatch.setattr(benchmark.BM25Index, 'rank', rank)
    bundle = load_bundle()
    report = evaluate(bundle)
    assert seen == [case['question'] for case in bundle['expansion']]
    assert report['summary']['hit_at_5'] == 0
    assert report['quality_gate'] is False
    assert report['status'] == 'development_diagnostic_only'
