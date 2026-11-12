# Performance probes

Micro-benchmarks for TypeNative's hot paths. [conformance/](../conformance/)
proves that a construct compiles correctly, and this folder measures how fast the
compiled code runs. Each probe is one small standalone TypeScript program that
exercises one construct (string `+=`, `Map` lookups, `switch` over a
discriminated union, `any` property access, …) and runs unchanged under Node.js
and as a TypeNative binary. A transpiler or runtime change can then be measured
on the exact path it touches, instead of only through whole programs like
[examples/marked-cli](../examples/marked-cli/) where no single hot spot stands
out.

## Running

From a checkout, after `npm run build`:

```sh
npm run perf                                   # every probe, 7 interleaved runs each
node scripts/performance.mjs str               # only probes whose name contains "str"
node scripts/performance.mjs map --runs 15     # more runs for a tighter median
node scripts/performance.mjs --write           # also update the results table below
node scripts/performance.mjs --native          # compile with the self-hosted binary
```

The runner ([scripts/performance.mjs](../scripts/performance.mjs)) builds each
probe once with the TypeNative CLI. It then runs the probe under Node.js and as
the native binary, alternating which runtime goes first in each round. It
prints a markdown table of the in-program timings. A probe stops taking more
rounds once its native runs have used 15 s, so a pathological probe can't stall
the suite. Those rows show how many runs they got.

The runner fails (exit 1) only when a probe doesn't build, crashes, or prints a
different `checksum` under the two runtimes. A slow probe never fails it,
because slowness is the thing being measured.

`--write` replaces the rows of the probes that ran inside the results region
below, keeps the other rows, and refreshes the environment line. Run the full
suite on an idle machine before committing new numbers.

## Writing a probe

A probe is `performance/<area>-<name>.ts`. Areas: `num`, `str`, `arr`, `map`,
`set`, `obj`, `class`, `union`, `any`, `fn`, `regex`, `json`, `exc`.

```ts
// perf: one line saying what this measures (shown in the results table)
import { performance } from 'node:perf_hooks';

const input = /* build the input here, outside the timed region */;

const start = performance.now();
let total = 0;
/* the hot loop, folding its results into total */
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
```

- **Line 1** must be `// perf: <description>`. The table's "Measures" column
  is read from it.
- **Time only the hot loop.** Process startup is excluded on purpose, because
  [examples/hello-world](../examples/hello-world/) already measures that.
- **Derive the checksum from the work**, so neither compiler can drop the loop.
  The runner compares the checksums, which also catches wrong results.
- **Size it for Node.js at roughly 100–500 ms.** Shorter runs are noisy. If
  TypeNative takes many seconds on it, that is a finding: shrink the probe only
  until a run takes a few seconds, and note it below.
