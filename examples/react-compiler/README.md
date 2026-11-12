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
zod's whole schema graph constructs, `parseEnvironmentConfig` validates
identically — and the compiler's whole pipeline runs: the Babel parser parses
the program (JSX included), traverse dispatches visitors, Scope collects
bindings, the lowering builds the HIR (params, destructuring patterns,
literals all populate), the SSA/memoization passes run, and the codegen
emits memoized output whose CompileSuccess lines match Node's — t1's
compiled function is byte-identical, line for line. The remaining fixtures
fail inside the compiler's own passes: an effects-inference ordering error
(`Expected effects to be inferred prior to
ValidateLocalsNotReassignedAfterRender`), nil dereferences in the
instruction-rewrite passes, and a lost optional-method call —
[parity.mjs](parity.mjs) reports each diff.

## Parity with Node.js

[node parity.mjs](parity.mjs) compiles `main.ts` to a native binary and runs
the compiler over each fixture (components and hooks through
`useState`/`useMemo`/`useRef`/`useEffect` and custom hooks, the compiler's test
pragmas, `"use no memo"`, and the error paths) with both runtimes.
stdout, stderr and the exit code must match byte for byte — including the memo
slot and block counts in the `// CompileSuccess` lines. Failures are written
to `.cache/failures/`. Current gap, 3/15:

```sh
node parity.mjs
```

The remaining failures, by root cause:

- **Directive collection** (mode-all, closures-and-destructuring partially
  remain) — FIXED: the parser's directives now reach the compiler (one
  dynamic array converts to one typed view; see the CHANGELOG). mode-annotation
  memoizes its Component and fails later on a pre-existing `reflect.Set`
  panic (`**[]interface{}` not assignable to `*[]interface{}`), visible with
  `TN_DEBUG_ERRORS=1`.
- **Reactive-scope classification** (demo-infer, jsx-outlining, error-mutate-prop,
  error-conditional-hook). `Driver.visitBreak` raises `Expected reactive scope
  to implicitly break to fallthrough` (BuildReactiveFunction.ts:1202) where
  Node compiles — the same local/context classification family as fixtures
  12/14's `consistently local or context references` invariant.
- **Nested-scope bindings** (mode-all, closures-and-destructuring): BuildHIR's
  `Todo: Support destructuring of context variables` on every
  `const [x, setX] = useState(...)`.
- **Runtime gaps**: `Array.prototype.at` on dynamic values (validate-manual-memo),
  member-expression scope lookups (hooks-and-refs).
- **Uid naming** (mode-annotation's remaining diff after the reflect.Set panic:
  `_temp` vs `_`). Class methods don't apply default parameters for
  explicitly-passed `undefined`: `generateUid(name: string = "temp")` is called
  with `name ?? undefined` (Environment.ts:778) and natively the name arrives
  empty — `s.uid(undefined)` returns `_` where Node returns `_temp` (plain
  functions handle it).

## Benchmark

[bench.mjs](bench.mjs) is ready (per-call latency on the demo, scaling on
generated component files from 8 to 64 KB, alternating Node and native runs
with output equality enforced) and will report numbers once the parity gaps
above are closed.
