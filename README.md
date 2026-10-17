# TypeNative

TypeNative is a TypeScript-to-Go transpiler, it turns TypeScript into Go code and compiles it to a single-file native executable — no Node.js runtime, no bundler, just a binary. Write TypeScript, ship native binaries.

```ts
// hello.ts
console.log('Hello, native world!');
```

```sh
npx typenative --source hello.ts --script
# Hello, native world!
```

> Early development: the supported language subset grows with every release. See [conformance.md](conformance.md) for exactly what transpiles today.

---

## Contents

- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [CLI reference](#cli-reference)
- [Writing TypeNative-compatible TypeScript](#writing-typenative-compatible-typescript)
- [Examples](#examples)
- [How it works](#how-it-works)
- [Testing and conformance](#testing-and-conformance)
- [Self-hosted native compiler](#self-hosted-native-compiler)
- [License](#license)

## Requirements

- [Node.js v24](https://nodejs.org/en) or newer.
- [Go 1.26](https://go.dev/doc/install) or newer

## Install

Use without installing:

```sh
npx typenative --source main.ts --script
```

Or add to a project:

```sh
npm install typenative -D
npx typenative --source main.ts --output ./bin/myapp
```

Generated projects pin it automatically as a dev dependency.

## Quick start

**1. Run a snippet directly (script mode):**

```sh
npx typenative --source hello.ts --script
```

Transpiles `hello.ts` to `dist/code.go`, builds `dist/native(.exe)`, runs it, and forwards its exit code.

**2. Build a distributable binary:**

```sh
npx typenative --source main.ts --output ./bin/myapp
# Windows: --output ./bin/myapp.exe
```

**3. Interactive mode (no flags):**

```sh
npx typenative
# prompts for TypeScript entry file and output path
```

```sh
npx typenative --script
# opens an editor prompt; runs what you type without saving a file
```

**4. Scaffold a new project:**

```sh
npx typenative --new
# prompts for project name + whether to npm install
# creates main.ts, package.json (with execute/build scripts), tsconfig.json, README.md, .gitignore
```

The scaffolded `package.json` gives you:

```json
{
  "scripts": {
    "execute": "npx typenative --source main.ts --script",
    "build": "npx typenative --source main.ts --output bin/<name>"
  }
}
```

Scaffolded `tsconfig.json` targets the TypeNative type surface:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": [],
    "types": ["typenative", "typenative/go", "typenative/npm"],
    "strict": true
  }
}
```

`lib: []` disables the standard TypeScript libraries, so `typenative`'s own declarations are the entire type surface — the compiler only accepts what actually transpiles.

## CLI reference

| Flag              | Mode           | Description                                                                                                                                          |
| ----------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--source <file>` | build / script | TypeScript entry file. Relative imports (`./util`) and npm packages are resolved from its directory.                                                 |
| `--output <path>` | build          | Where to copy the compiled binary. If omitted with `--script`, the temp binary in `dist/` is executed and kept there.                                |
| `--script`        | run            | Build to `dist/native(.exe)` and execute immediately with inherited stdio. Combine with `--source`, or omit `--source` to type code into the prompt. |
| `--new`           | scaffold       | Create a new project directory (`main.ts`, `package.json`, `tsconfig.json`, `README.md`, `.gitignore`).                                              |

Exit codes from `--script` are the exit code of your program. A non-zero `go build` prints `go build failed:` plus the compiler output and exits `1`.

## Writing TypeNative-compatible TypeScript

TypeNative supports a growing subset of TypeScript, not the whole language. The source of truth is [conformance.md](conformance.md) — every supported feature links to a runnable probe in [conformance/](conformance/).

**Language highlights that work today:**

- `let`/`const`, functions, arrow functions, closures, recursion, rest/spread, default and optional params, destructured params, `arguments`.
- Classes (inheritance, static members/blocks, getters/setters, parameter properties, abstract, `implements`, decorators on classes and methods), interfaces, type aliases, generics (constraints, defaults), namespaces, enums (numeric, string, computed, `const`), tuples.
- `if`/`switch` (incl. fallthrough), `for`/`for...of`/`for...in`/`while`/`do...while`, labeled loops, `try`/`catch`/`finally` (`throw` → `panic`, catch via `defer`/`recover`), ternaries, optional chaining, nullish coalescing (`??`/`??=`), `in`, `typeof`, `instanceof`, `delete`, logical assignment.
- `async`/`await`, generators and async generators (`for await`), custom iterators (`*[Symbol.iterator]()`), tagged templates (`String.raw`), `using` (`[Symbol.dispose]`), `new.target`, `import.meta.url`, `import = require` / `export =`, dynamic `import()`.
- Type system: literal and template-literal types, union/intersection types, conditional types with `infer`, `keyof`/mapped/indexed-access types, utility types (`Partial`, `Readonly`, `Pick`, `Omit`, `Required`, `NonNullable`, `Record`), `as const`, `satisfies`, type guards (`p is T`), assertion functions.
- Runtime values: `bigint` literals (`2n ** 64n`) and `symbol` keys.
- JSX: `.tsx` files render to HTML strings.

**Standard library that works today:**

| Area            | What to use                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console         | `console.log`/`error`/`warn`, `console.time`/`timeEnd`, `assert` (→ `panic` on failure)                                                                                                                                                                                                                                                                                                                                         |
| `Array`         | `push`/`pop`, `shift`/`unshift`, `slice`/`splice`/`concat`, `map`/`filter`/`reduce`/`reduceRight`, `find`/`findLast`/`findIndex`/`findLastIndex`, `some`/`every`/`forEach`/`includes`/`indexOf`/`lastIndexOf`, `sort` with comparator, `flat`/`flatMap`, `fill`, `at`, `entries`, `join`, `reverse`, change-by-copy (`toSorted`/`toReversed`/`toSpliced`/`with`/`copyWithin`), `Array.from`, `Array.isArray`, `new Array<T>(n)` |
| `Object`        | `assign`, `keys`/`values`/`entries`, `fromEntries`, `hasOwn`, `defineProperty`, `getOwnPropertyNames`, integrity (`freeze`/`seal`/`preventExtensions` + `isFrozen`/`isSealed`/`isExtensible`), spread of records → Go maps                                                                                                                                                                                                      |
| `String`        | `split`/`slice`/`replace`/`replaceAll`, `padStart`/`padEnd`, `repeat`, `match`/`matchAll`/`search`, `includes`/`startsWith`/`endsWith`, `indexOf`/`lastIndexOf`, char codes (`charAt`/`charCodeAt`/`fromCharCode`), `at`, `trim`/`trimStart`/`trimEnd`, `normalize`, `localeCompare`, `String.raw`                                                                                                                              |
| `Number`/`Math` | `parseInt`/`parseFloat`, `toFixed`/`toPrecision`/`toString(radix)`, `Number.isInteger`/`isNaN`/`isFinite` + `MAX_SAFE_INTEGER` & friends, full `Math` (trig, hyperbolic, `log*`, `cbrt`/`hypot`, `min`/`max` incl. spread, constants)                                                                                                                                                                                           |
| `Map`/`Set`     | Full `set`/`get`/`has`/`delete`/`clear`/`size`, `forEach`, `keys`/`values`, `for...of` iteration (→ ordered Go maps), Set operations (`union`/`intersection`/`difference`/`symmetricDifference`/`isSubsetOf`/`isSupersetOf`/`isDisjointFrom`), `WeakMap`/`WeakSet`                                                                                                                                                              |
| `Promise`       | `new Promise` (resolve + reject), `then`/`catch`/`finally`, `resolve`/`reject`, `all`/`race`/`allSettled`/`any` (→ goroutines over channels)                                                                                                                                                                                                                                                                                    |
| `Date`          | `new Date()` / `new Date(ms)`, `getTime`/`valueOf`, local + UTC getters, `toISOString`/`toDateString`/`toTimeString`, `Date.now()`, `Date.UTC()`                                                                                                                                                                                                                                                                                |
| `JSON`          | `parse` / `stringify`                                                                                                                                                                                                                                                                                                                                                                                                           |
| `RegExp`        | Literals + `new RegExp()`, `test()`, `exec()` with named groups (`.groups`), flags `i`/`m`/`s`/`g`/`y`/`u`, stateful `lastIndex` for `/g` loops, `source`/`flags`/`global`/... properties. Backreferences, lookahead and lookbehind run on a small backtracking engine (RE2 does not support them)                                                                                                                              |
| Globals         | `setTimeout`/`clearTimeout`, `setInterval`/`clearInterval`, `queueMicrotask`, `structuredClone`, `globalThis`, `encodeURIComponent`/`decodeURIComponent`, `isNaN`/`isFinite`, `NaN`/`Infinity`                                                                                                                                                                                                                                  |
| `process`       | `argv`, `platform` (→ Node-style names), `env`, `cwd`, `exit`, `exitCode`, `hrtime`, `stdout`/`stderr`/`stdin`, `on('exit')`, … (see [node:process](conformance.md#nodeprocess))                                                                                                                                                                                                                                      |

**Node built-ins (import with the `node:` prefix, mapped to Go helpers):**

```ts
import path from 'node:path';
import * as fs from 'node:fs';
import { platform } from 'node:os';
import * as childProcess from 'node:child_process';

path.join('a', 'b');
fs.readFileSync('file.txt', 'utf-8');
childProcess.spawnSync('go', ['version'], { encoding: 'utf-8' });
```

Supported: `path`, `fs` (sync, callbacks, `fs/promises`, streams), `os`, `process`, `buffer`, `url` (`URL`, `URLSearchParams`), `util`, `assert`, `crypto` (hashes, ciphers, keys, signatures, `X509Certificate`, `crypto.subtle`), `zlib`, `events`, `stream` (+ `stream/web`: `ReadableStream` & co.), `readline`, `child_process`, `timers`, `perf_hooks`, `querystring`, `string_decoder`, networking (`net`, `dns`, `http`, `https`, `tls`, `dgram`, global `fetch` with `Blob` / `FormData`), `async_hooks` (`AsyncLocalStorage`), `test` (the `node:test` runner) and `worker_threads` (workers as child processes) and more, with Node's signatures (import as `node:x` or `x`). Callbacks, timers and I/O run on one event loop, as in Node. `node:readline.question()` exists as a TypeNative sync extension for self-hosted prompts. Per-API status: [conformance.md](conformance.md#node-builtins-node).

**Direct Go access (import with the `go:` prefix):**

```ts
import { Println, Sprintf } from 'go:fmt';
import { ToUpper } from 'go:strings';

Println(Sprintf('hi %s', ToUpper('bob')));
```

Any Go package can be imported this way (`import { X } from 'go:pkg'` → `pkg.X` with numeric conversion and throw-on-error results). The full standard library is declared for typechecking (`npm run gen:go`), with 154 packages probed — see [conformance.md](conformance.md#go-bridges-gostar).

**npm packages:**

```ts
import { helper } from 'my-lib';
```

Resolved by walking up to `node_modules/<name>` (TypeScript source preferred, CommonJS normalized to ESM). Local ambient `.d.ts` declarations (`declare module "my-lib" { ... }`) are used to inject precise parameter/return types.

Type mappings to keep in mind: `number` → `float64`, `boolean` → `bool`, nullable `T | null` → Go pointer, `Record<K, V>` / key-indexed objects → Go maps, object types → Go structs (copied by value, unlike JS references).

## Examples

Hello world:

```ts
console.log('Hello, World!');
```

```sh
npx typenative --source hello.ts --script
```

Files and paths:

```ts
import path from 'node:path';
import * as fs from 'node:fs';

const dir: string = path.dirname(path.resolve('data.txt'));
const text: string = fs.readFileSync(path.join(dir, 'data.txt'), 'utf-8');
console.log(text.toUpperCase());
```

Classes and maps:

```ts
class Counter {
  count: number = 0;
  inc(): void {
    this.count++;
  }
}

const seen: Map<string, number> = new Map();
seen.set('a', 1);
const c: Counter = new Counter();
c.inc();
console.log(`count=${c.count} seen=${seen.get('a')}`);
```

## How it works

```text
main.ts --(parse)--> normalized JSON AST --(transpileToNative)--> dist/code.go --(go build)--> dist/native(.exe) --run/copy--> your binary
```

- **Parse:** Node CLI uses the `typescript` npm package (`src/parse-node.ts`); the self-hosted binary spawns the Go `tsparser` tool (`src/parse-native.ts`). Both emit the same `{ kind: "Xxx", ... }` JSON shape so one transpiler consumes either.
- **Transpile:** `transpileToNative(code, { parse, readFile })` in `src/transpiler.ts` lowers the AST to Go, resolving relative and npm imports into additional Go files (`TranspileResult { main, files }`).
- **Build:** `run()` in `src/index.ts` writes `dist/code.go` (+ one Go file per module), cleans stale `dist/*.go`, shells out to `go build -o dist/native(.exe)`, then either executes it (`--script`, stdio inherited) or copies it to `--output`.

## Testing and conformance

`npm test` is `npm run conformance`: every `conformance/*.ts` probe is transpiled, built with `go`, executed, and must exit `0`. Results print per category (`syntax` / `semantics` / `lib`) plus a total pass rate; any failure exits non-zero and lists the first diagnostic line (`*.go:line`, `panic:`, `Unsupported syntax`, `Error`).

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run build`, and `npm run conformance` on Ubuntu with Node 24 and Go. Releases are cut from `TypeNative_*` tags via trusted publishing.

When adding a feature: add a probe, link it from [conformance.md](conformance.md), and keep the ✅/❌ matrix honest — gaps are documented, not hidden.

## Self-hosted native compiler

TypeNative compiles itself. `src/main.ts` transpiles to Go and builds into a `typenative` binary that needs no Node.js at runtime and emits the same Go as the npm package:

```sh
npm run build
npm run build:native   # builds native/tsparser + native/typenative side by side
native/typenative --source app.ts --script
```

`TYPENATIVE_TSPARSER` overrides parser discovery if you move the binaries apart. Verify parity with `node scripts/conformance.mjs --native`.

## License

MIT — see [LICENSE](LICENSE).
