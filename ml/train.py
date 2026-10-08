"""Reproducible CART experiments. No test data participates in model selection."""
from pathlib import Path
import hashlib
import json
import platform
import numpy as np
import sklearn
from sklearn.datasets import load_breast_cancer, load_diabetes
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold, cross_val_score
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report, mean_absolute_error,
    mean_squared_error, r2_score, roc_curve)

ROOT = Path(__file__).resolve().parents[1]
GRIDS = {
    'classification': [0, .001, .002, .004396, .006, .01, .02, .04, .08, .15, .3, .5],
    'regression': [0, 5, 10, 20, 40, 80, 160, 320, 640, 1000, 1600, 3200, 6400],
}
DIABETES_DESCRIPTIONS = ['Tuổi', 'Giới tính được mã hóa', 'Chỉ số khối cơ thể',
    'Huyết áp trung bình', 'Total serum cholesterol', 'Low-density lipoproteins',
    'High-density lipoproteins', 'Total cholesterol / HDL',
    'Log serum triglycerides', 'Blood sugar']

def dataset(task):
    d = load_breast_cancer() if task == 'classification' else load_diabetes()
    # sklearn source: malignant=0, benign=1. Explicitly remap to requested convention.
    y = 1 - d.target if task == 'classification' else d.target
    indices = np.arange(len(y))
    train, test = train_test_split(indices, test_size=.2, random_state=42,
        stratify=y if task == 'classification' else None)
    return d, y, train, test

def estimator(task, alpha):
    if task == 'classification':
        return DecisionTreeClassifier(criterion='gini', random_state=42, ccp_alpha=alpha)
    return DecisionTreeRegressor(criterion='squared_error', random_state=42, ccp_alpha=alpha)

def evaluate(task, model, X, y):
    p = model.predict(X)
    if task == 'classification':
        prob = model.predict_proba(X)[:, 1]
        return dict(accuracy=accuracy_score(y, p), precision=precision_score(y, p, zero_division=0),
            recall=recall_score(y, p, zero_division=0), f1=f1_score(y, p, zero_division=0),
            macro_f1=f1_score(y, p, average='macro', zero_division=0),
            weighted_f1=f1_score(y, p, average='weighted', zero_division=0),
            roc_auc=roc_auc_score(y, prob))
    mse = mean_squared_error(y, p)
    return dict(mae=mean_absolute_error(y, p), mse=mse, rmse=float(np.sqrt(mse)), r2=r2_score(y, p))

def export_tree(task, model, X_train, y_train):
    t = model.tree_
    nodes = []
    membership = model.decision_path(X_train).tocsc()
    for i in range(t.node_count):
        members = membership.indices[membership.indptr[i]:membership.indptr[i+1]]
        labels = y_train[members]
        values = (np.bincount(labels.astype(int), minlength=2).astype(float).tolist()
            if task == 'classification' else [float(t.value[i, 0, 0])])
        nodes.append(dict(id=i, left=int(t.children_left[i]), right=int(t.children_right[i]),
            feature=int(t.feature[i]), threshold=float(t.threshold[i]),
            impurity=float(t.impurity[i]), samples=int(t.n_node_samples[i]), values=values))
    return nodes

