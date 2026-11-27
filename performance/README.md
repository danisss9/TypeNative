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

A probe is `performance/<area>-<name>.ts`. Areas: `num`, `bigint`, `str`,
`arr`, `typed`, `buf`, `map`, `set`, `obj`, `class`, `union`, `any`, `fn`,
`gen`, `iter`, `regex`, `json`, `date`, `intl`, `temporal`, `exc`, `events`, `async`, `stream`, `url`, `crypto`, `zlib`, `sqlite`, `wasm`.

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
  `math.Mod` and would swamp whatever the probe is
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
- To find out *why* a probe (or any program) is slow, build it with `--profile`:
  the binary writes a CPU profile to `$TYPENATIVE_CPUPROFILE` (default
  `cpu.pprof`) when it exits. Read it with `go tool pprof -top -cum <exe> <profile>`.
  For example, `node bin/cli.js --source performance/num-bitwise.ts --output bw.exe --profile`.
  `--emit-go <dir>` shows the Go the profile's lines refer to.

## Results

<!-- perf-results:start -->

Last run 2026-11-27: Windows_NT 10.0.26300, AMD Ryzen 5 7600 6-Core Processor, Node v26.13.0, go1.27.4 windows/amd64, TypeNative 0.7.2, 7 interleaved runs per probe.

