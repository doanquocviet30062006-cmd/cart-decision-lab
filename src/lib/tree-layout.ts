import { Model, TreeNode } from './types';
export interface PositionedNode { node: TreeNode; x: number; y: number; collapsed: boolean }
export function treeLayout(model: Model, depthLimit: number, expanded: Set<number>, path: number[] = []) {
  const positions: PositionedNode[] = [];
  const edges: { from: number; to: number; left: boolean; highlighted: boolean }[] = [];
  let cursor = 0, depthMax = 0;
  function visit(id: number, depth: number): number {
    const node = model.nodes[id];
    const showChildren = node.left !== -1 && (depth < depthLimit || expanded.has(id) || path.includes(id));
    depthMax = Math.max(depthMax, depth);
    let x: number;
    if (showChildren) {
      const leftX = visit(node.left, depth + 1), rightX = visit(node.right, depth + 1);
      x = (leftX + rightX) / 2;
      for (const [to, left] of [[node.left, true], [node.right, false]] as const) edges.push({ from: id, to, left, highlighted: path[path.indexOf(id) + 1] === to && path.includes(id) });
    } else { x = 112 + cursor * 214; cursor++; }
    positions.push({ node, x, y: 25 + depth * 135, collapsed: node.left !== -1 && !showChildren });
    return x;
  }
  visit(0, 0);
  return { positions, edges, width: Math.max(450, cursor * 214 + 10), height: (depthMax + 1) * 135 + 5 };
}
