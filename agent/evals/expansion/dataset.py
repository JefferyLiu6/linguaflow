"""Corpus-aware validation and overlap audit; never run retrieval on the fresh set."""
from collections import Counter
import json
from pathlib import Path
import re

from evals.rag.runner import ROOT, validate_dataset
from retrieval.benchmark import fingerprint
from retrieval.loader import load_contrast_docs

COUNTS = {'supported': 60, 'uncovered': 15, 'missing_context': 15, 'out_of_scope': 10}
ROUTES = dict(zip(COUNTS, ('answer', 'answer_with_disclosure', 'clarify', 'redirect')))
GROUPS = ('tense_aspect', 'questions_modals', 'nouns_determiners', 'pronouns_agreement',
          'adjectives_adverbs', 'prepositions_patterns', 'clauses_reporting', 'writing_usage')


def normalize(text):
    return ' '.join(re.findall(r'\w+', text.casefold()))


def validate(data):
    cases = data['cases']
    if data.get('split') != 'fresh_synthetic_expansion_test_v1' or data.get('corpus_revision') != '2026-11-16.200':
        raise ValueError('Wrong expansion dataset version')
    if len(cases) != 100 or len({c['case_id'] for c in cases}) != 100:
        raise ValueError('Expected 100 distinct cases')
    if Counter(c['bucket'] for c in cases) != COUNTS:
        raise ValueError('Expected 60/15/15/10 case distribution')
    for offset in range(0, 100, 20):
        validate_dataset({**data, 'cases': cases[offset:offset + 20]})
    docs = {note.id: note for note in load_contrast_docs('en')}
    if len(docs) != 200:
        raise ValueError('This protocol requires the 200-note corpus')
    questions = []
    for c in cases:
        if c['expected_behavior'] != ROUTES[c['bucket']] or bool(c['acceptable_note_ids']) != (c['bucket'] == 'supported'):
            raise ValueError('Route/source labels contradict bucket')
        if len(c['acceptable_note_ids']) != len(set(c['acceptable_note_ids'])):
            raise ValueError('Duplicate acceptable notes')
        for key in ('question', 'reference_answer', 'label_rationale', 'provenance', 'scenario_group', 'learner_level'):
            if not isinstance(c.get(key), str) or not c[key].strip() or len(c[key].encode()) > 2500:
                raise ValueError('Missing or oversized case text: ' + key)
        if not 1 <= len(c['required_facts']) <= 5 or any(not isinstance(f, str) or not f.strip() or len(f.encode()) > 1000 for f in c['required_facts']):
            raise ValueError('Invalid fact labels')
        if any(not isinstance(v, str) or len(v.encode()) > 2500 for v in c['current_item'].values()):
            raise ValueError('Invalid learner context')
        if any(not url.startswith('https://') for url in c['reference_urls']):
            raise ValueError('HTTPS label sources required')
        if c['bucket'] == 'supported' and c['coverage_group'] in GROUPS:
            if not any(c['coverage_group'] in docs[id].tags for id in c['acceptable_note_ids']):
                raise ValueError('Coverage group differs from target concept')
        questions.append(normalize(c['question']))
    if len(questions) != len(set(questions)):
        raise ValueError('Duplicate normalized questions')
    groups = Counter(c['coverage_group'] for c in cases if c['bucket'] == 'supported')
    if groups != {'original_curriculum': 12, **{g: 6 for g in GROUPS}}:
        raise ValueError('Supported cases must cover original curriculum and all eight added groups')
    return data


def audit(data, dataset_path):
    validate(data)
    history = []
    paths = sorted((ROOT / 'agent/evals/datasets').glob('*.json')) + sorted((ROOT / 'agent/knowledge/evaluation').glob('*.json'))
    hashes = {}
    for path in paths:
        if path.resolve() == Path(dataset_path).resolve():
            continue
        raw = json.loads(path.read_text())
        rows = raw if isinstance(raw, list) else raw.get('cases', [])
        history.extend((str(path.relative_to(ROOT)), row.get('case_id'), normalize(row['question'])) for row in rows if 'question' in row)
        hashes[str(path.relative_to(ROOT))] = fingerprint(raw)
    comparisons = []
    for index, case in enumerate(data['cases']):
        query = normalize(case['question'])
        prior = history + [('same_fresh_set', c['case_id'], normalize(c['question'])) for c in data['cases'][:index]]
        if any(query == text for _, _, text in prior):
            raise ValueError('Fresh question duplicates historical data: ' + case['case_id'])
        terms = set(query.split())
        scored = [(len(terms & set(text.split())) / len(terms | set(text.split())), file, id) for file, id, text in prior]
        overlap, file, id = max(scored, default=(0, None, None))
        comparisons.append({'case_id': case['case_id'], 'closest_file': file, 'closest_case_id': id,
                            'token_jaccard': round(overlap, 4), 'review_flag': overlap >= .70})
    return {'status': 'offline_labels_validated_not_provider_evaluated', 'counts': COUNTS,
            'supported_groups': dict(Counter(c['coverage_group'] for c in data['cases'] if c['bucket'] == 'supported')),
            'historical_files_sha256': hashes, 'overlap': comparisons,
            'limitations': ['Lexical overlap does not establish semantic independence.',
                            'Corpus-aware AI-authored labels; independent human review pending.',
                            'Known grammar families and 169 authored development questions were visible.']}
