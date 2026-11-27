# TypeScript Compiler (`tsc`)

The full upstream TypeScript compiler (`tsc` v6.0.3), compiled natively with TypeNative.
[vendor/typescript/](vendor/typescript/) holds the unmodified Apache-2.0 TypeScript compiler sources
(81 files, ~178K lines: scanner, parser, binder, checker, module resolver, all downlevel and JSX/decorator
transformers, emitter, declaration emitter, source maps, incremental `.tsbuildinfo` builder, `--build`
project references, and `--watch` mode), refreshed by [vendor.mjs](vendor.mjs) with only the mechanical
ESM/host adaptations documented in [VENDOR.md](VENDOR.md). [main.ts](main.ts) wires up the standard `tsc`
CLI entrypoint (`executeCommandLine(sys, noop, sys.args)`), with standard `lib.*.d.ts` files sourced from
`node_modules/typescript/lib/` into an adjacent `lib/` directory (never committed to git).

## Usage

```sh
tsc --version                       # print TypeScript version
tsc --noEmit -p tsconfig.json       # type-check a project
tsc -p tsconfig.json                # emit .js, .d.ts, .js.map, .tsbuildinfo
tsc --build                         # build composite project references
tsc --build --clean                 # clean project reference outputs
tsc --watch                         # watch and rebuild on file changes
```

## Run it

With Node.js (upstream sources use `enum` / `const enum` and namespaces, so `run-node.mjs` compiles
`main.ts` once into `.cache/node/` and populates `.cache/lib/` from `node_modules/typescript/lib/`):

```sh
node run-node.mjs --version
node run-node.mjs --noEmit -p ../../tsconfig.json
```

With TypeNative:

```sh
npx typenative --source main.ts --output .cache/tsc
./.cache/tsc --version
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/tsc/main.ts --output examples/tsc/.cache/tsc.exe
./examples/tsc/.cache/tsc.exe --version
```

`tsc` locates its default library files (`lib.*.d.ts`) next to the executable (or in an adjacent `lib/`
directory). Both [run-node.mjs](run-node.mjs), [parity.mjs](parity.mjs), and [bench.mjs](bench.mjs) copy
`lib.*.d.ts` from `node_modules/typescript/lib/` into `.cache/lib/` automatically.

The vendored upstream tree uses TypeScript's own internal build configuration rather than TypeNative's
minimal `lib: []` surface, so [tsconfig.json](tsconfig.json) sets `noCheck` (matching
[examples/react-compiler/tsconfig.json](../react-compiler/tsconfig.json)).

## Status: what works natively

Compiling [main.ts](main.ts) links all 81 vendored TypeScript compiler modules (~178K lines of TypeScript)
into a single 44.8 MB native Go binary with zero compiler logic rewritten in `vendor/`. Every compiler
subsystem runs natively:

- **CLI & config:** `--version`, `--help`, `--showConfig`, `tsconfig.json` `extends` / `include` / `exclude`,
  `--noEmit`, `--diagnostics`, `--listEmittedFiles`.
- **Emit & transforms:** ES2022, CommonJS, ES2015/ES5 downleveling (async/await, generators, classes,
  for-of, destructuring), JSX (`react`, `react-jsx`, `preserve`), TC39 and legacy experimental decorators,
  `.d.ts` declaration emit, `.js.map` / `.d.ts.map` / inline source maps.
- **Type checking & diagnostics:** full `strict` checking (control-flow narrowing, discriminated unions,
  generic inference, conditional/mapped types, `try`/`finally` definite assignment), plain and `--pretty`
  diagnostic formatting.
- **Module resolution:** `nodenext` (ESM + CJS `package.json` `exports`) and `bundler` + `paths` aliases.
- **Incremental, `--build`, and `--watch`:** `.tsbuildinfo` emission and warm cache reuse (skipping
  unchanged checks and emits), multi-project `tsc --build` / no-op / `--build --clean`, and live `--watch`
  rebuilds on file edits.
- **Real-world self-check:** `tsc --noEmit` on TypeNative's own ~47K-line `src/` codebase completes cleanly
  with exit code 0, matching Node.js byte-for-byte.

All fixes required to achieve 100% parity landed in TypeNative itself (`src/transpiler.ts` and `src/node/`),
covered by [conformance/semantics-tsc-compiler-patterns.ts](../../conformance/semantics-tsc-compiler-patterns.ts).

## Parity with Node.js

[parity.mjs](parity.mjs) compiles `main.ts` to a native binary (unless `--no-build` is passed) and runs
23 end-to-end workloads through both Node.js and the native binary in identical directory layouts. For every
case, `stdout`, `stderr`, exit code, and every emitted file (`.js`, `.d.ts`, `.js.map`, `.d.ts.map`,
`.tsbuildinfo`) must match byte-for-byte. Failures are written to `.cache/failures/`.

