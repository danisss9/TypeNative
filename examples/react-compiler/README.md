# React Compiler

The React Compiler, natively. [vendor/react-compiler/](vendor/react-compiler/)
holds `babel-plugin-react-compiler`'s TypeScript source (the compiler's
`packages/babel-plugin-react-compiler/src`, MIT licensed), and
[vendor/babel/](vendor/babel/) the Babel packages it runs on (parser, types,
traverse, generator, template, code-frame and helpers), with zod 4 and its
other npm dependencies. [main.ts](main.ts) parses a component or hook with the
Babel parser, runs the compiler's full pipeline (HIR building, dozens of
transform passes, code generation) on it, and prints the auto-memoized output
the Babel plugin would emit, plus one `// CompileSuccess` or `// CompileError`
line per function from the compiler's own logger.

This is the largest and deepest real codebase TypeNative compiles: about 470
vendored files whose graph is full of import cycles (the React Compiler's
entrypoint barrels re-export each other's modules), built on Babel's
`NodePath`/`Scope` machinery (mixin-built classes with prototype methods
assigned at module init through computed keys, function values carrying
expando properties, `$constructor`-style factory functions that read `this`
under `new`), zod schemas validated at startup, discriminated unions narrowed
across dozens of passes, generators, and `WeakMap`s.

## Usage

```sh
react-compile                      # compile the built-in demo component
react-compile app.jsx              # compile a component file
```

The first line of the input can carry the compiler's test pragmas, as in its
own fixtures: `// @compilationMode:"infer" @enableJsxOutlining`. A file the
compiler rejects prints `// compile error: …` and exits with code 1.

## Run it

With Node.js (the vendored sources use enums, so types are compiled first —
`run-node.mjs` does that once and caches the result):

```sh
node run-node.mjs app.jsx
```

With TypeNative:

```sh
npx typenative --source main.ts --output dist/react-compile
./dist/react-compile app.jsx
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/react-compiler/main.ts --output dist/react-compile
```

The vendored sources are checked upstream by their own toolchains, not tsc
(Babel does not type-check its sources with tsc), so the example's
[tsconfig.json](tsconfig.json) sets `noCheck`: `main.ts` itself is still
checked, with the vendored tree's imports resolved.

## Status: what works natively

Compiling `main.ts` links ~470 vendored modules and builds a native binary.
The transpiler work this needed is in TypeNative itself (see the CHANGELOG):
module initialization now follows the import graph's evaluation order with
JS's cycle semantics; `new F()` on a constructor-function value gets JS `new`
semantics; dynamic `fn.bind()`, `Object.assign` onto function values,
computed `C.prototype[k] = fn` assignments, and dynamic array-method calls
that share their name with a class method all behave as in JS; and an empty
object literal is no longer a zero-size Go value (every `{}' was one shared
object).

At runtime the binary initializes every module the way Node evaluates them —
zod's whole schema graph constructs and `parseEnvironmentConfig` fills in
every default — and the compiler's whole pipeline runs as it does under
Node: the Babel parser parses the program (JSX and TypeScript included),
traverse dispatches visitors, Scope collects bindings, the lowering builds
the HIR, every inference, validation and memoization pass runs, and the
Babel generator prints the result. Every parity fixture's output — the
memoized code, the `// CompileSuccess` counts, the compile errors with their
code frames — is byte-identical to Node's.

Most of what this took was JS object and array identity, which Go's value
semantics break unless the transpiler keeps it: an object converted to
another struct type stays one object (union members are views of the same
memory; a converted object is the same converted object every time); arrays
stay shared references through any-typed fields, getters, dynamic calls and
`splice`; a callee's changes to a converted argument (an array, a Map or Set,
an object's fields) are written back to the caller's; and `slice` copies.
The rest were JS semantics at the edges: getters in object literals stay
live, `Object.prototype` methods read as values, default parameters apply to
an explicit `undefined`, `null` and `undefined` stay apart where code tells
them apart, Map misses read as `undefined`, and keys written as `undefined`
are own keys.

## Parity with Node.js

[node parity.mjs](parity.mjs) compiles `main.ts` to a native binary and runs
the compiler over each fixture (components and hooks through
`useState`/`useMemo`/`useRef`/`useEffect` and custom hooks, the compiler's test
pragmas, `"use no memo"`, and the error paths) with both runtimes.
stdout, stderr and the exit code must match byte for byte — including the memo
slot and block counts in the `// CompileSuccess` lines. Failures are written
to `.cache/failures/`. All 15 fixtures match:

```sh
node parity.mjs
```

## Benchmark

Reproduce with `node bench.mjs [runs=30] [sizeRuns=5] [kilobytes=8,16,32,64]`.
The script compiles `main.ts`, then times **complete process runs** (spawn to
exit) of `react-compile` under both runtimes, alternating Node and native runs,
and stops if the two outputs ever differ:

- **(a) per-call latency:** the built-in demo (a `TodoList` component and a
  `useTotal` hook), the size of a file a build compiles once per process.
- **(b) scaling:** generated component files from 8 to 64 KB (screens of
  components with state, derived lists, handlers and conditionals, from a
  fixed-seed generator, so every machine gets the same input).

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600 (6 cores, 12 threads),
Node v26.13.0, Go 1.27.4, TypeNative 0.5.0 (unreleased changes), default
(non-`--release`) build. The binary is 26.5 MB.

(a) `react-compile` (built-in demo), 30 runs each:

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 347.82 ms | 357.76 ms | 358.24 ms | 378.30 ms |
| TypeNative | 158.81 ms | 161.81 ms | 165.06 ms | 253.77 ms |

(b) `react-compile generated-screen.jsx`, 5 runs per size (medians):

| Source            | Node.js   | TypeNative  | TypeNative vs Node |
| ----------------- | --------- | ----------- | ------------------ |
| 9 KB, 238 lines   | 457.60 ms | 893.67 ms   | 2.0x slower        |
| 17 KB, 460 lines  | 521.89 ms | 1,692.28 ms | 3.2x slower        |
| 32 KB, 892 lines  | 644.74 ms | 3,245.94 ms | 5.0x slower        |
| 64 KB, 1774 lines | 853.45 ms | 6,615.14 ms | 7.8x slower        |

**Per call, TypeNative is 2.2x faster** (162 ms vs 358 ms, median). Node
spends most of a short run loading and type-stripping the ~470 vendored
modules; the native binary starts with them compiled in.

**On larger inputs TypeNative is slower, and the gap grows with size:** Node
compiles each further KB in about 6 ms once V8 has warmed up, the native
build in about 100 ms. The compiler's passes run through TypeNative's dynamic
paths — reflection-based struct conversions (the identity-preserving ones
included), any-typed property reads and method dispatch — on every node of
every pass, where V8's inline caches make the same operations nearly free.
Making those paths cheaper is the next step for this example.