| Probe | Measures | Node ms (min / median) | TypeNative ms (min / median) | TypeNative vs Node (median) |
| ----- | -------- | ---------------------: | ---------------------------: | :-------------------------- |
| [async-await](async-await.ts) | `await` chains of async functions that resolve immediately | 102 / 105 | 5.7 / 6.1 | **17.1x faster** |
| [gen-for-of](gen-for-of.ts) | sync generators (a method, `*[Symbol.iterator]()`, `yield*`) consumed by `for…of` | 53.6 / 53.9 | 11.8 / 12.3 | **4.4x faster** |
| [fn-closures](fn-closures.ts) | creating closures over mutable state and calling them indirectly | 146 / 151 | 36.4 / 37.7 | **4.0x faster** |
| [arr-hof](arr-hof.ts) | `map` / `filter` / `reduce` / `some` chains with closure callbacks | 93.8 / 95.2 | 29.7 / 30.8 | **3.1x faster** |
| [iter-helpers](iter-helpers.ts) | ES2025 iterator helpers (`filter` / `map` / `take` / `drop` / `reduce` / `toArray`) on generators and `Iterator.from(array)` | 68.4 / 69.0 | 24.6 / 25.2 | **2.7x faster** |
| [date-format](date-format.ts) | `new Date(ms)`, UTC getters, `toISOString` and `Date.parse` (timestamps in log lines) | 86.6 / 89.9 | 32.3 / 33.1 | **2.7x faster** |
| [temporal-arith](temporal-arith.ts) | `Temporal.PlainDateTime` and `Temporal.Instant` parsing, `add`, `until` and comparisons | 44.6 / 45.9 | 19.6 / 22.5 | **2.0x faster** |
| [crypto-hash-cipher](crypto-hash-cipher.ts) | `node:crypto` `createHash('sha256')`, `createHmac` and AES-256-GCM `createCipheriv` / `createDecipheriv` | 75.8 / 76.5 | 36.2 / 37.6 | **2.0x faster** |
| [str-split-join](str-split-join.ts) | `split`, `join`, `indexOf`, `slice` and `trim` on CSV-like lines | 57.6 / 62.0 | 41.6 / 43.4 | **1.4x faster** |
| [url-path](url-path.ts) | `new URL`, `URLSearchParams` parsing/serialization and `node:path` `join` / `resolve` / `relative` / `parse` | 152 / 155 | 119 / 122 | **1.3x faster** |
| [arr-push-index](arr-push-index.ts) | `push`, indexed reads/writes and `length` on number arrays | 57.0 / 58.5 | 50.9 / 51.9 | **1.1x faster** |
| [str-short-scan](str-short-scan.ts) | `charCodeAt(i)` / `s[i]` scans of many short (< 512 byte) lines | 32.2 / 33.9 | 32.6 / 33.5 | **1.0x faster** |
| [async-als](async-als.ts) | `node:async_hooks` `AsyncLocalStorage` `run` and `getStore` across sync and `async` / `await` calls | 52.8 / 54.4 | 55.5 / 57.8 | 1.1x slower |
| [regex-replace-fn](regex-replace-fn.ts) | `replace` with a callback, `matchAll` with groups and `split` on a regex | 72.7 / 77.4 | 81.9 / 84.6 | 1.1x slower |
| [str-switch-compare](str-switch-compare.ts) | `switch` over string values and `===` / `<` string comparisons (keyword lookup) | 93.0 / 95.9 | 103 / 105 | 1.1x slower |
| [async-promise-all](async-promise-all.ts) | `Promise.all` fan-out, `new Promise` + `.then` chains and `queueMicrotask` (the general async path) | 64.4 / 68.0 | 75.5 / 76.4 | 1.1x slower |
| [arr-slice-concat](arr-slice-concat.ts) | `slice`, `splice`, `concat`, `[...a, ...b]`, `includes` and `indexOf` on arrays | 115 / 116 | 133 / 138 | 1.2x slower |
| [buf-encode](buf-encode.ts) | `Buffer` integer reads and writes, `hex` / `base64` / `utf8` conversion, `Buffer.concat`, `Uint8Array` `toHex` / `fromBase64` and `TextEncoder` / `TextDecoder` | 87.3 / 87.9 | 106 / 107 | 1.2x slower |
| [map-string-keys](map-string-keys.ts) | `Map<string, number>` `set` / `get` / `has` word counting | 98.7 / 104 | 123 / 130 | 1.2x slower |
| [obj-record-dict](obj-record-dict.ts) | a `Record<string, number>` object literal used as a dictionary (`rec[k] ?? 0`, `k in rec`, `Object.keys`) | 89.3 / 93.7 | 114 / 117 | 1.3x slower |
| [exc-throw-rare](exc-throw-rare.ts) | `try`/`catch`/`finally` in a hot loop where nothing throws | 205 / 206 | 256 / 258 | 1.3x slower |
| [obj-clone](obj-clone.ts) | `structuredClone` of nested objects, arrays, `Map`, `Set`, `Date` and `Uint8Array` | 105 / 109 | 127 / 139 | 1.3x slower |
| [fn-recursion-tree](fn-recursion-tree.ts) | building and walking binary trees (recursion plus allocation) | 118 / 127 | 156 / 162 | 1.3x slower |
| [str-char-scan](str-char-scan.ts) | lexer-style scan of a large string with `charCodeAt` and `str[i]` | 80.7 / 82.6 | 102 / 114 | 1.4x slower |
| [map-weak](map-weak.ts) | `WeakMap` and `WeakSet` `set` / `get` / `has` / `add` on object instances | 49.5 / 53.6 | 74.6 / 76.0 | 1.4x slower |
| [zlib-compress](zlib-compress.ts) | `node:zlib` `gzipSync` / `gunzipSync`, `brotliCompressSync` / `brotliDecompressSync` and `zstdCompressSync` / `zstdDecompressSync` | 170 / 172 | 246 / 253 | 1.5x slower |
| [num-hash-imul](num-hash-imul.ts) | FNV-1a and murmur-style string hashing with `Math.imul`, `>>> 0` and `charCodeAt` | 73.2 / 79.1 | 114 / 117 | 1.5x slower |
| [any-record-view](any-record-view.ts) | viewing an `any` object as `Record<string, any>` and reading keys through it | 5.5 / 6.2 | 9.2 / 9.3 | 1.5x slower |
| [wasm-call](wasm-call.ts) | calls from TypeScript into WebAssembly exports (i32 / f64 arithmetic, memory loads) and reads of the exported memory | 40.0 / 41.7 | 61.7 / 63.6 | 1.5x slower |
| [str-template](str-template.ts) | template literals mixing strings, integers, floats and booleans | 54.1 / 54.6 | 84.3 / 86.1 | 1.6x slower |
| [regex-exec](regex-exec.ts) | regex `test`, `exec` with groups and global `replace` over log lines | 67.5 / 70.5 | 112 / 114 | 1.6x slower |
| [map-number-keys](map-number-keys.ts) | `Map<number, T>` lookups by integer id and memoization | 125 / 129 | 196 / 210 | 1.6x slower |
| [str-methods](str-methods.ts) | `startsWith` / `endsWith` / `includes`, case conversion, `padStart`, `repeat` and `replaceAll` with a string | 69.6 / 71.7 | 126 / 130 | 1.8x slower |
| [class-dispatch](class-dispatch.ts) | virtual method calls through an abstract base class and an interface | 70.8 / 71.1 | 130 / 130 | 1.8x slower |
| [num-arith-loop](num-arith-loop.ts) | tight float64 loop with `%`, `*` and `Math.floor` | 78.8 / 82.8 | 166 / 167 | 2.0x slower |
| [json-roundtrip](json-roundtrip.ts) | `JSON.stringify` and `JSON.parse` of an array of nested objects | 41.7 / 42.5 | 82.2 / 86.7 | 2.0x slower |
| [sqlite-query](sqlite-query.ts) | `node:sqlite` `DatabaseSync(':memory:')` prepared bulk inserts and indexed `SELECT` queries | 40.9 / 41.9 | 94.3 / 95.2 | 2.3x slower |
| [gen-async](gen-async.ts) | `async function*` generators consumed with `for await…of` | 54.9 / 56.0 | 123 / 129 | 2.3x slower |
| [arr-push-local](arr-push-local.ts) | building many short arrays with `push` inside functions (locals and fields of new objects) | 147 / 153 | 343 / 358 | 2.3x slower |
| [set-ops](set-ops.ts) | `Set<number>` `add` / `has` / `delete` on a 16,384-entry set | 38.7 / 40.3 | 94.4 / 96.1 | 2.4x slower |
| [regex-site](regex-site.ts) | `/g` regex literals evaluated inside a hot function, and `.index` on long input | 71.0 / 71.9 | 165 / 173 | 2.4x slower |
| [map-iterate](map-iterate.ts) | iterating a `Map` (`for…of` entries, `forEach`, `[...values()]`), also after deletes | 91.8 / 93.9 | 228 / 231 | 2.5x slower |
| [str-concat](str-concat.ts) | growing ~20 KB strings with `s += x` and `s = s + …` (each pass starts empty) | 10.7 / 10.8 | 25.4 / 26.7 | 2.5x slower |
| [gen-next](gen-next.ts) | generators driven by hand (`.next()`), spread `[...gen()]` and stored in a variable before `for…of` | 45.7 / 46.1 | 111 / 114 | 2.5x slower |
| [exc-try-catch](exc-try-catch.ts) | `try`/`catch`/`finally` in a hot loop where one call in 1,024 throws | 25.0 / 25.6 | 65.0 / 65.5 | 2.6x slower |
| [map-object-keys](map-object-keys.ts) | `Map<object, number>` `set` / `get` / `has` / `delete` using object-identity keys | 52.6 / 54.1 | 144 / 147 | 2.7x slower |
| [intl-format](intl-format.ts) | `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.Collator` formatting and comparison | 55.0 / 55.5 | 151 / 153 | 2.8x slower |
| [arr-sort](arr-sort.ts) | `sort` of numbers with a comparator and of strings in default order | 130 / 132 | 362 / 365 | 2.8x slower |
| [json-any](json-any.ts) | `JSON.parse` into `any` and walking the result, `JSON.stringify` of objects built as `any` | 69.6 / 71.1 | 190 / 198 | 2.8x slower |
| [bigint-arith](bigint-arith.ts) | `bigint` `+`, `*`, `%` and shifts (Fibonacci mod a prime, modular exponentiation) | 75.6 / 77.9 | 216 / 218 | 2.8x slower |
| [events-emit](events-emit.ts) | `EventEmitter` `emit` to listeners taking 0, 1 and 2 arguments | 72.1 / 76.0 | 214 / 217 | 2.9x slower |
| [num-mod-int](num-mod-int.ts) | `%` on integer operands (hash buckets, cycling indexes) | 64.2 / 64.8 | 191 / 193 | 3.0x slower |
| [obj-alloc](obj-alloc.ts) | allocating many short-lived object literals and class instances | 64.3 / 65.8 | 191 / 202 | 3.1x slower |
| [obj-spread-destructure](obj-spread-destructure.ts) | object spread `{ ...p, x }`, destructuring with defaults, and array-destructuring swaps | 53.6 / 54.3 | 162 / 175 | 3.2x slower |
| [obj-optional-chain](obj-optional-chain.ts) | `?.` and `??` walking nullable links and optional fields | 49.0 / 52.6 | 162 / 171 | 3.2x slower |
| [str-concat-plus](str-concat-plus.ts) | growing strings with `s = s + x` (not `+=`), each pass starting empty | 29.9 / 31.7 | 101 / 104 | 3.3x slower |
| [regex-backtrack](regex-backtrack.ts) | backtracking RegExp (lookahead, lookbehind, backreferences) `test`, `exec` and `replace` | 65.3 / 66.8 | 230 / 237 | 3.5x slower |
| [num-to-string](num-to-string.ts) | number/string conversion: `String(n)`, `toFixed`, `Number(str)`, `parseInt` | 104 / 111 | 464 / 482 | 4.3x slower |
| [map-delete](map-delete.ts) | `Map<string, number>` insert/delete churn (an LRU-style sliding window) | 38.0 / 40.6 | 173 / 178 | 4.4x slower |
| [union-switch](union-switch.ts) | evaluating an expression tree of a discriminated union with `switch (e.kind)` | 118 / 131 | 593 / 623 | 4.7x slower |
| [num-bitwise](num-bitwise.ts) | bitwise and, or, xor and shifts (`<<`, `>>`, `>>>`) on integers, and flag tests | 22.2 / 22.4 | 112 / 114 | 5.1x slower |
| [str-unicode](str-unicode.ts) | `length`, `charCodeAt`, `codePointAt` and `slice` on non-ASCII text (UTF-16 indexes) | 73.0 / 74.6 | 384 / 395 | 5.3x slower |
| [typed-array](typed-array.ts) | `Float64Array` / `Int32Array` / `Uint8Array` indexed loops, `subarray`, `set` and `fill` | 62.7 / 63.2 | 321 / 340 | 5.4x slower |
| [arr-for-of](arr-for-of.ts) | `for…of`, `forEach`, `find` / `findIndex` and `entries()` over arrays of objects | 57.0 / 58.0 | 305 / 315 | 5.4x slower |
| [set-algebra](set-algebra.ts) | `Set<string>` `add` / `has` and ES2025 set operations (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`) | 35.6 / 36.6 | 194 / 204 | 5.6x slower |
| [typed-dataview](typed-dataview.ts) | `DataView` little- and big-endian integer and float reads and writes over an `ArrayBuffer` | 28.1 / 28.5 | 148 / 163 | 5.7x slower |
| [any-dynamic](any-dynamic.ts) | property reads and writes on `any` objects (nested objects, arrays) | 53.9 / 55.1 | 318 / 320 | 5.8x slower |
| [obj-keys-entries](obj-keys-entries.ts) | `Object.keys` / `values` / `entries` and `for…in` over typed objects and class instances | 78.4 / 81.4 | 474 / 487 | 6.0x slower |
| [fn-rest-spread](fn-rest-spread.ts) | rest parameters, spread arguments `f(...args)`, default parameters and `.call` / `.apply` / `.bind` | 74.6 / 75.8 | 467 / 479 | 6.3x slower |
| [union-typeof](union-typeof.ts) | `typeof`, `instanceof` and `Array.isArray` narrowing of a five-way union (string, number, boolean, class, array) | 51.0 / 51.8 | 324 / 332 | 6.4x slower |
| [stream-pipe](stream-pipe.ts) | `node:stream` `Readable` → `Transform` → `Writable` and `stream/web` `ReadableStream` / `TransformStream` throughput | 42.0 / 42.4 | 246 / 280 | 6.6x slower |
| [class-accessors](class-accessors.ts) | getters and setters, static fields and `super.m()` calls on class instances | 9.7 / 10.0 | 73.5 / 74.5 | 7.4x slower |

<!-- perf-results:end -->

## Whole-program case study: `tsc` in Node.js vs TypeNative `tsc` vs TypeScript 7 (`tsgo`)

Micro-benchmarks above isolate single hot paths. For an apples-to-apples whole-program comparison at scale, [examples/tsc/](../examples/tsc/) compiles the full unmodified upstream TypeScript 6.0.3 compiler (81 files, ~178K lines) into a single native Go binary with 23/23 byte-for-byte parity against Node.js. Below is how the same 6 workloads from [examples/tsc/bench.mjs](../examples/tsc/bench.mjs) compare across three runtimes on the same machine:

- **`tsc` in Node.js:** upstream TypeScript `6.0.3` pre-compiled ESM bundle running on Node.js v26.13.0.
- **TypeNative `tsc`:** the exact same TypeScript `6.0.3` source transpiled automatically to Go by TypeNative 0.7.2 (`45.3 MB` default build, zero compiler logic rewritten).
- **TypeScript 7 in Go (`tsgo`):** `@typescript/native-preview` `7.0.0-dev.20260707.2` (`tsgo.exe`, `23.4 MB`), Microsoft's hand-written, multi-threaded Go port of TypeScript, invoked directly (without Node's CLI wrapper).

Last run 2026-11-27: Windows_NT 10.0.26300, AMD Ryzen 5 7600 6-Core Processor (12 threads), Node v26.13.0, go1.27.4 windows/amd64, TypeNative 0.7.2. All timings are complete spawn-to-exit process wall times (min / median), interleaved across all three runtimes; every run exited `0`.

| Workload | Node.js `tsc` 6.0.3 (min / median) | TypeNative `tsc` 6.0.3 (min / median) | Go `tsgo` 7.0 (min / median) | TypeNative vs Node | TypeNative vs `tsgo` | `tsgo` vs Node |
| --- | ---: | ---: | ---: | :--- | :--- | :--- |
| Cold CLI startup (`tsc --version`, 15 runs) | 179.4 / 183.1 ms | 13.5 / 14.2 ms | 10.3 / 10.5 ms | **12.9x faster** | 1.35x slower | **17.5x faster** |
| Single-file strict compile (`.js` + `.d.ts` + `.js.map`, 5 runs) | 779.4 / 799.4 ms | 2,672.9 / 2,740.1 ms | 199.6 / 203.7 ms | 3.43x slower | 13.4x slower | **3.92x faster** |
| Medium project cold build (22 files, 5 runs) | 929.7 / 1,055.8 ms | 3,104.2 / 3,488.4 ms | 224.6 / 250.4 ms | 3.30x slower | 13.9x slower | **4.22x faster** |
| Medium project incremental warm no-op (5 runs) | 424.4 / 538.9 ms | 741.3 / 795.3 ms | 52.6 / 54.2 ms | 1.48x slower | 14.7x slower | **9.95x faster** |
| Medium project incremental 1-file edit rebuild (5 runs) | 467.9 / 513.0 ms | 805.3 / 834.0 ms | 52.4 / 52.8 ms | 1.63x slower | 15.8x slower | **9.72x faster** |
| Large project (`tsc --noEmit` on TypeNative `src/`, ~47K LOC, 3 runs) | 3,439.9 / 3,829.5 ms | 65,988.4 / 66,056.9 ms | 505.3 / 529.1 ms | 17.2x slower | 125x slower | **7.24x faster** |

### Why the gap looks like this

- **Startup:** Both Go binaries avoid V8 initialization and parsing ~10 MB of compiler JS, so TypeNative `tsc` starts **12.9x faster** than Node.js and within **3.7 ms** of `tsgo` (`14.2 ms` vs `10.5 ms`).
- **Dynamic ASTs and structural types:** Upstream `tsc` 6.0.3 relies heavily on JS's dynamic object model — open AST `Node` shapes with 300+ discriminated-union variants, expando properties (`pos`, `end`, `parent`, `flowNode`), and ad-hoc object literals. V8 optimizes those reads with hidden classes and inline caches; automatic transpilation to Go must preserve full JS semantics via dynamic lookups (`TnGetRef` / `TnGetPeek`), structural conversions (`TnConvertDynamic`), and `interface{}` boxing (see [any-dynamic](any-dynamic.ts) and [union-switch](union-switch.ts) above). That overhead dominates on the ~47K-line `src/transpiler.ts` type-checking graph (`66.1 s` vs `3.83 s`).
- **Single-threaded JS vs hand-written parallel Go:** `tsc` 6.0.3 (under both Node.js and TypeNative) is strictly single-threaded, whereas `tsgo` was rewritten from scratch in idiomatic Go with compact typed structs, arena-friendly allocations, and multi-core goroutine parallelism across parsing, binding, and checking — achieving **3.9x–10x** over Node.js on project builds and **7.2x** on TypeNative's own `src/`.
- **Takeaway:** TypeNative delivers a zero-dependency native binary with 100% byte-for-byte `tsc` 6.0.3 compatibility and native CLI startup directly from unmodified TypeScript source, while `tsgo` shows the performance ceiling of a dedicated, multi-threaded Go rewrite that leaves JS's dynamic runtime semantics behind.
