# Fibonacci

The classic CPU-bound benchmark: naive recursive Fibonacci. The same source
runs unchanged under Node.js and as a compiled TypeNative binary, and times
itself with `performance.now()` so both runtimes are measured the same way —
compute time only, startup excluded.

## The code

```ts
// main.ts
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
```

## Run it

With Node.js:

```sh
node main.ts 35
# fib(35) = 9227465
# computed in 94.81 ms
```

With TypeNative (compile to a native binary and run it):

```sh
npx typenative --source main.ts --output dist/fib.exe
./dist/fib.exe 35
# fib(35) = 9227465
# computed in 50.16 ms
```

From a checkout of this repository, use the local CLI instead of `npx`:

```sh
node bin/cli.js --source examples/fibonacci/main.ts --script   # compile + run
node bin/cli.js --source examples/fibonacci/main.ts --output dist/fib.exe
```

(`--script` compiles and runs in one step; passing a custom `n` requires a
built binary, as shown above.)

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [n=35] [runs=15]`. The script compiles
`main.ts` with the TypeNative CLI, runs `fib(35)` under both runtimes, and
reports two numbers per run: the program's own in-process compute time
(parsed from its output) and the total wall time including process startup.

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600, Node v26.13.0, Go 1.27.4,
TypeNative 0.5.0 (unreleased changes), default (non-`--release`) build.

Compute time, `fib(35)` over 15 runs (measured in-program):

| Runtime    | min       | median    | mean      | max       |
|------------|-----------|-----------|-----------|-----------|
| Node.js    | 72.86 ms  | 73.81 ms  | 73.89 ms  | 75.60 ms  |
| TypeNative | 33.94 ms  | 36.37 ms  | 37.32 ms  | 48.15 ms  |

Total wall time per run, including startup (spawn to exit):

| Runtime    | min       | median    | mean      | max       |
|------------|-----------|-----------|-----------|-----------|
| Node.js    | 129.75 ms | 134.23 ms | 135.53 ms | 144.45 ms |
| TypeNative | 42.45 ms  | 45.12 ms  | 53.19 ms  | 153.97 ms |

**TypeNative computes 2.0x faster** and finishes the whole run **3.0x
faster**. The recursive calls, arithmetic, and number boxing all compile
ahead of time to native machine code via Go, while V8 must tier up through
its JIT before it reaches comparable speed — and never reaches it here, since
Go's float64 arithmetic and non-virtual calls map directly onto the hardware.

Takeaway: for CPU-bound TypeScript (number crunching, parsing, simulations),
compiling with TypeNative roughly doubles throughput without changing a line
of code.
