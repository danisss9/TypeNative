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
`gen`, `iter`, `regex`, `json`, `date`, `exc`, `events`, `async`, `wasm`.

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
- To find out *why* a probe (or any program) is slow, build it with `--profile`:
  the binary writes a CPU profile to `$TYPENATIVE_CPUPROFILE` (default
  `cpu.pprof`) when it exits. Read it with `go tool pprof -top -cum <exe> <profile>`.
  For example, `node bin/cli.js --source performance/num-bitwise.ts --output bw.exe --profile`.
  `--emit-go <dir>` shows the Go the profile's lines refer to.

## Results

<!-- perf-results:start -->

Last run 2026-11-17: Windows_NT 10.0.26300, AMD Ryzen 5 7600 6-Core Processor, Node v26.13.0, go1.27.4 windows/amd64, TypeNative 0.7.0, 15 interleaved runs per probe.

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
| [async-await](async-await.ts) | `await` chains of async functions that resolve immediately | 97.6 / 99.4 | 200 / 202 | 2.0x slower |
| [async-promise-all](async-promise-all.ts) | `Promise.all` fan-out, `new Promise` + `.then` chains and `queueMicrotask` (the general async path) | 61.7 / 63.3 | 689 / 696 | 11.0x slower |
| [bigint-arith](bigint-arith.ts) | `bigint` `+`, `*`, `%` and shifts (Fibonacci mod a prime, modular exponentiation) | 70.4 / 72.1 | 686 / 698 | 9.7x slower |
| [buf-encode](buf-encode.ts) | `Buffer` integer reads and writes, `hex` / `base64` / `utf8` conversion, `Buffer.concat`, `Uint8Array` `toHex` / `fromBase64` and `TextEncoder` / `TextDecoder` | 78.6 / 81.0 | 94.2 / 97.5 | 1.2x slower |
| [class-accessors](class-accessors.ts) | getters and setters, static fields and `super.m()` calls on class instances | 9.6 / 9.7 | 2836 / 2859 (6 runs) | 294.9x slower |
| [class-dispatch](class-dispatch.ts) | virtual method calls through an abstract base class and an interface | 67.0 / 69.3 | 121 / 122 | 1.8x slower |
| [date-format](date-format.ts) | `new Date(ms)`, UTC getters, `toISOString` and `Date.parse` (timestamps in log lines) | 82.5 / 83.5 | 30.5 / 31.6 | **2.6x faster** |
| [events-emit](events-emit.ts) | `EventEmitter` `emit` to listeners taking 0, 1 and 2 arguments | 69.2 / 70.7 | 621 / 627 | 8.9x slower |
| [exc-throw-rare](exc-throw-rare.ts) | `try`/`catch`/`finally` in a hot loop where nothing throws | 191 / 193 | 243 / 245 | 1.3x slower |
| [exc-try-catch](exc-try-catch.ts) | `try`/`catch`/`finally` in a hot loop where one call in 1,024 throws | 23.3 / 23.9 | 62.1 / 63.3 | 2.6x slower |
| [fn-closures](fn-closures.ts) | creating closures over mutable state and calling them indirectly | 140 / 141 | 34.9 / 36.5 | **3.9x faster** |
| [fn-recursion-tree](fn-recursion-tree.ts) | building and walking binary trees (recursion plus allocation) | 99.2 / 100 | 148 / 150 | 1.5x slower |
| [fn-rest-spread](fn-rest-spread.ts) | rest parameters, spread arguments `f(...args)`, default parameters and `.call` / `.apply` / `.bind` | 72.1 / 72.7 | 444 / 449 | 6.2x slower |
| [gen-for-of](gen-for-of.ts) | sync generators (a method, `*[Symbol.iterator]()`, `yield*`) consumed by `for…of` | 51.4 / 51.8 | 11.8 / 12.2 | **4.2x faster** |
| [gen-next](gen-next.ts) | generators driven by hand (`.next()`), spread `[...gen()]` and stored in a variable before `for…of` | 44.0 / 44.8 | 449 / 454 | 10.1x slower |
| [iter-helpers](iter-helpers.ts) | ES2025 iterator helpers (`filter` / `map` / `take` / `drop` / `reduce` / `toArray`) on generators and `Iterator.from(array)` | 65.9 / 67.0 | 1042 / 1061 | 15.8x slower |
| [json-any](json-any.ts) | `JSON.parse` into `any` and walking the result, `JSON.stringify` of objects built as `any` | 66.0 / 67.4 | 276 / 280 | 4.2x slower |
| [json-roundtrip](json-roundtrip.ts) | `JSON.stringify` and `JSON.parse` of an array of nested objects | 37.5 / 38.4 | 76.7 / 78.4 | 2.0x slower |
| [map-delete](map-delete.ts) | `Map<string, number>` insert/delete churn (an LRU-style sliding window) | 29.9 / 35.3 | 167 / 170 | 4.8x slower |
| [map-iterate](map-iterate.ts) | iterating a `Map` (`for…of` entries, `forEach`, `[...values()]`), also after deletes | 85.7 / 87.1 | 229 / 231 | 2.7x slower |
| [map-number-keys](map-number-keys.ts) | `Map<number, T>` lookups by integer id and memoization | 107 / 108 | 165 / 169 | 1.6x slower |
| [map-string-keys](map-string-keys.ts) | `Map<string, number>` `set` / `get` / `has` word counting | 90.2 / 91.8 | 118 / 119 | 1.3x slower |
| [num-arith-loop](num-arith-loop.ts) | tight float64 loop with `%`, `*` and `Math.floor` | 73.1 / 73.7 | 155 / 157 | 2.1x slower |
| [num-bitwise](num-bitwise.ts) | bitwise and, or, xor and shifts (`<<`, `>>`, `>>>`) on integers, and flag tests | 20.8 / 21.8 | 108 / 109 | 5.0x slower |
| [num-hash-imul](num-hash-imul.ts) | FNV-1a and murmur-style string hashing with `Math.imul`, `>>> 0` and `charCodeAt` | 69.2 / 71.1 | 787 / 791 | 11.1x slower |
| [num-mod-int](num-mod-int.ts) | `%` on integer operands (hash buckets, cycling indexes) | 60.0 / 60.5 | 175 / 180 | 3.0x slower |
| [num-to-string](num-to-string.ts) | number/string conversion: `String(n)`, `toFixed`, `Number(str)`, `parseInt` | 97.8 / 101 | 390 / 404 | 4.0x slower |
| [obj-alloc](obj-alloc.ts) | allocating many short-lived object literals and class instances | 61.9 / 63.5 | 182 / 183 | 2.9x slower |
| [obj-keys-entries](obj-keys-entries.ts) | `Object.keys` / `values` / `entries` and `for…in` over typed objects and class instances | 74.2 / 75.2 | 1041 / 1053 | 14.0x slower |
| [obj-optional-chain](obj-optional-chain.ts) | `?.` and `??` walking nullable links and optional fields | 47.0 / 48.7 | 169 / 171 | 3.5x slower |
| [obj-record-dict](obj-record-dict.ts) | a `Record<string, number>` object literal used as a dictionary (`rec[k] ?? 0`, `k in rec`, `Object.keys`) | 79.3 / 84.6 | 108 / 111 | 1.3x slower |
| [obj-spread-destructure](obj-spread-destructure.ts) | object spread `{ ...p, x }`, destructuring with defaults, and array-destructuring swaps | 50.6 / 51.5 | 1547 / 1555 (10 runs) | 30.2x slower |
| [regex-exec](regex-exec.ts) | regex `test`, `exec` with groups and global `replace` over log lines | 63.9 / 65.8 | 100 / 102 | 1.6x slower |
| [regex-replace-fn](regex-replace-fn.ts) | `replace` with a callback, `matchAll` with groups and `split` on a regex | 69.9 / 70.4 | 77.2 / 79.1 | 1.1x slower |
| [regex-site](regex-site.ts) | `/g` regex literals evaluated inside a hot function, and `.index` on long input | 67.7 / 69.5 | 155 / 158 | 2.3x slower |
| [set-ops](set-ops.ts) | `Set<number>` `add` / `has` / `delete` on a 16,384-entry set | 36.5 / 37.3 | 86.8 / 89.4 | 2.4x slower |
| [str-char-scan](str-char-scan.ts) | lexer-style scan of a large string with `charCodeAt` and `str[i]` | 76.8 / 77.5 | 320 / 324 | 4.2x slower |
| [str-concat](str-concat.ts) | growing ~20 KB strings with `s += x` and `s = s + …` (each pass starts empty) | 9.8 / 10.2 | 22.5 / 24.0 | 2.4x slower |
| [str-concat-plus](str-concat-plus.ts) | growing strings with `s = s + x` (not `+=`), each pass starting empty | 28.1 / 29.4 | 92.1 / 95.4 | 3.2x slower |
| [str-methods](str-methods.ts) | `startsWith` / `endsWith` / `includes`, case conversion, `padStart`, `repeat` and `replaceAll` with a string | 66.3 / 67.0 | 110 / 113 | 1.7x slower |
| [str-short-scan](str-short-scan.ts) | `charCodeAt(i)` / `s[i]` scans of many short (< 512 byte) lines | 29.9 / 30.7 | 199 / 201 | 6.5x slower |
| [str-split-join](str-split-join.ts) | `split`, `join`, `indexOf`, `slice` and `trim` on CSV-like lines | 55.3 / 56.6 | 36.6 / 38.5 | **1.5x faster** |
| [str-switch-compare](str-switch-compare.ts) | `switch` over string values and `===` / `<` string comparisons (keyword lookup) | 88.6 / 90.7 | 92.4 / 93.8 | 1.0x slower |
| [str-template](str-template.ts) | template literals mixing strings, integers, floats and booleans | 51.0 / 51.5 | 81.0 / 82.2 | 1.6x slower |
| [str-unicode](str-unicode.ts) | `length`, `charCodeAt`, `codePointAt` and `slice` on non-ASCII text (UTF-16 indexes) | 68.0 / 71.0 | 1280 / 1302 (12 runs) | 18.3x slower |
| [typed-array](typed-array.ts) | `Float64Array` / `Int32Array` / `Uint8Array` indexed loops, `subarray`, `set` and `fill` | 58.7 / 60.2 | 463 / 466 | 7.7x slower |
| [union-switch](union-switch.ts) | evaluating an expression tree of a discriminated union with `switch (e.kind)` | 90.7 / 95.1 | 309 / 339 | 3.6x slower |
| [union-typeof](union-typeof.ts) | `typeof`, `instanceof` and `Array.isArray` narrowing of a five-way union (string, number, boolean, class, array) | 49.0 / 49.4 | 415 / 421 | 8.5x slower |
| [wasm-call](wasm-call.ts) | calls from TypeScript into WebAssembly exports (i32 / f64 arithmetic, memory loads) and reads of the exported memory | 38.9 / 39.2 | 1579 / 1589 (10 runs) | 40.5x slower |