def build_task(task):
    d, y, train, test = dataset(task)
    X, names = d.data, list(d.feature_names)
    cv = (StratifiedKFold(5, shuffle=True, random_state=42) if task == 'classification'
        else KFold(5, shuffle=True, random_state=42))
    # Fixed grids are declared above, before loading test outcomes.
    scoring = 'f1_macro' if task == 'classification' else 'neg_root_mean_squared_error'
    scored = []
    for alpha in GRIDS[task]:
        scores = cross_val_score(estimator(task, alpha), X[train], y[train], cv=cv, scoring=scoring)
        if task == 'regression':
            scores = -scores
        scored.append(dict(alpha=alpha, candidate=True, mean=float(scores.mean()), std=float(scores.std()),
            folds=scores.tolist()))
    best = (max(scored, key=lambda s: (s['mean'], s['alpha'])) if task == 'classification'
        else min(scored, key=lambda s: (s['mean'], -s['alpha'])))
    # The supplied DOCX uses a different candidate set for regression.
    # Reproduce that training-only protocol and retain its selected model as a reference.
    reference_alpha = .004396 if task == 'classification' else None
    if task == 'regression':
        path = estimator(task, 0).cost_complexity_pruning_path(X[train], y[train])
        ref_scores = []
        for alpha in np.unique(path.ccp_alphas[:-1]):
            folds = -cross_val_score(estimator(task, float(alpha)), X[train], y[train], cv=cv, scoring=scoring)
            ref_scores.append(dict(alpha=float(alpha), candidate=False, mean=float(folds.mean()),
                std=float(folds.std()), folds=folds.tolist()))
        ref_best = min(ref_scores, key=lambda s: s['mean'])
        reference_alpha = ref_best['alpha']
        if reference_alpha not in GRIDS[task]:
            scored.append(ref_best)
            scored.sort(key=lambda s: s['alpha'])
    # Selection is LOCKED here. Test evaluation begins below.
    models, fixtures = [], []
    for n, entry in enumerate(scored):
        m = estimator(task, entry['alpha']).fit(X[train], y[train])
        mid = f'{task}-{n:02d}'
        exported = dict(id=mid, alpha=entry['alpha'], selection_candidate=entry['candidate'], cv=entry,
            depth=int(m.get_depth()), leaves=int(m.get_n_leaves()), nodes=export_tree(task, m, X[train], y[train]),
            importance=m.feature_importances_.tolist(), metrics=evaluate(task, m, X[test], y[test]),
            train_metrics=evaluate(task, m, X[train], y[train]))
        predictions = m.predict(X[test])
        exported['evaluation'] = [dict(sample=int(idx), actual=float(actual), predicted=float(pred),
            residual=float(actual-pred)) for idx, actual, pred in zip(test, y[test], predictions)]
        if task == 'classification':
            exported['confusion'] = confusion_matrix(y[test], predictions, labels=[0, 1]).tolist()
            exported['report'] = classification_report(y[test], predictions, labels=[0, 1],
                target_names=['benign', 'malignant'], output_dict=True, zero_division=0)
            fpr, tpr, _ = roc_curve(y[test], m.predict_proba(X[test])[:, 1])
            exported['roc'] = [dict(fpr=float(a), tpr=float(b)) for a, b in zip(fpr, tpr)]
        models.append(exported)
        paths = m.decision_path(X)
        leaves = m.apply(X)
        preds = m.predict(X)
        probs = m.predict_proba(X) if task == 'classification' else None
        boundaries = []
        membership = m.decision_path(X[train]).tocsc()
        for node in exported['nodes']:
            if node['left'] == -1:
                continue
            nid, fi = node['id'], node['feature']
            local = membership.indices[membership.indptr[nid]]
            ref = X[train[local]].copy()
            threshold32 = np.float32(node['threshold'])
            for v in [node['threshold'], float(np.nextafter(threshold32, np.float32(-np.inf))),
                      float(np.nextafter(threshold32, np.float32(np.inf)))]:
                ref[fi] = v
                bp = m.decision_path(ref.reshape(1, -1)).indices.tolist()
                boundaries.append(dict(values=ref.tolist(), node=nid, prediction=float(m.predict([ref])[0]),
                    leaf=int(m.apply([ref])[0]), path=bp,
                    distribution=m.predict_proba([ref])[0].tolist() if task == 'classification' else None))
        fixtures.append(dict(model=mid, boundaries=boundaries, cases=[dict(sample=int(i), prediction=float(preds[i]),
            leaf=int(leaves[i]), path=paths.indices[paths.indptr[i]:paths.indptr[i+1]].tolist(),
            distribution=probs[i].tolist() if probs is not None else None) for i in range(len(y))]))
    schema = [dict(name=str(name), min=float(X[:, i].min()), max=float(X[:, i].max()),
        unit='Đơn vị gốc của dataset' if task == 'classification' else 'scaled · không thứ nguyên',
        description=(str(name).replace('mean', 'Trung bình').replace('worst', 'Giá trị lớn nhất').replace('error', 'Sai số chuẩn')
            if task == 'classification' else DIABETES_DESCRIPTIONS[i])) for i, name in enumerate(names)]
    selected = next(m['id'] for m in models if m['alpha'] == best['alpha'])
    report = next((m['id'] for m in models if m['alpha'] == reference_alpha), None)
    pruning = estimator(task, 0).cost_complexity_pruning_path(X[train], y[train])
    split_cv = [dict(train=train[a].tolist(), validation=train[b].tolist())
        for a, b in cv.split(X[train], y[train])]
    demos = [dict(id=int(idx), values=X[idx].tolist(), actual=float(y[idx]), split='test') for idx in test[:12]]
    result = dict(task=task, dataset='Breast Cancer Wisconsin Diagnostic' if task == 'classification' else 'Diabetes (scikit-learn)',
        total=len(y), features=len(names), train_count=len(train), test_count=len(test), schema=schema,
        classes=['benign', 'malignant'] if task == 'classification' else None,
        label_mapping={'benign': 0, 'malignant': 1} if task == 'classification' else None,
        train_indices=train.tolist(), test_indices=test.tolist(), cv_splits=split_cv,
        seed=42, stratified=task == 'classification', criterion='gini' if task == 'classification' else 'squared_error',
        cv_metric='Macro F1' if task == 'classification' else 'RMSE', selected=selected, baseline=models[0]['id'],
        report_model=report, models=models, demos=demos,
        pruning_path=dict(alphas=pruning.ccp_alphas.tolist(), impurities=pruning.impurities.tolist()),
        data_hash=hashlib.sha256(X.tobytes()+y.tobytes()).hexdigest())
    return result, dict(task=task, names=names, X=X.tolist(), y=y.tolist(), models=fixtures)

