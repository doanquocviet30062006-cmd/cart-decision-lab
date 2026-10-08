import hashlib
import json
import sys
from pathlib import Path
import numpy as np
import pytest
from sklearn.metrics import confusion_matrix

sys.path.insert(0, str(Path(__file__).parent))
from train import ROOT, GRIDS, dataset, estimator, evaluate

def artifact(task):
    return json.loads((ROOT/'src'/'artifacts'/f'{task}.json').read_text(encoding='utf-8'))

@pytest.mark.parametrize('task,shape,counts', [('classification',(569,30),(455,114)),('regression',(442,10),(353,89))])
def test_dataset_and_split(task, shape, counts):
    d,y,train,test=dataset(task)
    a=artifact(task)
    assert d.data.shape == shape
    assert (len(train),len(test)) == counts
    assert set(train).isdisjoint(test)
    assert set(train)|set(test) == set(range(shape[0]))
    assert a['train_indices'] == train.tolist()
    assert a['test_indices'] == test.tolist()
    assert [f['name'] for f in a['schema']] == list(d.feature_names)
    if task == 'classification':
        assert np.all(y[d.target == 0] == 1)
        assert np.all(y[d.target == 1] == 0)
        assert np.bincount(y).tolist() == [357,212]
        assert np.bincount(y[test]).tolist() == [72,42]

@pytest.mark.parametrize('task',GRIDS)
def test_cv_has_no_test_leakage_and_selects_by_cv(task):
    a=artifact(task)
    assert len(a['cv_splits']) == 5
    validation=[]
    for fold in a['cv_splits']:
        train,val=set(fold['train']),set(fold['validation'])
        assert train.isdisjoint(val)
        assert (train|val)==set(a['train_indices'])
        assert (train|val).isdisjoint(a['test_indices'])
        validation += fold['validation']
    assert sorted(validation)==sorted(a['train_indices'])
    candidates=[m for m in a['models'] if m['selection_candidate']]
    best=(max(candidates,key=lambda m:(m['cv']['mean'],m['alpha'])) if task=='classification'
          else min(candidates,key=lambda m:(m['cv']['mean'],-m['alpha'])))
    assert best['id']==a['selected']
    assert [m['alpha'] for m in candidates]==GRIDS[task]

@pytest.mark.parametrize('task',GRIDS)
def test_pruning_and_schema(task):
    a=artifact(task)
    leaves=[m['leaves'] for m in a['models']]
    depths=[m['depth'] for m in a['models']]
    assert leaves==sorted(leaves,reverse=True)
    assert depths==sorted(depths,reverse=True)
    assert leaves[-1]==1
    for f in a['schema']:
        assert np.isfinite(f['min']) and np.isfinite(f['max']) and f['min']<f['max']
    if task=='classification':
        assert next(m for m in a['models'] if m['id']==a['report_model'])['alpha']==.004396

CONFIGS=[(task,i) for task in GRIDS for i in range(len(artifact(task)['models']))]
@pytest.mark.parametrize('task,index',CONFIGS)
def test_retrained_tree_metrics_leaf_values_and_paths(task,index):
    d,y,train,test=dataset(task)
    a=artifact(task); exported=a['models'][index]
    m=estimator(task,exported['alpha']).fit(d.data[train],y[train])
    assert m.get_depth()==exported['depth']
    assert m.get_n_leaves()==exported['leaves']
    assert m.tree_.node_count==len(exported['nodes'])
    metrics=evaluate(task,m,d.data[test],y[test])
    for key,value in metrics.items():
        assert exported['metrics'][key]==pytest.approx(value,abs=1e-12)
    assert exported['importance']==pytest.approx(m.feature_importances_.tolist())
    if task=='classification':
        assert exported['confusion']==confusion_matrix(y[test],m.predict(d.data[test]),labels=[0,1]).tolist()
        assert sum(map(sum,exported['confusion']))==len(test)
    membership=m.decision_path(d.data[train]).tocsc()
    for node in exported['nodes']:
        i=node['id']
        assert node['threshold']==m.tree_.threshold[i]
        members=membership.indices[membership.indptr[i]:membership.indptr[i+1]]
        assert len(members)==node['samples']
        if task=='regression':
            assert node['values'][0]==pytest.approx(np.mean(y[train][members]))
        else:
            assert node['values']==np.bincount(y[train][members],minlength=2).tolist()
        if node['left']!=-1:
            assert exported['nodes'][node['left']]['samples']+exported['nodes'][node['right']]['samples']==node['samples']

def test_version_and_checksum():
    meta=json.loads((ROOT/'src'/'artifacts'/'metadata.json').read_text(encoding='utf-8'))
    tasks={task:artifact(task) for task in GRIDS}
    for a in tasks.values():
        assert a.pop('version')==meta['version']
    canonical=json.dumps(tasks,sort_keys=True,ensure_ascii=False,allow_nan=False)
    assert hashlib.sha256(canonical.encode()).hexdigest()==meta['sha256']
    assert meta['version']=='cart-v1-'+meta['sha256'][:12]
