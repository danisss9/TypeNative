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

Last run 2026-11-24: Windows_NT 10.0.26300, AMD Ryzen 5 7600 6-Core Processor, Node v26.13.0, go1.27.4 windows/amd64, TypeNative 0.7.1, 7 interleaved runs per probe.

| Probe | Measures | Node ms (min / median) | TypeNative ms (min / median) | TypeNative vs Node (median) |
| ----- | -------- | ---------------------: | ---------------------------: | :-------------------------- |
| [gen-for-of](gen-for-of.ts) | sync generators (a method, `*[Symbol.iterator]()`, `yield*`) consumed by `for…of` | 51.5 / 51.8 | 11.9 / 12.0 | **4.3x faster** |
| [fn-closures](fn-closures.ts) | creating closures over mutable state and calling them indirectly | 138 / 140 | 35.2 / 36.6 | **3.8x faster** |
| [arr-hof](arr-hof.ts) | `map` / `filter` / `reduce` / `some` chains with closure callbacks | 87.0 / 89.7 | 27.7 / 28.6 | **3.1x faster** |
| [date-format](date-format.ts) | `new Date(ms)`, UTC getters, `toISOString` and `Date.parse` (timestamps in log lines) | 83.1 / 83.6 | 30.6 / 31.1 | **2.7x faster** |
| [crypto-hash-cipher](crypto-hash-cipher.ts) | `node:crypto` `createHash('sha256')`, `createHmac` and AES-256-GCM `createCipheriv` / `createDecipheriv` | 66.6 / 68.1 | 35.9 / 37.6 | **1.8x faster** |
| [temporal-arith](temporal-arith.ts) | `Temporal.PlainDateTime` and `Temporal.Instant` parsing, `add`, `until` and comparisons | 35.8 / 36.1 | 19.1 / 20.4 | **1.8x faster** |
| [str-split-join](str-split-join.ts) | `split`, `join`, `indexOf`, `slice` and `trim` on CSV-like lines | 54.8 / 56.3 | 38.5 / 41.2 | **1.4x faster** |
| [url-path](url-path.ts) | `new URL`, `URLSearchParams` parsing/serialization and `node:path` `join` / `resolve` / `relative` / `parse` | 146 / 148 | 114 / 116 | **1.3x faster** |
| [arr-push-index](arr-push-index.ts) | `push`, indexed reads/writes and `length` on number arrays | 51.0 / 53.1 | 47.6 / 49.3 | **1.1x faster** |
| [str-switch-compare](str-switch-compare.ts) | `switch` over string values and `===` / `<` string comparisons (keyword lookup) | 89.4 / 91.8 | 94.6 / 95.3 | 1.0x slower |
| [arr-slice-concat](arr-slice-concat.ts) | `slice`, `splice`, `concat`, `[...a, ...b]`, `includes` and `indexOf` on arrays | 109 / 110 | 119 / 132 | 1.2x slower |
| [buf-encode](buf-encode.ts) | `Buffer` integer reads and writes, `hex` / `base64` / `utf8` conversion, `Buffer.concat`, `Uint8Array` `toHex` / `fromBase64` and `TextEncoder` / `TextDecoder` | 80.3 / 81.6 | 97.5 / 98.9 | 1.2x slower |
| [regex-replace-fn](regex-replace-fn.ts) | `replace` with a callback, `matchAll` with groups and `split` on a regex | 69.3 / 69.6 | 79.9 / 80.8 | 1.2x slower |
| [exc-throw-rare](exc-throw-rare.ts) | `try`/`catch`/`finally` in a hot loop where nothing throws | 192 / 193 | 244 / 246 | 1.3x slower |
| [map-string-keys](map-string-keys.ts) | `Map<string, number>` `set` / `get` / `has` word counting | 89.3 / 90.4 | 116 / 119 | 1.3x slower |
| [obj-clone](obj-clone.ts) | `structuredClone` of nested objects, arrays, `Map`, `Set`, `Date` and `Uint8Array` | 99.5 / 101 | 126 / 127 | 1.3x slower |
| [obj-record-dict](obj-record-dict.ts) | a `Record<string, number>` object literal used as a dictionary (`rec[k] ?? 0`, `k in rec`, `Object.keys`) | 83.8 / 85.0 | 107 / 112 | 1.3x slower |
| [obj-spread-destructure](obj-spread-destructure.ts) | object spread `{ ...p, x }`, destructuring with defaults, and array-destructuring swaps | 50.8 / 51.2 | 72.3 / 73.0 | 1.4x slower |
| [fn-recursion-tree](fn-recursion-tree.ts) | building and walking binary trees (recursion plus allocation) | 99.8 / 102 | 149 / 150 | 1.5x slower |
| [zlib-compress](zlib-compress.ts) | `node:zlib` `gzipSync` / `gunzipSync`, `brotliCompressSync` / `brotliDecompressSync` and `zstdCompressSync` / `zstdDecompressSync` | 159 / 160 | 233 / 238 | 1.5x slower |
| [map-number-keys](map-number-keys.ts) | `Map<number, T>` lookups by integer id and memoization | 107 / 107 | 166 / 168 | 1.6x slower |
| [map-weak](map-weak.ts) | `WeakMap` and `WeakSet` `set` / `get` / `has` / `add` on object instances | 45.7 / 46.2 | 70.8 / 72.9 | 1.6x slower |
| [regex-exec](regex-exec.ts) | regex `test`, `exec` with groups and global `replace` over log lines | 66.1 / 66.8 | 107 / 110 | 1.6x slower |
| [class-dispatch](class-dispatch.ts) | virtual method calls through an abstract base class and an interface | 68.8 / 70.3 | 120 / 122 | 1.7x slower |
| [json-roundtrip](json-roundtrip.ts) | `JSON.stringify` and `JSON.parse` of an array of nested objects | 36.6 / 38.9 | 77.8 / 78.2 | 2.0x slower |
| [num-arith-loop](num-arith-loop.ts) | tight float64 loop with `%`, `*` and `Math.floor` | 73.0 / 73.2 | 155 / 156 | 2.1x slower |
| [str-methods](str-methods.ts) | `startsWith` / `endsWith` / `includes`, case conversion, `padStart`, `repeat` and `replaceAll` with a string | 66.8 / 67.9 | 140 / 141 | 2.1x slower |
| [str-template](str-template.ts) | template literals mixing strings, integers, floats and booleans | 50.6 / 51.3 | 103 / 106 | 2.1x slower |
| [sqlite-query](sqlite-query.ts) | `node:sqlite` `DatabaseSync(':memory:')` prepared bulk inserts and indexed `SELECT` queries | 38.7 / 39.2 | 86.1 / 88.1 | 2.2x slower |
| [regex-site](regex-site.ts) | `/g` regex literals evaluated inside a hot function, and `.index` on long input | 69.2 / 69.7 | 157 / 159 | 2.3x slower |
| [arr-push-local](arr-push-local.ts) | building many short arrays with `push` inside functions (locals and fields of new objects) | 140 / 143 | 331 / 339 | 2.4x slower |
| [str-concat](str-concat.ts) | growing ~20 KB strings with `s += x` and `s = s + …` (each pass starts empty) | 10.2 / 10.5 | 24.2 / 24.9 | 2.4x slower |
| [set-ops](set-ops.ts) | `Set<number>` `add` / `has` / `delete` on a 16,384-entry set | 37.0 / 37.4 | 90.6 / 93.3 | 2.5x slower |
| [exc-try-catch](exc-try-catch.ts) | `try`/`catch`/`finally` in a hot loop where one call in 1,024 throws | 23.4 / 23.9 | 62.1 / 62.9 | 2.6x slower |
| [map-iterate](map-iterate.ts) | iterating a `Map` (`for…of` entries, `forEach`, `[...values()]`), also after deletes | 86.0 / 88.3 | 230 / 233 | 2.6x slower |
| [async-als](async-als.ts) | `node:async_hooks` `AsyncLocalStorage` `run` and `getStore` across sync and `async` / `await` calls | 50.7 / 51.4 | 135 / 139 | 2.7x slower |
| [map-object-keys](map-object-keys.ts) | `Map<object, number>` `set` / `get` / `has` / `delete` using object-identity keys | 49.7 / 51.1 | 138 / 142 | 2.8x slower |
| [obj-alloc](obj-alloc.ts) | allocating many short-lived object literals and class instances | 63.8 / 65.2 | 185 / 185 | 2.8x slower |
| [arr-sort](arr-sort.ts) | `sort` of numbers with a comparator and of strings in default order | 105 / 106 | 304 / 305 | 2.9x slower |
| [num-mod-int](num-mod-int.ts) | `%` on integer operands (hash buckets, cycling indexes) | 60.8 / 61.7 | 180 / 181 | 2.9x slower |
| [intl-format](intl-format.ts) | `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.Collator` formatting and comparison | 52.2 / 52.4 | 176 / 179 | 3.4x slower |
| [obj-optional-chain](obj-optional-chain.ts) | `?.` and `??` walking nullable links and optional fields | 46.8 / 48.6 | 161 / 163 | 3.4x slower |
| [str-concat-plus](str-concat-plus.ts) | growing strings with `s = s + x` (not `+=`), each pass starting empty | 27.7 / 29.2 | 95.1 / 98.9 | 3.4x slower |
| [str-char-scan](str-char-scan.ts) | lexer-style scan of a large string with `charCodeAt` and `str[i]` | 77.5 / 78.5 | 268 / 272 | 3.5x slower |
| [regex-backtrack](regex-backtrack.ts) | backtracking RegExp (lookahead, lookbehind, backreferences) `test`, `exec` and `replace` | 61.2 / 61.4 | 224 / 228 | 3.7x slower |
| [union-switch](union-switch.ts) | evaluating an expression tree of a discriminated union with `switch (e.kind)` | 86.9 / 89.1 | 307 / 327 | 3.7x slower |
| [json-any](json-any.ts) | `JSON.parse` into `any` and walking the result, `JSON.stringify` of objects built as `any` | 66.8 / 67.3 | 255 / 258 | 3.8x slower |
| [str-short-scan](str-short-scan.ts) | `charCodeAt(i)` / `s[i]` scans of many short (< 512 byte) lines | 29.4 / 30.5 | 115 / 116 | 3.8x slower |
| [num-to-string](num-to-string.ts) | number/string conversion: `String(n)`, `toFixed`, `Number(str)`, `parseInt` | 98.0 / 101 | 441 / 447 | 4.4x slower |
| [stream-pipe](stream-pipe.ts) | `node:stream` `Readable` → `Transform` → `Writable` and `stream/web` `ReadableStream` / `TransformStream` throughput | 37.9 / 39.2 | 178 / 180 | 4.6x slower |
| [map-delete](map-delete.ts) | `Map<string, number>` insert/delete churn (an LRU-style sliding window) | 32.2 / 34.7 | 168 / 170 | 4.9x slower |
| [num-bitwise](num-bitwise.ts) | bitwise and, or, xor and shifts (`<<`, `>>`, `>>>`) on integers, and flag tests | 21.1 / 21.4 | 108 / 108 | 5.0x slower |
| [arr-for-of](arr-for-of.ts) | `for…of`, `forEach`, `find` / `findIndex` and `entries()` over arrays of objects | 55.0 / 55.7 | 278 / 283 | 5.1x slower |
| [set-algebra](set-algebra.ts) | `Set<string>` `add` / `has` and ES2025 set operations (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`) | 33.8 / 34.7 | 183 / 187 | 5.4x slower |
| [obj-keys-entries](obj-keys-entries.ts) | `Object.keys` / `values` / `entries` and `for…in` over typed objects and class instances | 74.6 / 75.1 | 468 / 468 | 6.2x slower |
| [union-typeof](union-typeof.ts) | `typeof`, `instanceof` and `Array.isArray` narrowing of a five-way union (string, number, boolean, class, array) | 48.9 / 49.7 | 303 / 308 | 6.2x slower |
| [fn-rest-spread](fn-rest-spread.ts) | rest parameters, spread arguments `f(...args)`, default parameters and `.call` / `.apply` / `.bind` | 71.9 / 72.8 | 495 / 501 | 6.9x slower |
| [class-accessors](class-accessors.ts) | getters and setters, static fields and `super.m()` calls on class instances | 9.4 / 9.8 | 66.9 / 68.6 | 7.0x slower |
| [gen-async](gen-async.ts) | `async function*` generators consumed with `for await…of` | 52.0 / 53.5 | 398 / 399 | 7.5x slower |
| [typed-array](typed-array.ts) | `Float64Array` / `Int32Array` / `Uint8Array` indexed loops, `subarray`, `set` and `fill` | 58.7 / 59.4 | 463 / 465 | 7.8x slower |
| [any-record-view](any-record-view.ts) | viewing an `any` object as `Record<string, any>` and reading keys through it | 5.4 / 6.0 | 49.4 / 50.2 | 8.4x slower |
| [typed-dataview](typed-dataview.ts) | `DataView` little- and big-endian integer and float reads and writes over an `ArrayBuffer` | 27.0 / 27.5 | 233 / 234 | 8.5x slower |
| [events-emit](events-emit.ts) | `EventEmitter` `emit` to listeners taking 0, 1 and 2 arguments | 69.4 / 70.3 | 627 / 628 | 8.9x slower |
| [bigint-arith](bigint-arith.ts) | `bigint` `+`, `*`, `%` and shifts (Fibonacci mod a prime, modular exponentiation) | 70.6 / 72.1 | 682 / 701 | 9.7x slower |
| [gen-next](gen-next.ts) | generators driven by hand (`.next()`), spread `[...gen()]` and stored in a variable before `for…of` | 44.0 / 44.8 | 449 / 454 | 10.1x slower |
| [iter-helpers](iter-helpers.ts) | ES2025 iterator helpers (`filter` / `map` / `take` / `drop` / `reduce` / `toArray`) on generators and `Iterator.from(array)` | 66.0 / 66.7 | 682 / 686 | 10.3x slower |
| [num-hash-imul](num-hash-imul.ts) | FNV-1a and murmur-style string hashing with `Math.imul`, `>>> 0` and `charCodeAt` | 70.0 / 71.9 | 821 / 833 | 11.6x slower |
| [str-unicode](str-unicode.ts) | `length`, `charCodeAt`, `codePointAt` and `slice` on non-ASCII text (UTF-16 indexes) | 71.8 / 72.5 | 967 / 989 | 13.6x slower |
| [async-promise-all](async-promise-all.ts) | `Promise.all` fan-out, `new Promise` + `.then` chains and `queueMicrotask` (the general async path) | 62.8 / 63.3 | 1026 / 1038 | 16.4x slower |
| [wasm-call](wasm-call.ts) | calls from TypeScript into WebAssembly exports (i32 / f64 arithmetic, memory loads) and reads of the exported memory | 38.7 / 39.3 | 1281 / 1286 | 32.7x slower |
| [async-await](async-await.ts) | `await` chains of async functions that resolve immediately | 99.3 / 105 | 5540 / 5543 (3 runs) | 52.7x slower |
| [any-dynamic](any-dynamic.ts) | property reads and writes on `any` objects (nested objects, arrays) | 51.1 / 51.7 | 4107 / 4179 (4 runs) | 80.8x slower |
<!-- perf-results:end -->
