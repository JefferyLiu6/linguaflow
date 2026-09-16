import copy
import gzip
import json
import pytest
from retrieval import heldout_eval as h
from retrieval.benchmark import fingerprint
from retrieval.loader import load_contrast_docs


def test_data_validation_rejects_taxonomy_leakage_and_bad_gold():
    data=h.read(h.DATA);notes=load_contrast_docs('en')
    assert h.validate_dataset(data,notes)['cases']==93
    bad=copy.deepcopy(data);bad['cases'][0]['current_item']['id']='en03'
    with pytest.raises(ValueError,match='taxonomy'):h.validate_dataset(bad,notes)
    bad=copy.deepcopy(data);bad['cases'][0]['acceptable_note_ids']=['missing']
    with pytest.raises(ValueError,match='relevance'):h.validate_dataset(bad,notes)


def test_frozen_inputs_reject_drift(monkeypatch):
    data,notes,obj,audit=h.identity()
    monkeypatch.setattr(h,'read',lambda _: {'identity_sha256':'different'})
    monkeypatch.setattr(h,'identity',lambda:(data,notes,obj,audit))
    with pytest.raises(ValueError,match='changed'):h.checked()


def test_artifact_rejects_incomplete_and_wrong_identity(tmp_path):
    p=tmp_path/'v.gz';obj={'texts':{'k':'test'}};lock={}
    with gzip.open(p,'wt') as f:json.dump({'complete':False},f)
    with pytest.raises(ValueError,match='Incomplete'):h.load_artifact(p,obj,lock)
    with gzip.open(p,'wt') as f:json.dump({'complete':True,'origin':'openai_provider','identity_sha256':'wrong'},f)
    with pytest.raises(ValueError,match='incompatible'):h.load_artifact(p,obj,lock)


def test_metrics_do_not_count_negative_abstentions_as_source_precision():
    def row(pos,selected,gold,correct):return dict(positive=pos,selected_note_id=selected,primary_note_id=gold,correct=correct,gold_rank=1 if correct and pos else None)
    m=h.metrics([row(True,'a','a',True),row(True,'wrong','b',False),row(False,None,None,True),row(False,'a',None,False)])
    assert m['acceptable_source_accuracy']==.5 and m['false_positive_rate']==.5
    assert m['correct_among_selected']==pytest.approx(1/3)
    assert m['wrong_source_positive']==1 and m['missed_positive']==0


def test_paired_bootstrap_identical_arms_has_zero_interval():
    rows=[dict(positive=p,scenario_group=str(i),selected_note_id='a' if p else None,primary_note_id='a' if p else None,correct=True,gold_rank=1 if p else None) for i,p in enumerate([True,True,False,False])]
    assert h.paired_bootstrap(rows,rows)['cluster_bootstrap95']==[0,0]


def test_output_is_never_silently_overwritten(tmp_path):
    path=tmp_path/'report.json';h.write_new(path,{'first':True})
    with pytest.raises(FileExistsError):h.write_new(path,{'first':False})
    assert h.read(path)=={'first':True}