<!-- perf-results:end -->

## Findings

Causes behind the worst rows. Each one is checked against the generated Go
(`--emit-go`), a `--profile` CPU profile, or the runtime source in
[src/transpiler.ts](../src/transpiler.ts). Update this section when a fix
lands or a new cause is confirmed. Before/after figures are native medians on
the reference machine.

### Fixed

| Probe | Cause | Fix | Before → after |
| ----- | ----- | --- | -------------- |
| `num-bitwise` (and every probe that uses `&`) | Every bitwise operand went through `TnInt32`, which called `math.Mod(f, 2^32)`: about 90% of the probe's time. | `TnInt32` converts in-range values directly and falls back to `math.Mod` only past ±2^63. Literal operands fold at compile time, and nested bitwise expressions stay `int32` between operators. | 2160 → 129 ms |
| `num-arith-loop`, `num-mod-int` | `a % b` compiled to `math.Mod`, whose cost grows with the exponent gap between the operands (about 150 ns for `2e8 % 13`). | `TnMod`: an `int64` remainder when both operands are integers that fit, keeping a `-0` result; `math.Mod` otherwise. | 4527 → 162 ms; 2827 → 188 ms |
| `gen-for-of` | A generator ran as a goroutine sending on a channel, in lockstep with the loop: two goroutine hand-offs and two `sync.Map` lookups per value. | A sync generator also compiles to a push form, `name__seq(args)`: a Go range function whose `yield` runs the loop body. `for…of` over a direct generator call (or a class's `*[Symbol.iterator]()`) uses it. A break unwinds the generator through its `finally` blocks, and a throw from the loop body passes its `catch` clauses, as in JS. `.next()`, spread and stored generators keep the channel form. | 1843 → 12 ms |
| `set-ops`, `map-delete` | `TnMap.Delete` scanned and spliced the insertion-order key slice, so each delete was O(size). Every `Get`/`Has`/`Set` also called `reflect.TypeFor[K]().Kind()`. | Deletes mark the key's slot dead in O(1) (an index map built on the first delete of a map past 16 keys) and dead slots are compacted before keys are read. The key-kind check is made once per map. | 1556 → 97 ms; 367 → 167 ms |
| `any-record-view` | Viewing an `any` object as `Record<string, any>` rebuilt it through reflection on every conversion. | `TnRecordOf` wraps the object's own map in a `TnMap` (writes through the record reach the object, as in JS). | 1696 → 273 ms |
| `str-concat`, `str-concat-plus` | `s = s + a + b` compiled to Go string concatenation, which copies all of `s`: O(n²) for a growing string. `TnStrAppend` also locked with `defer`. | `s = s + …` on a string variable or field (the target as the leftmost operand) compiles to `TnStrAppend`, like `s += …`, and the lock no longer uses `defer`. | 51.5 → 26.4 ms; 3365 → 101 ms |
| `str-short-scan` | For strings under 512 bytes, `charCodeAt(i)` rescanned `s[:i+1]` for ASCII and `s.length` rescanned all of `s`, so walking a line was O(n²). | The ASCII answer for the last short string asked about is remembered (the entry holds the string). Indexes under 64 still scan their few bytes. | 300 → 196 ms |
| `any-dynamic` | Reads of `any` objects missed the field-plan table and went through accessor and reflect checks before reaching the map. Writes boxed every value through `reflect.ValueOf`. | `TnGetRef`/`TnGetPeek` read a `map[string]interface{}` first. `tnBoxArray` returns scalars and maps without reflect. | 3812 → 2501 ms |
| `num-to-string` | `toFixed` formatted 1100 digits on every call to round exactly. | `strconv` already rounds to nearest. Only a value exactly on a tie (its last binary fraction digit at 2^-(d+1)) takes the exact path. | 667 → 416 ms |
| `events-emit` | `TnInvoke` called every listener through `reflect.Value.Call`. `emit` copied the listener list and built a `kept` list on every call. | Typed fast paths for `func()`, `func(any)`, `func(any, any)`, `func(...any)`, `func(float64)` and `func(string)`. `emit` uses the copy-on-write listener slice as its snapshot. | 1372 → 658 ms |
| `regex-site` | Each evaluation of a regex literal looked its compiled program up again (key concatenation and a mutex). | One package-level `TnRegexSite` per literal shares the program and RE2 fallbacks. Each evaluation is still a new `RegExp` with its own `lastIndex`. | 177 → 168 ms |
| `gen-for-of` (examples) | Generators called through dynamic dispatch (`unit.ops()` on an abstract `CompilationUnit`, 26 phases of angular-templates) still ran as goroutines, and `for…of` over them collected every value first; spread and `Array.from` of a generator received through reflect. | `TnCallSeq_<m>[T]` dispatches a generator method on a dynamic receiver to the class's push form (its channel in lockstep for a generator without one, any other value's elements otherwise), for `for…of`, `yield*` and `super.m()`. A spread or `Array.from` of a generator call collects its push form into a typed slice (`TnGeneratorItems`). | angular-templates at 64 KB: 721 → 601 ms |
| `gen-for-of` (examples) | `Array.from` / spread over a class iterator reached through a dynamic field (`op.handlerOps`, `op.trackByOps` in angular-templates) found `*[Symbol.iterator]()` with `reflect.MethodByName`, called it, and drained its channel on a goroutine: one reflective call and two goroutine hand-offs per operation list. | `TnToArray` asserts the class's push form directly (`Symbol_iterator__seq`, a `func(func(T) bool)`) and iterates it in place; an interface-yield channel method gets its own type assertion too, without reflection. | angular-templates at 64 KB: 601 → 305 ms |
| `class-dispatch` | A call on an abstract base class or an interface went through `TnCall_<m>(recv, args ...interface{})`: arguments and the result boxed, then unboxed with `TnAs`. | When every class of the receiver's declared hierarchy declares the method with the same Go signature, the call goes through `TnCall_<C>_<m>(recv, a P0, …) R`: a type switch calling the method with its own types, the boxed dispatcher only for any other receiver. The call's inferred type is `R`, so the value isn't boxed again where it's used. | 709 → 124 ms |
| `async-await` | Each async call started a goroutine and handed the JS baton over twice, and each settle allocated two wake-up channels even with nobody waiting. | An async function that awaits only calls of other such functions (whose promises are settled when they return), with no `for await` and no promise returned, runs on the caller's goroutine (`TnRunAsyncInline`). `TnAsyncSend` / `TnAsyncClose` allocate a wake-up channel only for a parked awaiter. | 1985 → 201 ms |
| `json-roundtrip` | `JSON.parse` built a `TnMap` per object from `encoding/json` tokens, then `as Item[]` converted every map to a struct through `TnConvertDynamic`. | `JSON.parse(text)` into a typed slot is `TnJSONParseTyped[T]`: a scanner decodes the text straight into `T` (per-type plans over field offsets) when every object has `T`'s keys in its field order and every value its kind; anything else (other keys, null, any fields, invalid text) decodes and converts as before. | 347 → 97 ms |
| `num-bitwise` | Loop counters and flag locals were `float64`, so every bitwise operand converted float64 to int32 through `TnInt32`. | A `for` loop's `let` counter (an integer literal start, `++` / `--`, never written in the body) is a Go `int`, and a block `const` holding a bitwise result an `int32`, when every read is an arithmetic, comparison, bitwise, index or template operand: reads are `float64(i)`, bitwise operands take the integer directly. | 128 → 114 ms |
| `any-record-view` | `TnRecordOf` still listed the object's keys on every view: it ranged the Go map, sorted the keys and scanned each one for an array index (71% of the probe), though a record read by key never needs them. | A view lists its keys the first time something reads them (`Object.keys`, `for…in`, a delete, a new key, `size`). A key added through the `any` object before then is listed too, as in JS. | 263 → 96.5 ms |
| `arr-push-index` | A regression: single-value pushes became `x = TnPush(x, v)` (2x growth, for yaml-cli), which stores the whole slice header, with a GC write barrier, on every push. `x = append(x, v)` writes only the length while there is spare capacity. | A push onto a variable or field is `TnPushTo(&x, v)`, which keeps the 2x growth and stores the slice only when it grows. A map's value (`m[k]`), spreads and several values keep the assignment. [arr-push-local](arr-push-local.ts) covers short local and field arrays. | 105 → 49.2 ms |

