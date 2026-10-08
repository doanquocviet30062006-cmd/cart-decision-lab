'use client';
import { useState, FormEvent } from 'react';
import { FlaskConical, Route, CheckCircle2, CircleDot, GitBranch } from 'lucide-react';
import { artifacts, getModel, format, percent, warning } from '@/lib/data';
import { predict, toInput } from '@/lib/inference';
import { Artifact, Prediction, Task } from '@/lib/types';
import { PageHeader, Panel, ModelPicker, ModelDetails, Notice } from './common';
import { Button } from './ui/button';
import { TreeView } from './tree-view';
export function PredictionWorkspace({ explorer = false }: { explorer?: boolean }) {
  const [task, setTask] = useState<Task>('classification');
  return <>
    <PageHeader eyebrow={explorer ? 'EXPLAINABILITY / DECISION PATH' : 'INFERENCE / LIVE PREDICTION'} title={explorer ? 'Theo dấu một quyết định.' : 'Đưa dữ liệu qua cây CART.'} description={explorer ? 'Từ root đến leaf: quan sát dữ liệu được kiểm tra, nhánh được chọn và dự báo cuối cùng.' : 'Chọn mẫu nghiên cứu hoặc chỉnh sửa đầu vào. Mỗi dự báo được tính trực tiếp từ artifact đã huấn luyện.'} />
    <div className="task-toggle" role="group" aria-label="Chọn bài toán"><Button variant="ghost" className={task === 'classification' ? 'selected' : ''} aria-pressed={task === 'classification'} onClick={() => setTask('classification')}><GitBranch size={16} />Classification</Button><Button variant="ghost" className={task === 'regression' ? 'selected' : ''} aria-pressed={task === 'regression'} onClick={() => setTask('regression')}><Route size={16} />Regression</Button></div>
    <Workspace key={task} a={artifacts[task]} explorer={explorer} />
  </>;
}
function Workspace({ a, explorer }: { a: Artifact; explorer: boolean }) {
  const [id, setId] = useState(a.selected), [sampleId, setSampleId] = useState(String(a.demos[0].id));
  const [fields, setFields] = useState(a.demos[0].values.map(String));
  const [result, setResult] = useState<Prediction | null>(explorer ? predict(a, getModel(a), toInput(a, a.demos[0].values)) : null);
  const [error, setError] = useState(''), [selectedNode, setSelectedNode] = useState(0);
  const m = getModel(a, id);
  function clear() { setResult(null); setError(''); setSelectedNode(0); }
  function selectSample(value: string) {
    const demo = a.demos.find(d => String(d.id) === value)!;
    setSampleId(value); setFields(demo.values.map(String)); clear();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const input = Object.fromEntries(a.schema.map((f, i) => [f.name, fields[i].trim() === '' ? undefined : Number(fields[i])]));
      const prediction = predict(a, m, input);
      setResult(prediction); setError(''); setSelectedNode(prediction.leaf.id);
    } catch (e) { setResult(null); setError(e instanceof Error ? e.message : 'Dữ liệu không hợp lệ.'); }
  }
  const demo = a.demos.find(d => String(d.id) === sampleId)!;
  return <>
    <div className="toolbar prediction-toolbar"><ModelPicker a={a} id={id} onChange={value => { setId(value); clear(); }} all /><label className="picker"><span>Mẫu demo từ tập test</span><select value={sampleId} onChange={e => selectSample(e.target.value)}>{a.demos.map(d => <option value={d.id} key={d.id}>Mẫu #{d.id} · {a.task === 'classification' ? (d.actual === 1 ? 'malignant' : 'benign') : `target ${d.actual}`}</option>)}</select></label></div>
    <ModelDetails a={a} m={m} />
    <div className="prediction-grid"><Panel title="Dữ liệu đầu vào" subtitle={`${a.features} đặc trưng · ${a.dataset}`}><form onSubmit={submit} noValidate><div className="input-grid">{a.schema.slice(0,6).map((f,i) => <FeatureInput key={f.name} f={f} value={fields[i]} index={i} update={value => { setFields(previous => previous.map((v,j) => i === j ? value : v)); clear(); }} />)}</div><details className="all-features"><summary>Xem đủ {a.features} đặc trưng và phạm vi</summary><div className="input-grid">{a.schema.slice(6).map((f,j) => { const i = j+6; return <FeatureInput key={f.name} f={f} value={fields[i]} index={i} update={value => { setFields(previous => previous.map((v,k) => i === k ? value : v)); clear(); }} />; })}</div></details><p className="chart-note">Phạm vi là miền quan sát của dataset, không phải ngưỡng y tế. {a.task === 'regression' ? 'Nhập giá trị scaled như mẫu, không nhập tuổi/BMI theo đơn vị gốc.' : 'Dataset không công bố đơn vị cho mọi feature; giữ đúng thang đo gốc.'}</p>{error && <p className="input-error" role="alert">{error}</p>}<Button type="submit" className="predict-button">{explorer ? <Route size={17} /> : <FlaskConical size={17} />}{explorer ? 'Truy vết đường đi' : 'Predict · tính dự báo'}</Button></form></Panel>
      <Panel title="Kết quả mô hình" subtitle="Dự báo từ cây đã huấn luyện"><div aria-live="polite">{result ? <PredictionResult a={a} result={result} actual={demo.actual} /> : <div className="prediction-empty"><CircleDot size={38} /><h3>Sẵn sàng suy luận</h3><p>Kiểm tra đầu vào và nhấn {explorer ? 'Truy vết đường đi' : 'Predict'} để nhận kết quả của cấu hình hiện tại.</p></div>}</div></Panel></div>
    {result && <><Panel title="Cây & đường đi của mẫu" subtitle={`Root #0 → leaf #${result.leaf.id} · ${result.steps.length} điều kiện`}><TreeView key={`${m.id}-${result.path.join('-')}`} a={a} m={m} path={result.path} selected={selectedNode} onSelect={setSelectedNode} /></Panel><Panel title="Điều kiện IF–THEN" subtitle="Chọn một bước để xem node tương ứng trong cây"><div className="path-steps">{result.steps.map((step,i) => <button type="button" key={step.node} className={`path-step ${selectedNode === step.node ? 'step-selected' : ''}`} onClick={() => setSelectedNode(step.node)}><span className="path-index">{i+1}</span><div><span className="path-meta">{i === 0 ? 'ROOT' : 'NODE'} #{step.node} · {step.left ? 'Điều kiện ≤ đúng · nhánh trái' : 'Điều kiện ≤ sai · nhánh phải'}</span><strong>{step.feature} {step.left ? '≤' : '>'} {step.threshold.toPrecision(10)}</strong><p>Input: {step.value} · float32: {step.modelValue.toPrecision(10)} · node tiếp theo #{step.next}</p></div><CheckCircle2 size={19} /></button>)}<button type="button" className="path-step path-leaf" onClick={() => setSelectedNode(result.leaf.id)}><span className="path-index"><GitBranch size={15} /></span><div><span className="path-meta">LEAF #{result.leaf.id}</span><strong>THEN {a.task === 'classification' ? `lớp = ${result.prediction === 1 ? 'malignant (1)' : 'benign (0)'}` : `ŷ = ${format(result.prediction, 6)}`}</strong><p>{result.leaf.samples} mẫu huấn luyện tại lá · model {m.id}</p></div></button></div><p className="chart-note">Ngưỡng trong danh sách được rút gọn để đọc; phép so sánh dùng threshold đầy đủ trong JSON và input chuyển float32, giống scikit-learn.</p></Panel></>}
    <Notice>{warning} Tỷ lệ lớp tại lá là thống kê mẫu train, không phải xác suất lâm sàng đã được hiệu chuẩn.</Notice>
  </>;
}
function FeatureInput({ f, value, update, index }: { f: Artifact['schema'][number]; value: string; update: (value: string) => void; index: number }) { return <label className="feature-input"><span>{f.name}</span><input name={f.name} id={`feature-${index}`} type="number" step="any" min={f.min} max={f.max} value={value} onChange={e => update(e.target.value)} aria-describedby={`hint-${index}`} /><small id={`hint-${index}`}>{f.description} · [{format(f.min, 6)}; {format(f.max, 6)}]<br />{f.unit}</small></label>; }
function PredictionResult({ a, result, actual }: { a: Artifact; result: Prediction; actual: number }) {
  const cls = a.task === 'classification';
  return <div className="prediction-result" data-testid="prediction-result"><span className="badge cyan">SUY LUẬN TỪ ARTIFACT</span><span className="result-label">{cls ? 'Lớp được mô hình dự báo' : 'Giá trị được mô hình dự báo'}</span><strong className="result-value">{cls ? (result.prediction === 1 ? 'malignant' : 'benign') : format(result.prediction, 4)}<span>{cls ? `class ${result.prediction}` : 'Target · tiến triển sau một năm'}</span></strong>{result.distribution && <div className="distribution">{result.distribution.map((p,i) => <div key={i}><div><span>{i === 0 ? 'benign (0)' : 'malignant (1)'}</span><b>{percent(p)}</b></div><div className="bar-track"><div style={{ width: `${p * 100}%` }} /></div></div>)}<p className="chart-note">Phân bố mẫu train tại leaf, chưa hiệu chuẩn.</p></div>}<dl className="result-details"><div><dt>Leaf node</dt><dd>#{result.leaf.id}</dd></div><div><dt>Mẫu train tại leaf</dt><dd>{result.leaf.samples}</dd></div><div><dt>Impurity tại leaf</dt><dd>{format(result.leaf.impurity, 6)}</dd></div><div><dt>Nhãn / target mẫu demo gốc</dt><dd>{cls ? (actual === 1 ? 'malignant (1)' : 'benign (0)') : actual}</dd></div><div><dt>Model</dt><dd>{result.model}</dd></div></dl><p className="result-version">{result.version}</p><p className="chart-note">Nhãn mẫu demo gốc không thay đổi khi chỉnh input. Kết quả hỗ trợ tìm hiểu thuật toán; diễn giải và quyết định thuộc về con người.</p></div>;
}
