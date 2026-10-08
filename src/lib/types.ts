export type Task = 'classification' | 'regression';
export interface Feature { name: string; min: number; max: number; unit: string; description: string }
export interface TreeNode { id: number; left: number; right: number; feature: number; threshold: number; impurity: number; samples: number; values: number[] }
export interface Model {
  id: string; alpha: number; selection_candidate: boolean; depth: number; leaves: number; nodes: TreeNode[];
  cv: { alpha: number; mean: number; std: number; folds: number[] };
  importance: number[]; metrics: Record<string, number>; train_metrics: Record<string, number>;
  evaluation: { sample: number; actual: number; predicted: number; residual: number }[];
  confusion?: number[][]; report?: Record<string, Record<string, number> | number>;
  roc?: { fpr: number; tpr: number }[];
}
export interface Demo { id: number; values: number[]; actual: number; split: string }
export interface Artifact {
  task: Task; dataset: string; total: number; features: number; train_count: number; test_count: number;
  schema: Feature[]; classes: string[] | null; label_mapping: Record<string, number> | null;
  train_indices: number[]; test_indices: number[]; cv_splits: { train: number[]; validation: number[] }[];
  seed: number; stratified: boolean; criterion: string; cv_metric: string;
  selected: string; baseline: string; report_model: string | null; models: Model[]; demos: Demo[];
  pruning_path: { alphas: number[]; impurities: number[] }; data_hash: string; version: string;
}
export interface PathStep { node: number; feature: string; value: number; modelValue: number; threshold: number; left: boolean; next: number }
export interface Prediction { prediction: number; leaf: TreeNode; path: number[]; steps: PathStep[]; distribution: number[] | null; version: string; model: string }