### Open

| Probe | Cause | Status |
| ----- | ----- | ------ |
| `any-dynamic` | What remains is the representation: an `any` object is a Go `map[string]interface{}`, so every property access hashes its key (`memHashAES` and map lookups are about 45%), where V8 reads a slot through a hidden class. | open |
| `any-record-view` | With the keys listed lazily, what remains is a `TnMap` allocated per view (the constructor is over Go's inlining budget, so it can't stay on the stack) and each value read as `any` and converted with `TnAs`. | open |
| `events-emit` | Listener shapes other than the fast paths (here `(a: number, b: string)`) still go through `reflect.Value.Call` (about a third), and each `emit` hashes the event name. | open |
| `str-short-scan`, `str-char-scan` | Indexes under 64 still rescan their prefix for ASCII (`tnStrIsASCII` is 40% of `str-short-scan`). A loop over `s.charCodeAt(i)` could test `s` once before the loop. | open |
| `num-mod-int`, `num-bitwise` | Integer loop counters are Go `int`s now, but `%` still runs on `float64` (`TnMod` converts both operands and checks them, then divides with `idiv`), and other integral locals (`k = (k + i) % 97`, module constants such as `F_A = 1 << 0`) stay `float64`. A `TnMod` by a constant divisor would let Go multiply instead of divide, but any fallback call puts the helper over Go's inlining budget; it would have to be emitted inline. | open |
| `class-accessors` | A getter or setter on a receiver whose declared class has subclasses compiles to `TnGetRef(c, "value")` / `TnSet(c, "value", …)`, which finds `Get_value` / `Set_value` with `reflect.MethodByName` and calls it through `reflect.Value.Call` on every access (about 80%). Methods on such receivers already get a typed `TnCall_<C>_<m>`; accessors don't. | open |
| `obj-keys-entries` | `Object.keys` / `values` / `entries` of a struct rebuild its property list through reflection on every call (`tnStructProps` → `tnCollectStructProps`, about 60%, mostly `reflect.(*rtype).Field`), and box each value. | open |
| `obj-spread-destructure` | `{ ...base, x }` into a typed object goes through `TnAssignTo` (54%): the source's own properties are collected into a new Go map (`tnOwnProps`), then each is set by name through reflection (`tnAssignFields` → `tnFieldByKey`). | open |
| `str-unicode` | `s.length` of a short non-ASCII string builds its UTF-16 position index again on each call (`TnStrLength` → `tnStrCount` → `tnStrIndexOf`, about 45%, plus the allocations behind most GC time). The long string's `charCodeAt` reuses its index (16%). | open |
| `async-promise-all` | `new Promise` resolved from `queueMicrotask`, `Promise.all` and `.then` take the goroutine path (`TnStartAsync`, channel sends, `selectgo`, waking OS threads with `wakep` / `startm`); `TnRunAsyncInline` doesn't apply because `fanOut` awaits `Promise.all`. | open |
| `num-hash-imul` | `fnv1a` is 84%: each `s.charCodeAt(i)` and `s.length` rechecks the string for ASCII (`tnStrIsASCII` 24%, as in `str-short-scan`), and `h`, a `float64` local, goes through `TnInt32` for every `^=` and `Math.imul` (24%, as in `num-bitwise`). | open |
| `bigint-arith` | Every `bigint` literal is `TnBigInt("1")`, a `big.Int.SetString` parse, each time it is evaluated, including in `modpow`'s loop condition (`TnBigInt` is 45%), and `e >>= 1n` builds `Neg(TnBigInt("1"))`. `BigInt(i)` parses a string too. | open |
| `iter-helpers` | Iterator helpers over `Iterator.from(array)` and generators run each stage as a goroutine feeding a channel (`TnIterFrom` / `TnIterDrop` closures, channel send / receive and goroutine wake-ups about 40%), not the push form that `for…of` uses. | open |
| `wasm-call` | `api.add(…)` on `instance.exports as Api` is `TnCallMember`: a `TnGet` of the export from the exports `TnMap`, then `TnCallValue` with the arguments boxed into a new `[]interface{}` (73% together); wazero's own `CallWithStack` is about 10%. | open |
| `typed-array` | Every `Int32Array` write converts through `tnTypedConv`, which calls `math.Mod` for ToInt32 (21%) even when the value is in range, the case `TnInt32` already short-cuts. | open |
| `gen-next` | `.next()`, spread and a stored generator use the goroutine and channel form (channel send / receive and thread wake-ups about 60%); only a direct `for…of` gets the push form. | open |
| `union-typeof` | `typeof v === 'number'` on a union value calls `TnTypeOf` (62%), which builds the type's name through reflection (`rtype.String`) and compares strings, where a type switch would do. | open |
| `fn-rest-spread` | `.call`, `.apply` and a bound method go through `TnWithThis` (79%), which copies the arguments into a new `[]interface{}` through reflection (`TnSliceAs`) on every call. | open |

