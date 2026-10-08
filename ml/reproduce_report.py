"""Reproduce the supplied DOCX appendix alpha selection without editing its data."""
from train import dataset, estimator, evaluate, ROOT
from sklearn.model_selection import StratifiedKFold, KFold, cross_val_score
import numpy as np
import json

results={}
for task in ['classification','regression']:
    d,y,train,test=dataset(task)
    cv=(StratifiedKFold(5,shuffle=True,random_state=42) if task=='classification' else KFold(5,shuffle=True,random_state=42))
    path=estimator(task,0).cost_complexity_pruning_path(d.data[train],y[train])
    scored=[]
    for alpha in np.unique(path.ccp_alphas[:-1]):
        scoring='f1_macro' if task=='classification' else 'neg_root_mean_squared_error'
        score=cross_val_score(estimator(task,float(alpha)),d.data[train],y[train],cv=cv,scoring=scoring)
        scored.append({'alpha':float(alpha),'cv_mean':float(score.mean()) if task=='classification' else float(-score.mean())})
    best=(max(scored,key=lambda s:s['cv_mean']) if task=='classification' else min(scored,key=lambda s:s['cv_mean']))
    # Appendix A explicitly uses a fixed illustrative alpha, not CV max.
    used=.004396 if task=='classification' else best['alpha']
    model=estimator(task,used).fit(d.data[train],y[train])
    results[task]={'path_cv_best':best,'appendix_alpha':used,'depth':int(model.get_depth()),'leaves':int(model.get_n_leaves()),
        'metrics':evaluate(task,model,d.data[test],y[test]),'path_candidates':len(scored),'cv_scores':scored}
(ROOT/'evidence'/'original-report-reproduction.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
for task,result in results.items():
    print(task, {k:v for k,v in result.items() if k!='cv_scores'})