def main():
    out = ROOT / 'src' / 'artifacts'
    out.mkdir(parents=True, exist_ok=True)
    fixture_dir = ROOT / 'tests' / 'fixtures'
    fixture_dir.mkdir(parents=True, exist_ok=True)
    tasks, fixtures = {}, []
    for task in GRIDS:
        tasks[task], fixture = build_task(task)
        fixtures.append(fixture)
    canonical = json.dumps(tasks, sort_keys=True, ensure_ascii=False, allow_nan=False)
    digest = hashlib.sha256(canonical.encode()).hexdigest()
    version = f'cart-v1-{digest[:12]}'
    meta = dict(version=version, sha256=digest, sklearn=sklearn.__version__, numpy=np.__version__,
        python=platform.python_version(), split='80/20', random_state=42, cv_folds=5,
        selection='Fixed alpha grids; training-only CV; Macro F1 max / RMSE min; ties prefer larger alpha',
        inference_dtype='float32', report_original='Supplied DOCX; appendix A/B independently reproduced', trained_configuration_only=True)
    for task, data in tasks.items():
        data['version'] = version
        (out / f'{task}.json').write_text(json.dumps(data, ensure_ascii=False, allow_nan=False), encoding='utf-8')
    (out / 'metadata.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    (fixture_dir / 'python-parity.json').write_text(json.dumps(dict(version=version, tasks=fixtures), allow_nan=False), encoding='utf-8')
    summary = dict(metadata=meta, experiments={k:[dict(id=m['id'], alpha=m['alpha'], depth=m['depth'],
        leaves=m['leaves'], cv=m['cv'], test=m['metrics']) for m in v['models']] for k, v in tasks.items()})
    evidence = ROOT / 'evidence'
    evidence.mkdir(exist_ok=True)
    (evidence / 'experiments.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    for task, data in tasks.items():
        print(task, 'selected=', data['selected'])
        for model in data['models']:
            if model['id'] in {data['baseline'], data['selected'], data['report_model']}:
                print(model['id'], 'alpha=', model['alpha'], 'depth=', model['depth'], 'leaves=', model['leaves'], model['metrics'])
    print('VERSION', version)

if __name__ == '__main__':
    main()
