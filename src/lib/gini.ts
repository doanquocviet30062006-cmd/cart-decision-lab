export function gini(a: number, b: number): number | null {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) throw new Error('Số mẫu phải là số nguyên không âm.');
  const n = a+b;
  return n === 0 ? null : 1-(a/n)**2-(b/n)**2;
}
