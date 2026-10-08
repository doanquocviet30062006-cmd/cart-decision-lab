'use client';
import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, GitBranch } from 'lucide-react';
import { Artifact, Model } from '@/lib/types';
import { treeLayout } from '@/lib/tree-layout';
import { format, percent } from '@/lib/data';
import { Button } from './ui/button';
export function TreeView({ a, m, path = [], selected, onSelect }: { a: Artifact; m: Model; path?: number[]; selected?: number; onSelect?: (id: number) => void }) {
  const [depth, setDepth] = useState(2), [zoom, setZoom] = useState(1), [expanded, setExpanded] = useState(new Set<number>()), [internalId, setInternalId] = useState(0);
  const id = selected ?? internalId;
  const picked = m.nodes[id] || m.nodes[0];
  const layout = treeLayout(m, depth, expanded, path);
  const pos = new Map(layout.positions.map(n => [n.node.id, n]));
  function choose(id: number) { setInternalId(id); onSelect?.(id); }
  function expand(id: number) { choose(id); setExpanded(previous => new Set(previous).add(id)); }
  return <div className="tree-component">
    <div className="tree-toolbar"><span><GitBranch size={16} />{m.nodes.length} nodes · {m.leaves} lá</span><div><label className="tree-depth">Số tầng <select aria-label="Số tầng cây hiển thị" value={depth} onChange={e => { setDepth(Number(e.target.value)); setExpanded(new Set()); }}>{[1,2,3,4,5,6].map(d => <option key={d} value={d}>{d + 1}</option>)}</select></label><Button variant="ghost" size="icon" aria-label="Thu nhỏ cây" onClick={() => setZoom(z => Math.max(.5, z - .15))}><ZoomOut size={17} /></Button><Button variant="ghost" size="icon" aria-label="Phóng to cây" onClick={() => setZoom(z => Math.min(1.5, z + .15))}><ZoomIn size={17} /></Button><Button variant="ghost" size="icon" aria-label="Đặt lại cây" onClick={() => { setZoom(1); setDepth(2); setExpanded(new Set()); choose(0); }}><RotateCcw size={16} /></Button></div></div>
    <div className="tree-scroll" tabIndex={0} role="region" aria-label="Cây quyết định tương tác, cuộn để xem các nhánh">
      <svg className="tree-svg" width={layout.width * zoom} height={layout.height * zoom} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-label={`Cây ${a.task}`}>
        {layout.edges.map(edge => { const p = pos.get(edge.from)!, c = pos.get(edge.to)!; return <g key={`${edge.from}-${edge.to}`} data-path-edge={edge.highlighted ? 'true' : 'false'}><path d={`M${p.x} ${p.y + 84} C${p.x} ${p.y + 110} ${c.x} ${c.y - 25} ${c.x} ${c.y}`} stroke={edge.highlighted ? '#38bdf8' : 'var(--border)'} strokeWidth={edge.highlighted ? 3 : 1.5} fill="none" opacity={path.length && !edge.highlighted ? .4 : 1} /><text x={(p.x + c.x) / 2 + (edge.left ? -7 : 7)} y={p.y + 111} textAnchor="middle" fill={edge.highlighted ? 'var(--cyan-text)' : 'var(--muted)'} fontSize="11">{edge.left ? '≤ · trái' : '> · phải'}</text></g>; })}
        {layout.positions.map(({ node: n, x, y, collapsed }) => { const leaf = n.left === -1, active = path.includes(n.id), chosen = picked.id === n.id; const name = leaf ? (a.task === 'classification' ? (n.values[1] > n.values[0] ? 'malignant = 1' : 'benign = 0') : `ŷ = ${format(n.values[0], 3)}`) : a.schema[n.feature].name; return <g key={n.id} transform={`translate(${x - 94},${y})`} role="button" tabIndex={0} aria-label={`Node ${n.id}: ${name}${collapsed ? ', mở rộng nhánh' : ''}`} onClick={() => collapsed ? expand(n.id) : choose(n.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (collapsed) expand(n.id); else choose(n.id); } }} data-path-node={active ? 'true' : 'false'} className="tree-node" opacity={path.length && !active ? .5 : 1}>
          <rect width="188" height="84" rx="8" fill={active ? 'var(--elevated)' : 'var(--surface)'} stroke={chosen ? 'var(--teal)' : active ? '#38bdf8' : leaf ? '#818cf850' : 'var(--border)'} strokeWidth={chosen || active ? 2 : 1} />
          <text x="12" y="19" fontSize="10" fill={leaf ? 'var(--violet)' : 'var(--muted)'}>{n.id === 0 ? 'ROOT' : leaf ? 'LEAF' : 'SPLIT'} · #{n.id}</text>
          <text x="12" y="39" fontSize="12" fill="var(--text)" fontWeight="600">{name.length > 25 ? name.slice(0, 24) + '…' : name}</text>
          <text x="12" y="57" fontSize="11" fill="var(--muted)">{leaf ? `${n.samples} mẫu train` : `≤ ${format(n.threshold, 5)}`}</text>
          <text x="12" y="73" fontSize="10" fill={collapsed ? 'var(--cyan-text)' : 'var(--muted)'}>{collapsed ? '+ Chọn để mở rộng' : `n = ${n.samples} · impurity ${format(n.impurity, 3)}`}</text>
        </g>; })}
      </svg>
    </div>
    <div className="node-details"><label className="node-picker">Kiểm tra node <select aria-label="Chọn node để kiểm tra" value={picked.id} onChange={e => choose(Number(e.target.value))}>{m.nodes.map(n => <option key={n.id} value={n.id}>#{n.id} · {n.left === -1 ? 'Leaf' : a.schema[n.feature].name}</option>)}</select></label><dl><div><dt>Node ID</dt><dd>#{picked.id}</dd></div><div><dt>Impurity ({a.criterion})</dt><dd>{format(picked.impurity, 6)}</dd></div><div><dt>Mẫu train tại node</dt><dd>{picked.samples}</dd></div>{a.task === 'classification' ? <div><dt>Benign / malignant</dt><dd>{picked.values[0]} / {picked.values[1]} <small>({percent(picked.values[1] / picked.samples)} malignant)</small></dd></div> : <div><dt>Giá trị trung bình train</dt><dd>{format(picked.values[0], 6)}</dd></div>}</dl><p className="node-rule">{picked.left === -1 ? 'Node lá: trả về lớp chiếm đa số hoặc trung bình mục tiêu của các mẫu train tại lá.' : <><code>{a.schema[picked.feature].name} ≤ {picked.threshold.toPrecision(12)}</code> → #{picked.left}; nhánh còn lại → #{picked.right}.</>}</p></div>
    <p className="chart-note">Chọn node để xem thống kê. Nhánh ẩn mở rộng khi chọn. Đường đi của mẫu được tô cyan, kể cả các tầng sâu hơn mức hiển thị.</p>
  </div>;
}