```sh
node parity.mjs
```

All **23/23 (100.0%)** parity cases pass byte-for-byte:

| Category | Cases | Status |
| --- | --- | :---: |
| CLI & config | `cli-version`, `cli-help`, `cli-showConfig` | 3/3 ✅ |
| JS emit & downlevel | `emit-es2022`, `emit-commonjs`, `emit-downlevel-es2015`, `emit-downlevel-es5` | 4/4 ✅ |
| JSX & decorators | `emit-jsx-react`, `emit-jsx-react-jsx`, `emit-jsx-preserve`, `emit-decorators-tc39`, `emit-decorators-experimental` | 5/5 ✅ |
| Declarations & sourcemaps | `emit-declarations-sourcemaps`, `emit-inline-sourcemap` | 2/2 ✅ |
| Diagnostics | `diagnostics-plain`, `diagnostics-pretty` | 2/2 ✅ |
| Module resolution | `module-resolution-nodenext`, `module-resolution-bundler-paths` | 2/2 ✅ |
| Projects, incremental & `--build` | `project-multifile-strict`, `incremental` (cold + warm no-op + edit), `build-references` (build + no-op + clean) | 3/3 ✅ |
| Real-world & watch | `realworld-noemit` (TypeNative `src/`), `watch-smoke` | 2/2 ✅ |

## Benchmark

Reproduce with `node bench.mjs [--no-build] [coldRuns=15] [projectRuns=5] [largeRuns=3]`.
The harness times **complete process runs** (spawn to exit) under both Node.js (pre-compiled
`.cache/node/main.js`) and the TypeNative native binary, alternating runs and verifying byte-for-byte
identical stdout, stderr, exit codes, and emitted files on every iteration.

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600 (6 cores, 12 threads), Node v26.13.0, Go 1.27.4,
TypeNative 0.7.2, default (non-`--release`) build. Binary size: 44.8 MB.

| Workload | Node.js (median) | TypeNative (median) | TypeNative vs Node |
| --- | ---: | ---: | --- |
| Cold CLI startup (`tsc --version`, 15 runs) | 169.3 ms | 13.1 ms | **12.91x faster** |
| Single-file strict compile (`.js`+`.d.ts`+`.map`, 5 runs) | 721.4 ms | 2,449.4 ms | 3.40x slower (0.29x) |
| Medium project cold build (22 files, 5 runs) | 853.1 ms | 2,831.2 ms | 3.32x slower (0.30x) |
| Medium project incremental warm no-op (5 runs) | 382.1 ms | 683.7 ms | 1.79x slower (0.56x) |
| Medium project incremental 1-file edit rebuild (5 runs) | 426.0 ms | 682.8 ms | 1.60x slower (0.62x) |
| Large real-world project (`tsc --noEmit` on TypeNative `src/`, 3 runs) | 4,751.2 ms | 89,122.3 ms | 18.76x slower (0.05x) |

### Honest performance notes

- **Cold startup is 12.9x faster** (13.1 ms vs 169.3 ms): Node.js has to load and parse ~178K lines of
  compiler JS on startup; the native binary starts directly in compiled machine code.
- **Incremental warm builds are within 1.6x–1.8x of Node** (~683 ms vs 382–426 ms) after fixing
  `.tsbuildinfo` view retention and `ReadonlyCollection.keys()` slice-to-channel conversion, which cut
  incremental warm rebuilds by **4.9x** (from 3,333 ms to 684 ms).
- **Full type-checking is slower than V8** (3.3x on medium projects, ~19x on TypeNative's 47K-line
  `src/transpiler.ts`). Unlike hand-written Go (`typescript-go`), TypeScript's own compiler relies heavily
  on dynamic `any`-typed AST/Node/Symbol/Type objects (`*TnMap[string, interface{}]`) and structural
  discriminated-union casts across `checker.ts` (~54K lines), where V8's inline caches optimize monomorphic
  property loads while transpiled Go still goes through dynamic property lookup and map/slice indirection.
- Profiling with `go tool pprof` yielded major general improvements in TypeNative's runtime: raising
  `TnMap`'s inline flat-slice threshold from 8 to 16 keys (eliminating >50% of live heap from AST node
  map promotion), zero-boxing `tnIndexKeyStr`, fast typed callback adapters in `tnFuncAdapter` (cutting
  24% CPU spent in `reflect.MakeFunc`), leak-free `uintptr` keys in `tnViews`/`tnMirrors`, zero-alloc
  sequential `TnSetAt`, and 32 big-string UTF-16 index cache slots. Together these cut `realworld-noemit`
  from 151 s down to 65–89 s and medium warm incremental builds from 3.33 s down to 0.68 s.
