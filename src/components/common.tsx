import { ReactNode } from 'react';
import { Info, Check } from 'lucide-react';
import { Artifact, Model } from '@/lib/types';
import { format, modelLabel } from '@/lib/data';
export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>;
}
export function Panel({ title, subtitle, children, action, className = '' }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
export function Metric({ title, value, detail, icon, accent = 'cyan' }: { title: string; value: string; detail: string; icon?: ReactNode; accent?: string }) {
  return <div className={`metric-card accent-${accent}`}><div className="metric-top"><span>{title}</span>{icon}</div><strong>{value}</strong><p>{detail}</p></div>;
}
export function Notice({ children }: { children: ReactNode }) { return <div className="notice"><Info size={18} /><div>{children}</div></div>; }
export function ModelPicker({ a, id, onChange, all = false }: { a: Artifact; id: string; onChange: (id: string) => void; all?: boolean }) {
  const models = all ? a.models : a.models.filter(m => [a.baseline, a.selected, a.report_model].includes(m.id));
  return <label className="picker"><span>Mô hình đã huấn luyện</span><select value={id} onChange={e => onChange(e.target.value)}>{models.map(m => <option key={m.id} value={m.id}>{modelLabel(a, m)}</option>)}</select></label>;
}
export function ModelDetails({ a, m }: { a: Artifact; m: Model }) { return <div className="model-details"><span><Check size={14} />{a.criterion}</span><span>α = <b>{m.alpha}</b></span><span>Độ sâu <b>{m.depth}</b></span><span><b>{m.leaves}</b> lá</span><span>Train / test <b>{a.train_count} / {a.test_count}</b></span><span>Seed <b>42</b></span></div>; }
export function Importance({ a, m }: { a: Artifact; m: Model }) {
  const rows = a.schema.map((f, i) => ({ name: f.name, value: m.importance[i] })).sort((a, b) => b.value - a.value).slice(0, 8);
  return <div className="importance-list">{rows.map(r => <div key={r.name} className="importance-row"><div><span>{r.name}</span><b>{format(r.value * 100, 1)}%</b></div><div className="bar-track"><div style={{ width: `${r.value * 100}%` }} /></div></div>)}<p className="chart-note">Mean decrease in impurity trên train. Có thể thiên lệch theo đặc trưng; không biểu thị quan hệ nhân quả.</p></div>;
}
