// perf: evaluating an expression tree of a discriminated union with `switch (e.kind)`
import { performance } from 'node:perf_hooks';

interface Num {
  kind: 'num';
  value: number;
}
interface Add {
  kind: 'add';
  left: Expr;
  right: Expr;
}
interface Mul {
  kind: 'mul';
  left: Expr;
  right: Expr;
}
interface Neg {
  kind: 'neg';
  operand: Expr;
}
type Expr = Num | Add | Mul | Neg;

function build(depth: number, seed: number): Expr {
  if (depth === 0) return { kind: 'num', value: (seed % 10) + 1 };
  switch (seed % 3) {
    case 0:
      return { kind: 'add', left: build(depth - 1, seed * 3 + 1), right: build(depth - 1, seed + 7) };
    case 1:
      return { kind: 'mul', left: build(depth - 1, seed + 2), right: build(depth - 1, seed * 7 + 3) };
    default:
      return { kind: 'neg', operand: build(depth - 1, seed + 5) };
  }
}

function evaluate(e: Expr): number {
  switch (e.kind) {
    case 'num':
      return e.value;
    case 'add':
      return (evaluate(e.left) + evaluate(e.right)) % 1009;
    case 'mul':
      return ((evaluate(e.left) * evaluate(e.right)) % 1009) + 1;
    case 'neg':
      return 1010 - evaluate(e.operand);
  }
}

const tree = build(18, 1);

const start = performance.now();
let total = 0;
for (let i = 0; i < 20; i++) total += evaluate(tree);
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
