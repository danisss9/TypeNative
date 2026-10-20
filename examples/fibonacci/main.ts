// Naive recursive Fibonacci: the classic CPU-bound benchmark. The same source
// runs unchanged under Node.js and as a compiled TypeNative binary, and times
// itself with performance.now() so both runtimes are measured the same way
// (compute time only, startup excluded).
//
//   node main.ts [n]     (default n = 35)
//   ./fib [n]
import { performance } from 'node:perf_hooks';

function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

const n = Number(process.argv[2] ?? '35');

const start = performance.now();
const result = fib(n);
const elapsedMs = performance.now() - start;

console.log(`fib(${n}) = ${result}`);
console.log(`computed in ${elapsedMs.toFixed(2)} ms`);
