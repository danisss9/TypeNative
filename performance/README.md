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

Last run 2026-11-19 (new probes added): Windows_NT 10.0.26300, AMD Ryzen 5 7600 6-Core Processor, Node v26.13.0, go1.27.4 windows/amd64, TypeNative 0.7.1, 7 interleaved runs per probe.

| Probe | Measures | Node ms (min / median) | TypeNative ms (min / median) | TypeNative vs Node (median) |
| ----- | -------- | ---------------------: | ---------------------------: | :-------------------------- |
| [any-dynamic](any-dynamic.ts) | property reads and writes on `any` objects (nested objects, arrays) | 50.3 / 51.0 | 5924 / 5956 (3 runs) | 116.8x slower |
| [any-record-view](any-record-view.ts) | viewing an `any` object as `Record<string, any>` and reading keys through it | 5.3 / 6.1 | 50.9 / 51.9 | 8.5x slower |
| [arr-for-of](arr-for-of.ts) | `for…of`, `forEach`, `find` / `findIndex` and `entries()` over arrays of objects | 53.8 / 54.7 | 270 / 275 | 5.0x slower |
| [arr-hof](arr-hof.ts) | `map` / `filter` / `reduce` / `some` chains with closure callbacks | 86.9 / 87.7 | 27.1 / 28.2 | **3.1x faster** |
| [arr-push-index](arr-push-index.ts) | `push`, indexed reads/writes and `length` on number arrays | 50.8 / 52.8 | 47.8 / 49.4 | **1.1x faster** |
| [arr-push-local](arr-push-local.ts) | building many short arrays with `push` inside functions (locals and fields of new objects) | 138 / 139 | 310 / 317 | 2.3x slower |
| [arr-slice-concat](arr-slice-concat.ts) | `slice`, `splice`, `concat`, `[...a, ...b]`, `includes` and `indexOf` on arrays | 109 / 110 | 117 / 119 | 1.1x slower |
| [arr-sort](arr-sort.ts) | `sort` of numbers with a comparator and of strings in default order | 105 / 116 | 308 / 314 | 2.7x slower |
| [async-als](async-als.ts) | `node:async_hooks` `AsyncLocalStorage` `run` and `getStore` across sync and `async` / `await` calls | 51.0 / 52.7 | 151 / 153 | 2.9x slower |
| [async-await](async-await.ts) | `await` chains of async functions that resolve immediately | 97.6 / 99.4 | 200 / 202 | 2.0x slower |
| [async-promise-all](async-promise-all.ts) | `Promise.all` fan-out, `new Promise` + `.then` chains and `queueMicrotask` (the general async path) | 61.7 / 63.3 | 689 / 696 | 11.0x slower |
| [bigint-arith](bigint-arith.ts) | `bigint` `+`, `*`, `%` and shifts (Fibonacci mod a prime, modular exponentiation) | 70.4 / 72.1 | 686 / 698 | 9.7x slower |
| [buf-encode](buf-encode.ts) | `Buffer` integer reads and writes, `hex` / `base64` / `utf8` conversion, `Buffer.concat`, `Uint8Array` `toHex` / `fromBase64` and `TextEncoder` / `TextDecoder` | 78.6 / 81.0 | 94.2 / 97.5 | 1.2x slower |
| [class-accessors](class-accessors.ts) | getters and setters, static fields and `super.m()` calls on class instances | 9.6 / 9.7 | 2836 / 2859 (6 runs) | 294.9x slower |
| [class-dispatch](class-dispatch.ts) | virtual method calls through an abstract base class and an interface | 67.0 / 69.3 | 121 / 122 | 1.8x slower |
| [crypto-hash-cipher](crypto-hash-cipher.ts) | `node:crypto` `createHash('sha256')`, `createHmac` and AES-256-GCM `createCipheriv` / `createDecipheriv` | 71.7 / 73.0 | 36.2 / 38.1 | **1.9x faster** |
| [date-format](date-format.ts) | `new Date(ms)`, UTC getters, `toISOString` and `Date.parse` (timestamps in log lines) | 82.5 / 83.5 | 30.5 / 31.6 | **2.6x faster** |
| [events-emit](events-emit.ts) | `EventEmitter` `emit` to listeners taking 0, 1 and 2 arguments | 69.2 / 70.7 | 621 / 627 | 8.9x slower |
| [exc-throw-rare](exc-throw-rare.ts) | `try`/`catch`/`finally` in a hot loop where nothing throws | 191 / 193 | 243 / 245 | 1.3x slower |
| [exc-try-catch](exc-try-catch.ts) | `try`/`catch`/`finally` in a hot loop where one call in 1,024 throws | 23.3 / 23.9 | 62.1 / 63.3 | 2.6x slower |
| [fn-closures](fn-closures.ts) | creating closures over mutable state and calling them indirectly | 140 / 141 | 34.9 / 36.5 | **3.9x faster** |
| [fn-recursion-tree](fn-recursion-tree.ts) | building and walking binary trees (recursion plus allocation) | 99.2 / 100 | 148 / 150 | 1.5x slower |
| [fn-rest-spread](fn-rest-spread.ts) | rest parameters, spread arguments `f(...args)`, default parameters and `.call` / `.apply` / `.bind` | 72.1 / 72.7 | 444 / 449 | 6.2x slower |
| [gen-async](gen-async.ts) | `async function*` generators consumed with `for await…of` | 53.0 / 54.1 | 453 / 488 | 9.0x slower |
| [gen-for-of](gen-for-of.ts) | sync generators (a method, `*[Symbol.iterator]()`, `yield*`) consumed by `for…of` | 51.4 / 51.8 | 11.8 / 12.2 | **4.2x faster** |
| [gen-next](gen-next.ts) | generators driven by hand (`.next()`), spread `[...gen()]` and stored in a variable before `for…of` | 44.0 / 44.8 | 449 / 454 | 10.1x slower |
| [intl-format](intl-format.ts) | `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.Collator` formatting and comparison | 53.1 / 53.9 | 180 / 183 | 3.4x slower |
| [iter-helpers](iter-helpers.ts) | ES2025 iterator helpers (`filter` / `map` / `take` / `drop` / `reduce` / `toArray`) on generators and `Iterator.from(array)` | 65.9 / 67.0 | 1042 / 1061 | 15.8x slower |
| [json-any](json-any.ts) | `JSON.parse` into `any` and walking the result, `JSON.stringify` of objects built as `any` | 66.0 / 67.4 | 276 / 280 | 4.2x slower |
| [json-roundtrip](json-roundtrip.ts) | `JSON.stringify` and `JSON.parse` of an array of nested objects | 37.5 / 38.4 | 76.7 / 78.4 | 2.0x slower |
| [map-delete](map-delete.ts) | `Map<string, number>` insert/delete churn (an LRU-style sliding window) | 29.9 / 35.3 | 167 / 170 | 4.8x slower |
| [map-iterate](map-iterate.ts) | iterating a `Map` (`for…of` entries, `forEach`, `[...values()]`), also after deletes | 85.7 / 87.1 | 229 / 231 | 2.7x slower |
| [map-number-keys](map-number-keys.ts) | `Map<number, T>` lookups by integer id and memoization | 107 / 108 | 165 / 169 | 1.6x slower |
| [map-object-keys](map-object-keys.ts) | `Map<object, number>` `set` / `get` / `has` / `delete` using object-identity keys | 47.1 / 51.4 | 135 / 137 | 2.7x slower |
| [map-string-keys](map-string-keys.ts) | `Map<string, number>` `set` / `get` / `has` word counting | 90.2 / 91.8 | 118 / 119 | 1.3x slower |
| [map-weak](map-weak.ts) | `WeakMap` and `WeakSet` `set` / `get` / `has` / `add` on object instances | 45.2 / 45.5 | 71.0 / 72.3 | 1.6x slower |
| [num-arith-loop](num-arith-loop.ts) | tight float64 loop with `%`, `*` and `Math.floor` | 73.1 / 73.7 | 155 / 157 | 2.1x slower |
| [num-bitwise](num-bitwise.ts) | bitwise and, or, xor and shifts (`<<`, `>>`, `>>>`) on integers, and flag tests | 20.8 / 21.8 | 108 / 109 | 5.0x slower |
| [num-hash-imul](num-hash-imul.ts) | FNV-1a and murmur-style string hashing with `Math.imul`, `>>> 0` and `charCodeAt` | 69.2 / 71.1 | 787 / 791 | 11.1x slower |
| [num-mod-int](num-mod-int.ts) | `%` on integer operands (hash buckets, cycling indexes) | 60.0 / 60.5 | 175 / 180 | 3.0x slower |
| [num-to-string](num-to-string.ts) | number/string conversion: `String(n)`, `toFixed`, `Number(str)`, `parseInt` | 97.8 / 101 | 390 / 404 | 4.0x slower |
| [obj-alloc](obj-alloc.ts) | allocating many short-lived object literals and class instances | 61.9 / 63.5 | 182 / 183 | 2.9x slower |
| [obj-clone](obj-clone.ts) | `structuredClone` of nested objects, arrays, `Map`, `Set`, `Date` and `Uint8Array` | 102 / 102 | 128 / 129 | 1.3x slower |
| [obj-keys-entries](obj-keys-entries.ts) | `Object.keys` / `values` / `entries` and `for…in` over typed objects and class instances | 74.2 / 75.2 | 1041 / 1053 | 14.0x slower |
| [obj-optional-chain](obj-optional-chain.ts) | `?.` and `??` walking nullable links and optional fields | 47.0 / 48.7 | 169 / 171 | 3.5x slower |
| [obj-record-dict](obj-record-dict.ts) | a `Record<string, number>` object literal used as a dictionary (`rec[k] ?? 0`, `k in rec`, `Object.keys`) | 79.3 / 84.6 | 108 / 111 | 1.3x slower |
| [obj-spread-destructure](obj-spread-destructure.ts) | object spread `{ ...p, x }`, destructuring with defaults, and array-destructuring swaps | 50.6 / 51.5 | 1547 / 1555 (10 runs) | 30.2x slower |
| [regex-backtrack](regex-backtrack.ts) | backtracking RegExp (lookahead, lookbehind, backreferences) `test`, `exec` and `replace` | 61.0 / 62.6 | 214 / 216 | 3.4x slower |
| [regex-exec](regex-exec.ts) | regex `test`, `exec` with groups and global `replace` over log lines | 63.9 / 65.8 | 100 / 102 | 1.6x slower |
| [regex-replace-fn](regex-replace-fn.ts) | `replace` with a callback, `matchAll` with groups and `split` on a regex | 69.9 / 70.4 | 77.2 / 79.1 | 1.1x slower |
| [regex-site](regex-site.ts) | `/g` regex literals evaluated inside a hot function, and `.index` on long input | 67.7 / 69.5 | 155 / 158 | 2.3x slower |
| [set-algebra](set-algebra.ts) | `Set<string>` `add` / `has` and ES2025 set operations (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`) | 34.3 / 35.1 | 372 / 375 | 10.7x slower |
| [set-ops](set-ops.ts) | `Set<number>` `add` / `has` / `delete` on a 16,384-entry set | 36.5 / 37.3 | 86.8 / 89.4 | 2.4x slower |
| [sqlite-query](sqlite-query.ts) | `node:sqlite` `DatabaseSync(':memory:')` prepared bulk inserts and indexed `SELECT` queries | 39.4 / 40.1 | 87.7 / 90.0 | 2.2x slower |
| [str-char-scan](str-char-scan.ts) | lexer-style scan of a large string with `charCodeAt` and `str[i]` | 76.8 / 77.5 | 320 / 324 | 4.2x slower |
| [str-concat](str-concat.ts) | growing ~20 KB strings with `s += x` and `s = s + …` (each pass starts empty) | 9.8 / 10.2 | 22.5 / 24.0 | 2.4x slower |
| [str-concat-plus](str-concat-plus.ts) | growing strings with `s = s + x` (not `+=`), each pass starting empty | 28.1 / 29.4 | 92.1 / 95.4 | 3.2x slower |
| [str-methods](str-methods.ts) | `startsWith` / `endsWith` / `includes`, case conversion, `padStart`, `repeat` and `replaceAll` with a string | 66.3 / 67.0 | 110 / 113 | 1.7x slower |
| [str-short-scan](str-short-scan.ts) | `charCodeAt(i)` / `s[i]` scans of many short (< 512 byte) lines | 29.9 / 30.7 | 199 / 201 | 6.5x slower |
| [str-split-join](str-split-join.ts) | `split`, `join`, `indexOf`, `slice` and `trim` on CSV-like lines | 55.3 / 56.6 | 36.6 / 38.5 | **1.5x faster** |
| [str-switch-compare](str-switch-compare.ts) | `switch` over string values and `===` / `<` string comparisons (keyword lookup) | 88.6 / 90.7 | 92.4 / 93.8 | 1.0x slower |
| [str-template](str-template.ts) | template literals mixing strings, integers, floats and booleans | 51.0 / 51.5 | 81.0 / 82.2 | 1.6x slower |
| [str-unicode](str-unicode.ts) | `length`, `charCodeAt`, `codePointAt` and `slice` on non-ASCII text (UTF-16 indexes) | 68.0 / 71.0 | 1280 / 1302 (12 runs) | 18.3x slower |
| [stream-pipe](stream-pipe.ts) | `node:stream` `Readable` → `Transform` → `Writable` and `stream/web` `ReadableStream` / `TransformStream` throughput | 39.9 / 40.6 | 181 / 184 | 4.5x slower |
| [temporal-arith](temporal-arith.ts) | `Temporal.PlainDateTime` and `Temporal.Instant` parsing, `add`, `until` and comparisons | 38.7 / 40.1 | 19.5 / 20.5 | **2.0x faster** |
| [typed-array](typed-array.ts) | `Float64Array` / `Int32Array` / `Uint8Array` indexed loops, `subarray`, `set` and `fill` | 58.7 / 60.2 | 463 / 466 | 7.7x slower |
| [typed-dataview](typed-dataview.ts) | `DataView` little- and big-endian integer and float reads and writes over an `ArrayBuffer` | 28.1 / 29.2 | 584 / 586 | 20.1x slower |
| [union-switch](union-switch.ts) | evaluating an expression tree of a discriminated union with `switch (e.kind)` | 90.7 / 95.1 | 309 / 339 | 3.6x slower |
| [union-typeof](union-typeof.ts) | `typeof`, `instanceof` and `Array.isArray` narrowing of a five-way union (string, number, boolean, class, array) | 49.0 / 49.4 | 415 / 421 | 8.5x slower |
| [url-path](url-path.ts) | `new URL`, `URLSearchParams` parsing/serialization and `node:path` `join` / `resolve` / `relative` / `parse` | 147 / 149 | 116 / 116 | **1.3x faster** |
| [wasm-call](wasm-call.ts) | calls from TypeScript into WebAssembly exports (i32 / f64 arithmetic, memory loads) and reads of the exported memory | 38.9 / 39.2 | 1579 / 1589 (10 runs) | 40.5x slower |
| [zlib-compress](zlib-compress.ts) | `node:zlib` `gzipSync` / `gunzipSync`, `brotliCompressSync` / `brotliDecompressSync` and `zstdCompressSync` / `zstdDecompressSync` | 163 / 165 | 238 / 243 | 1.5x slower |

<!-- perf-results:end -->
