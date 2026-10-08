import type { Artifact, Model, Prediction, PathStep } from './types';
export class InputError extends Error {}
export function validateInput(a: Artifact, input: Record<string, unknown>): number[] {
  const expected = new Set(a.schema.map(f => f.name));
  for (const name of Object.keys(input)) if (!expected.has(name)) throw new InputError(`Đặc trưng không hợp lệ: ${name}`);
  return a.schema.map(f => {
    const value = input[f.name];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new InputError(`${f.name}: cần một số hữu hạn, không được để trống.`);
    if (value < f.min || value > f.max) throw new InputError(`${f.name}: ngoài miền quan sát [${f.min}, ${f.max}].`);
    return value;
  });
}
export function predict(a: Artifact, m: Model, input: Record<string, unknown>): Prediction {
  if (!a.version || !a.models.some(model => model.id === m.id && model === m)) throw new InputError('Model hoặc version không thuộc artifact.');
  const values = validateInput(a, input), path: number[] = [], steps: PathStep[] = [];
  let node = m.nodes[0];
  while (true) {
    if (!node || path.includes(node.id)) throw new Error('Cấu trúc cây không hợp lệ.');
    path.push(node.id);
    if (node.left === -1) break;
    const value = values[node.feature], modelValue = Math.fround(value);
    const left = modelValue <= node.threshold, next = left ? node.left : node.right;
    steps.push({ node: node.id, feature: a.schema[node.feature].name, value, modelValue, threshold: node.threshold, left, next });
    node = m.nodes[next];
  }
  const total = node.values.reduce((sum, value) => sum + value, 0);
  const distribution = a.task === 'classification' ? node.values.map(value => value / total) : null;
  const prediction = distribution ? (distribution[1] > distribution[0] ? 1 : 0) : node.values[0];
  return { prediction, leaf: node, path, steps, distribution, version: a.version, model: m.id };
}
export function toInput(a: Artifact, values: number[]): Record<string, number> {
  if (values.length !== a.features) throw new InputError('Số đặc trưng không đúng schema.');
  return Object.fromEntries(a.schema.map((f, i) => [f.name, values[i]]));
}
