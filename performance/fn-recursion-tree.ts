// perf: building and walking binary trees (recursion plus allocation)
import { performance } from 'node:perf_hooks';

class TreeNode {
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(left: TreeNode | null, right: TreeNode | null) {
    this.left = left;
    this.right = right;
  }
}

function make(depth: number): TreeNode {
  return depth === 0 ? new TreeNode(null, null) : new TreeNode(make(depth - 1), make(depth - 1));
}

function check(node: TreeNode): number {
  if (node.left === null || node.right === null) return 1;
  return 1 + check(node.left) + check(node.right);
}

const start = performance.now();
let total = 0;
for (let depth = 4; depth <= 16; depth += 2) {
  const iterations = 1 << (16 - depth + 4);
  for (let i = 0; i < iterations; i++) total += check(make(depth));
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
