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
`set`, `obj`, `class`, `union`, `any`, `fn`, `gen`, `regex`, `json`, `exc`,
`events`, `async`.

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

Last run 2026-11-13 (only `gen-for-of` probes updated): Windows_NT 10.0.26300, AMD Ryzen 5 7600 6-Core Processor, Node v26.13.0, go1.27.4 windows/amd64, TypeNative 0.5.0, 15 interleaved runs per probe.

| Probe | Measures | Node ms (min / median) | TypeNative ms (min / median) | TypeNative vs Node (median) |
| ----- | -------- | ---------------------: | ---------------------------: | :-------------------------- |
| [any-dynamic](any-dynamic.ts) | property reads and writes on `any` objects (nested objects, arrays) | 51.8 / 53.3 | 2474 / 2501 (6 runs) | 46.9x slower |
| [any-record-view](any-record-view.ts) | viewing an `any` object as `Record<string, any>` and reading keys through it | 5.6 / 6.1 | 269 / 273 | 45.0x slower |
| [arr-hof](arr-hof.ts) | `map` / `filter` / `reduce` / `some` chains with closure callbacks | 89.8 / 91.6 | 26.9 / 27.7 | **3.3x faster** |
| [arr-push-index](arr-push-index.ts) | `push`, indexed reads/writes and `length` on number arrays | 52.5 / 54.3 | 55.0 / 55.7 | 1.0x slower |
| [arr-sort](arr-sort.ts) | `sort` of numbers with a comparator and of strings in default order | 125 / 127 | 347 / 354 | 2.8x slower |
| [async-await](async-await.ts) | `await` chains of async functions that resolve immediately | 99.5 / 104 | 201 / 206 | 2.0x slower |
| [class-dispatch](class-dispatch.ts) | virtual method calls through an abstract base class and an interface | 68.6 / 71.7 | 124 / 127 | 1.8x slower |
| [events-emit](events-emit.ts) | `EventEmitter` `emit` to listeners taking 0, 1 and 2 arguments | 73.6 / 73.9 | 655 / 658 | 8.9x slower |
| [exc-throw-rare](exc-throw-rare.ts) | `try`/`catch`/`finally` in a hot loop where nothing throws | 204 / 205 | 241 / 242 | 1.2x slower |
| [exc-try-catch](exc-try-catch.ts) | `try`/`catch`/`finally` in a hot loop where one call in 1,024 throws | 24.7 / 24.9 | 60.8 / 61.1 | 2.5x slower |
| [fn-closures](fn-closures.ts) | creating closures over mutable state and calling them indirectly | 144 / 145 | 58.6 / 60.0 | **2.4x faster** |
| [fn-recursion-tree](fn-recursion-tree.ts) | building and walking binary trees (recursion plus allocation) | 101 / 103 | 149 / 152 | 1.5x slower |
| [gen-for-of](gen-for-of.ts) | sync generators (a method, `*[Symbol.iterator]()`, `yield*`) consumed by `for…of` | 52.5 / 53.6 | 11.6 / 12.2 | **4.4x faster** |
| [json-roundtrip](json-roundtrip.ts) | `JSON.stringify` and `JSON.parse` of an array of nested objects | 38.5 / 39.9 | 96.9 / 99.5 | 2.5x slower |
| [map-delete](map-delete.ts) | `Map<string, number>` insert/delete churn (an LRU-style sliding window) | 29.3 / 36.0 | 165 / 167 | 4.6x slower |
| [map-string-keys](map-string-keys.ts) | `Map<string, number>` `set` / `get` / `has` word counting | 92.3 / 93.5 | 118 / 119 | 1.3x slower |
| [num-arith-loop](num-arith-loop.ts) | tight float64 loop with `%`, `*` and `Math.floor` | 76.5 / 77.4 | 159 / 162 | 2.1x slower |
| [num-bitwise](num-bitwise.ts) | bitwise and, or, xor and shifts (`<<`, `>>`, `>>>`) on integers, and flag tests | 21.6 / 22.3 | 114 / 116 | 5.2x slower |
| [num-mod-int](num-mod-int.ts) | `%` on integer operands (hash buckets, cycling indexes) | 62.5 / 63.8 | 187 / 191 | 3.0x slower |
| [num-to-string](num-to-string.ts) | number/string conversion: `String(n)`, `toFixed`, `Number(str)`, `parseInt` | 102 / 105 | 402 / 416 | 4.0x slower |
| [obj-alloc](obj-alloc.ts) | allocating many short-lived object literals and class instances | 62.5 / 63.4 | 187 / 191 | 3.0x slower |
| [regex-exec](regex-exec.ts) | regex `test`, `exec` with groups and global `replace` over log lines | 67.9 / 69.5 | 105 / 107 | 1.5x slower |
| [regex-site](regex-site.ts) | `/g` regex literals evaluated inside a hot function, and `.index` on long input | 78.2 / 83.8 | 159 / 168 | 2.0x slower |
| [set-ops](set-ops.ts) | `Set<number>` `add` / `has` / `delete` on a 16,384-entry set | 38.6 / 39.5 | 95.5 / 97.0 | 2.5x slower |
| [str-char-scan](str-char-scan.ts) | lexer-style scan of a large string with `charCodeAt` and `str[i]` | 79.8 / 81.0 | 326 / 327 | 4.0x slower |
| [str-concat](str-concat.ts) | growing ~20 KB strings with `s += x` and `s = s + …` (each pass starts empty) | 10.1 / 10.6 | 25.5 / 26.4 | 2.5x slower |
| [str-concat-plus](str-concat-plus.ts) | growing strings with `s = s + x` (not `+=`), each pass starting empty | 30.5 / 31.8 | 97.1 / 101 | 3.2x slower |
| [str-short-scan](str-short-scan.ts) | `charCodeAt(i)` / `s[i]` scans of many short (< 512 byte) lines | 30.8 / 31.1 | 195 / 196 | 6.3x slower |
| [str-split-join](str-split-join.ts) | `split`, `join`, `indexOf`, `slice` and `trim` on CSV-like lines | 56.0 / 57.2 | 40.5 / 40.8 | **1.4x faster** |
| [str-template](str-template.ts) | template literals mixing strings, integers, floats and booleans | 53.5 / 54.7 | 84.1 / 84.6 | 1.5x slower |
| [union-switch](union-switch.ts) | evaluating an expression tree of a discriminated union with `switch (e.kind)` | 120 / 125 | 488 / 495 | 4.0x slower |

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
| `class-dispatch` | A call on an abstract base class or an interface went through `TnCall_<m>(recv, args ...interface{})`: arguments and the result boxed, then unboxed with `TnAs`. | When every class of the receiver's declared hierarchy declares the method with the same Go signature, the call goes through `TnCall_<C>_<m>(recv, a P0, …) R`: a type switch calling the method with its own types, the boxed dispatcher only for any other receiver. The call's inferred type is `R`, so the value isn't boxed again where it's used. | 709 → 124 ms |
| `async-await` | Each async call started a goroutine and handed the JS baton over twice, and each settle allocated two wake-up channels even with nobody waiting. | An async function that awaits only calls of other such functions (whose promises are settled when they return), with no `for await` and no promise returned, runs on the caller's goroutine (`TnRunAsyncInline`). `TnAsyncSend` / `TnAsyncClose` allocate a wake-up channel only for a parked awaiter. | 1985 → 201 ms |
| `json-roundtrip` | `JSON.parse` built a `TnMap` per object from `encoding/json` tokens, then `as Item[]` converted every map to a struct through `TnConvertDynamic`. | `JSON.parse(text)` into a typed slot is `TnJSONParseTyped[T]`: a scanner decodes the text straight into `T` (per-type plans over field offsets) when every object has `T`'s keys in its field order and every value its kind; anything else (other keys, null, any fields, invalid text) decodes and converts as before. | 347 → 97 ms |
| `num-bitwise` | Loop counters and flag locals were `float64`, so every bitwise operand converted float64 to int32 through `TnInt32`. | A `for` loop's `let` counter (an integer literal start, `++` / `--`, never written in the body) is a Go `int`, and a block `const` holding a bitwise result an `int32`, when every read is an arithmetic, comparison, bitwise, index or template operand: reads are `float64(i)`, bitwise operands take the integer directly. | 128 → 114 ms |

### Open

| Probe | Cause | Status |
| ----- | ----- | ------ |
| `any-dynamic` | What remains is the representation: an `any` object is a Go `map[string]interface{}`, so every property access hashes its key (`memHashAES` and map lookups are about 45%), where V8 reads a slot through a hidden class. | open |
| `events-emit` | Listener shapes other than the fast paths (here `(a: number, b: string)`) still go through `reflect.Value.Call` (about a third), and each `emit` hashes the event name. | open |
| `str-short-scan`, `str-char-scan` | Indexes under 64 still rescan their prefix for ASCII (`tnStrIsASCII` is 40% of `str-short-scan`). A loop over `s.charCodeAt(i)` could test `s` once before the loop. | open |
| `num-mod-int`, `num-bitwise` | Integer loop counters are Go `int`s now, but `%` still runs on `float64` (`TnMod` converts both operands and checks them, then divides with `idiv`), and other integral locals (`k = (k + i) % 97`, module constants such as `F_A = 1 << 0`) stay `float64`. A `TnMod` by a constant divisor would let Go multiply instead of divide, but any fallback call puts the helper over Go's inlining budget; it would have to be emitted inline. | open |

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
