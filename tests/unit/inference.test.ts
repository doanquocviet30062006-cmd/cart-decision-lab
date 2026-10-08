import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { artifacts, getModel, metadata } from '../../src/lib/data';
import { predict, toInput, validateInput } from '../../src/lib/inference';
import { treeLayout } from '../../src/lib/tree-layout';
import { gini } from '../../src/lib/gini';
import { Task } from '../../src/lib/types';
interface Case { sample: number; prediction: number; leaf: number; path: number[]; distribution: number[] | null }
interface Boundary extends Case { values: number[]; node: number }
interface FixtureTask { task: Task; X: number[][]; names: string[]; models: { model: string; cases: Case[]; boundaries: Boundary[] }[] }
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/python-parity.json', import.meta.url), 'utf8')) as { version: string; tasks: FixtureTask[] };

describe('Python ↔ TypeScript CART parity', () => {
  it('locks the artifact version and feature schema', () => {
    expect(fixtures.version).toBe(metadata.version);
    for (const f of fixtures.tasks) {
      const a = artifacts[f.task];
      expect(a.version).toBe(metadata.version);
      expect(a.schema.map(s => s.name)).toEqual(f.names);
      expect(a.schema).toHaveLength(a.features);
    }
  });
  for (const fixture of fixtures.tasks) {
    const a = artifacts[fixture.task];
    for (const model of fixture.models) {
      it(`${model.model}: all ${fixture.X.length} samples match prediction, leaf, path, distribution`, () => {
        const m = getModel(a, model.model);
        for (const c of model.cases) {
          const result = predict(a, m, toInput(a, fixture.X[c.sample]));
          expect(result.prediction).toBeCloseTo(c.prediction, 12);
          expect(result.leaf.id).toBe(c.leaf);
          expect(result.path).toEqual(c.path);
          if (c.distribution) c.distribution.forEach((p,i) => expect(result.distribution![i]).toBeCloseTo(p, 12));
          else expect(result.distribution).toBeNull();
        }
      });
      it(`${model.model}: ${model.boundaries.length} threshold boundary inputs match sklearn`, () => {
        const m = getModel(a, model.model);
        for (const c of model.boundaries) {
          const result = predict(a, m, toInput(a, c.values));
          expect(result.prediction).toBeCloseTo(c.prediction, 12);
          expect(result.leaf.id).toBe(c.leaf);
          expect(result.path).toEqual(c.path);
          if (c.distribution) c.distribution.forEach((p,i) => expect(result.distribution![i]).toBeCloseTo(p, 12));
        }
      });
      it(`${model.model}: highlights exactly the actual path edges`, () => {
        const m = getModel(a, model.model), c = model.cases[0];
        const layout = treeLayout(m, 1, new Set(), c.path);
        expect(layout.edges.filter(e => e.highlighted).map(e => [e.from,e.to]).sort()).toEqual(c.path.slice(0,-1).map((v,i) => [v,c.path[i+1]]).sort());
        const visible = new Set(layout.positions.map(p => p.node.id));
        c.path.forEach(id => expect(visible.has(id)).toBe(true));
      });
    }
  }
});

describe('strict input validation', () => {
  for (const task of ['classification','regression'] as Task[]) {
    const a = artifacts[task], m = getModel(a), input = toInput(a,a.demos[0].values), name = a.schema[0].name;
    it(`${task}: rejects missing, nonfinite, string, and out-of-domain values`, () => {
      const missing = {...input}; delete missing[name];
      expect(() => predict(a,m,missing)).toThrow('không được để trống');
      for (const bad of [NaN, Infinity, -Infinity, undefined, null, '', '12']) expect(() => predict(a,m,{...input,[name]:bad})).toThrow();
      for (const bad of [a.schema[0].min-1,a.schema[0].max+1]) expect(() => predict(a,m,{...input,[name]:bad})).toThrow('ngoài miền');
    });
    it(`${task}: validates names, length, and model ownership`, () => {
      expect(() => validateInput(a,{...input, invented: 0})).toThrow('Đặc trưng');
      expect(() => toInput(a,[])).toThrow('Số đặc trưng');
      expect(() => getModel(a,'invented')).toThrow('artifact');
      expect(() => predict(a,{...m,id:'invented'},input)).toThrow('version');
      expect(() => predict({...a,version:''},m,input)).toThrow('version');
    });
    it(`${task}: object key order does not change named-feature inference`, () => {
      expect(predict(a,m,Object.fromEntries(Object.entries(input).reverse()))).toEqual(predict(a,m,input));
    });
  }
});
describe('Gini educational interaction', () => {
  it('computes pure, balanced, mixed, and empty nodes', () => {
    expect(gini(100,0)).toBe(0); expect(gini(50,50)).toBe(.5);
    expect(gini(25,75)).toBe(.375); expect(gini(0,0)).toBeNull();
    expect(() => gini(-1,2)).toThrow(); expect(() => gini(1.5,2)).toThrow();
  });
});