- **Measure one thing.** Keep `%` out of hot loops: it compiles to Go's slow
  `math.Mod` (see [findings](#findings)) and would swamp whatever the probe is
  about. Use `i & 1023` and friends instead.
- Keep it standalone (no local imports), like the conformance probes.

## Methodology and caveats

- Numbers are the program's own `performance.now()` timings, never spawn-to-exit
  times. Speedups compare medians, and the minimums are listed too because they
  are the most stable figure on a noisy machine.
- Background load skews results a lot. A self-hosted compile or a .NET build
  running in the background cut both runtimes about 3x on the reference
  machine. Interleaving the runtimes spreads drift across both, but it can't
  remove load, so check that the machine is idle before trusting a run.
- Micro-benchmarks flatter JITs: V8 optimizes these tight loops with type
  feedback that a large program rarely gets. Use the ratios here to rank hot
  paths against each other and to track them over time. They are not a
  prediction for whole programs; see [examples/](../examples/) for those.
- To find out *why* a probe is slow, write its Go with
  `node bin/cli.js --source performance/<probe>.ts --emit-go <dir>` and profile
  it with `runtime/pprof` (`go tool pprof -top -cum`).

## Results

<!-- perf-results:start -->

Last run 2026-11-12: Windows_NT 10.0.26300, AMD Ryzen 5 7600 6-Core Processor, Node v26.13.0, go1.27.4 windows/amd64, TypeNative 0.5.0, 7 interleaved runs per probe.

| Probe | Measures | Node ms (min / median) | TypeNative ms (min / median) | TypeNative vs Node (median) |
| ----- | -------- | ---------------------: | ---------------------------: | :-------------------------- |
| [any-dynamic](any-dynamic.ts) | property reads and writes on `any` objects (nested objects, arrays) | 51.0 / 51.5 | 3771 / 3812 (4 runs) | 74.0x slower |
| [any-record-view](any-record-view.ts) | viewing an `any` object as `Record<string, any>` and reading keys through it | 5.3 / 5.4 | 1686 / 1696 | 316.3x slower |
| [arr-hof](arr-hof.ts) | `map` / `filter` / `reduce` / `some` chains with closure callbacks | 87.1 / 87.9 | 63.5 / 64.2 | **1.4x faster** |
| [arr-push-index](arr-push-index.ts) | `push`, indexed reads/writes and `length` on number arrays | 50.7 / 53.0 | 139 / 141 | 2.7x slower |
| [arr-sort](arr-sort.ts) | `sort` of numbers with a comparator and of strings in default order | 116 / 122 | 310 / 324 | 2.7x slower |
| [class-dispatch](class-dispatch.ts) | virtual method calls through an abstract base class and an interface | 69.2 / 78.0 | 720 / 743 | 9.5x slower |
| [exc-try-catch](exc-try-catch.ts) | `try`/`catch`/`finally` in a hot loop where one call in 1,024 throws | 23.7 / 24.1 | 267 / 267 | 11.1x slower |
| [fn-closures](fn-closures.ts) | creating closures over mutable state and calling them indirectly | 151 / 173 | 271 / 350 | 2.0x slower |
| [fn-recursion-tree](fn-recursion-tree.ts) | building and walking binary trees (recursion plus allocation) | 101 / 103 | 150 / 152 | 1.5x slower |
| [json-roundtrip](json-roundtrip.ts) | `JSON.stringify` and `JSON.parse` of an array of nested objects | 37.0 / 38.8 | 321 / 324 | 8.3x slower |
| [map-string-keys](map-string-keys.ts) | `Map<string, number>` `set` / `get` / `has` word counting | 90.2 / 92.4 | 119 / 123 | 1.3x slower |
| [num-arith-loop](num-arith-loop.ts) | tight float64 loop with `%`, `*` and `Math.floor` | 73.8 / 74.3 | 4485 / 4527 (4 runs) | 61.0x slower |
| [num-to-string](num-to-string.ts) | number/string conversion: `String(n)`, `toFixed`, `Number(str)`, `parseInt` | 98.2 / 101 | 659 / 667 | 6.6x slower |
| [obj-alloc](obj-alloc.ts) | allocating many short-lived object literals and class instances | 62.1 / 63.2 | 332 / 333 | 5.3x slower |
| [regex-exec](regex-exec.ts) | regex `test`, `exec` with groups and global `replace` over log lines | 65.5 / 66.2 | 107 / 109 | 1.6x slower |
| [set-ops](set-ops.ts) | `Set<number>` `add` / `has` / `delete` on a 16,384-entry set | 36.8 / 37.3 | 1552 / 1556 | 41.7x slower |
| [str-char-scan](str-char-scan.ts) | lexer-style scan of a large string with `charCodeAt` and `str[i]` | 77.3 / 77.8 | 316 / 318 | 4.1x slower |
| [str-concat](str-concat.ts) | growing ~20 KB strings with `s += x` and `s = s + …` (each pass starts empty) | 9.9 / 10.2 | 50.7 / 51.5 | 5.1x slower |
| [str-split-join](str-split-join.ts) | `split`, `join`, `indexOf`, `slice` and `trim` on CSV-like lines | 54.8 / 56.6 | 38.0 / 39.1 | **1.4x faster** |
| [str-template](str-template.ts) | template literals mixing strings, integers, floats and booleans | 50.5 / 51.1 | 104 / 105 | 2.1x slower |
| [union-switch](union-switch.ts) | evaluating an expression tree of a discriminated union with `switch (e.kind)` | 87.9 / 91.1 | 311 / 319 | 3.5x slower |

<!-- perf-results:end -->

## Findings

Causes behind the worst rows. Each one is checked against the generated Go
(`--emit-go`) or the runtime source in [src/transpiler.ts](../src/transpiler.ts).
Update this section when a fix lands or a new cause is confirmed.

| Probe | Cause | Status |
| ----- | ----- | ------ |
| `str-concat` | Typed `string` `+=` and `s = s + …` compile to Go string `+=`, which copies the whole string on every append, so a growing string costs O(n²). V8 uses ropes. The runtime's in-place `tnConcat` buffer is only used for dynamic (`any`) `+`. At 200,000 appends one string took 39 s. | open |
| `any-record-view` | Assigning an `any` object to `Record<string, any>` emits `TnAsPtr[TnMap[string, interface{}]](r)`. The value is a `map[string]interface{}`, not a `TnMap`, so `TnAsPtr` falls through to the reflect-based `TnConvertDynamic` and rebuilds the map on every access. | open |
| `num-arith-loop` | `a % b` compiles to `math.Mod`, whose cost grows with the exponent gap between the operands: about 150 ns per call for `2e8 % 13`. The same loop with `*` in place of `%` runs in 150 ms instead of 7.7 s. A fast path for integral operands (`int64` modulo when both fit) would cover almost every real use. | open |
| `set-ops` | `TnMap.Delete` (shared by `Map` and `Set`) scans the insertion-order `keys` slice and splices it, so each delete is O(size) and clearing a set is O(n²). | open |
| `any-dynamic` | Every read and write on an `any` object goes through the dynamic helpers (`TnGetRef`, `TnGetPeek`, `TnSet`, `TnDynamicAdd`, `TnAs`), about 320 ns per record per pass (seven property accesses). Not profiled yet. | open |
| `num-to-string`, `json-roundtrip`, `class-dispatch` | 10–13x slower. Not profiled yet. | open |
