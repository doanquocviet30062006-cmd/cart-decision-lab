import classification from '@/artifacts/classification.json';
import regression from '@/artifacts/regression.json';
import metadata from '@/artifacts/metadata.json';
import type { Artifact, Task, Model } from './types';
export const artifacts: Record<Task, Artifact> = { classification: classification as Artifact, regression: regression as Artifact };
export { metadata };
export function getModel(a: Artifact, id = a.selected): Model {
  const model = a.models.find(m => m.id === id);
  if (!model) throw new Error('Cấu hình không có artifact huấn luyện.');
  return model;
}
export function modelLabel(a: Artifact, m: Model) {
  if (m.id === a.baseline) return 'Baseline · chưa cắt tỉa';
  if (m.id === a.selected) return 'Pruned · chọn bằng CV';
  if (m.id === a.report_model) return `Tham chiếu báo cáo · α = ${m.alpha}`;
  return `Pruned · α = ${m.alpha}`;
}
export function format(value: number, digits = 3) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value); }
export function percent(value: number) { return `${format(value * 100, 2)}%`; }
export const warning = 'Ứng dụng sử dụng bộ dữ liệu nghiên cứu nhằm minh họa thuật toán CART. Kết quả không dành cho chẩn đoán, điều trị hoặc quyết định y tế.';