Bugs found while writing the probes (not performance, not fixed here):
`'x' + null` and `'x' + undefined` render `<nil>`, and a `-0` concatenated
into a string renders `-0e+0` (JS gives `null`, `undefined` and `0`); a
subclass of a class with `*[Symbol.iterator]()` can't be iterated (the
generator isn't copied into it); and examples/marked-cli's parity run fails
69 `--tokens` cases at this commit and before (a `def` token's unmatched
`title` group prints `""` where Node omits `undefined`).

Found while pinning the fixes above (also before them, not fixed here): an
`await` of a promise that is already settled resumes on the spot, so in
`const p = f(); log('x')` the part of `f` after its first `await` runs
before `x` (JS runs it after); a `for…of` over an array doesn't see elements
pushed during the loop; a class method returning `null` (`next(): Base |
null`) and a typed field read from JSON `null` compare `=== null` as
`undefined`, and `await` of a `Promise<void>` gives `{}`; an object literal
typed as an interface, called through a dynamic receiver, throws `area is
not a function`; a class whose arrow-function field implements an interface
method, and `[...shapes]` of a `Base[]` into a `Shape[]`, don't compile;
`.length` counts a character outside the BMP once (JS counts two UTF-16
units); `JSON.parse` of a number past the float range (`1e400`) throws
where JS gives `Infinity`; and a JSON object whose keys come in another
order than its type's fields loses that order once converted to the type.

Found while writing the second batch of probes (not fixed here; each probe
works around it and says so in a comment): `cur.meta?.tag?.length` on an
optional `string` field doesn't compile (`*string has no field or method
length`), so `obj-optional-chain` uses `(cur.meta?.tag ?? '').length`;
`obj.method.call(other, …)` and `obj.method.bind(other)` ignore `other` and
keep `obj` as `this` (`fn-rest-spread` passes the same receiver); and
`Buffer#toString('utf8')` and `TextDecoder` turn a truncated multi-byte
sequence (`f0 90 41`, `e2 82`) into one U+FFFD per byte where JS gives one
per maximal subpart (`buf-encode` decodes only valid text).
