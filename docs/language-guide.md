# Language Guide

TypeNative compiles a broad, practical subset of TypeScript directly to Go. Because TypeNative targets native Go binaries rather than a JavaScript VM, understanding both what is supported and how TypeScript types lower to Go helps you write fast, idiomatic code.

For a feature-by-feature table backed by automated tests, see [conformance.md](../conformance.md).

## TypeScript-to-Go Type Mappings

| TypeScript Type | Go Representation | Notes |
| --- | --- | --- |
| `number` | `float64` | IEEE 754 double-precision float; integer `for` loop counters may be optimized to Go `int` |
| `boolean` | `bool` | |
| `string` | `string` | UTF-8 in Go with UTF-16 indexing helpers for JS-compatible `.length` / `charCodeAt` |
| `bigint` | `*big.Int` | Arbitrary precision via `math/big` |
| `symbol` | `*TnSymbol` | Unique pointer identity; usable as record keys and well-known protocols |
| `null` / `undefined` | `nil` | Both lower to Go `nil` |
| `T \| null` / `T \| undefined` | `*T` (or nil-able type) | Go pointer types for nullable primitives/structs |
| `T[]` | `[]T` | Go slices |
| `[T1, T2]` (tuples) | Fixed-length struct / slice | Destructuring preserves element types |
| Object types / `interface` | Go `struct` | **Copied by value** when passed as plain structs (unlike JS object references); classes are pointers |
| `class C` | `*C` | Pointer-receiver Go structs; inheritance via embedded structs |
| `Record<K, V>` / index-signature objects | Ordered Go map (`*TnMap[K, V]`) | Preserves JS insertion order |
| `Map<K, V>` / `Set<T>` | Tagged ordered Go map | Distinct from plain records for `instanceof` |
| `any` / `unknown` / `object` | `interface{}` | Dynamic runtime values (JSON-like objects, primitives, arrays) |
| `void` / `never` | No return value | |

> **Tip:** Prefer concrete types (`interface`, `class`, typed arrays, `Map<K, V>`) over `any` in hot loops. `any` object lookups hash string keys into `map[string]interface{}`, whereas typed structs compile to direct field access.

## Supported Language Features

### Declarations & Destructuring

- `let`, `const`, and hoisted `var` declarations (including evolving `let x;` typed from later assignments)
- Array and object destructuring, defaults, rest elements (`const [a, ...rest] = arr`), destructured function/callback parameters
- Object shorthand (`{ a, b }`), computed property keys, object spread (`{ ...a, b: 1 }`), array spread (`[...arr]`, `fn(...args)`)
- `using` and `await using` declarations (`[Symbol.dispose]` / `[Symbol.asyncDispose]`, lowered to `defer`)
- Numeric literals (`0xFF`, `0o17`, `0b1010`, `1e3`, `1_000_000`) and `bigint` literals (`2n ** 64n`)
- Identifiers containing `$` or Go reserved keywords (`string`, `len`, `range`, `type`, …) are automatically mangled safely

### Operators & Expressions

- Arithmetic (`+`, `-`, `*`, `/`, `%`, `**`), bitwise (`&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`) on both `number` and `bigint`
- Comparison (`===`, `!==`, `==`, `!=`, `<`, `<=`, `>`, `>=`) with JS truthiness and loose equality semantics
- Increment/decrement (`++`, `--`), compound and logical assignments (`+=`, `??=`, `||=`, `&&=`), assignment expressions (`while ((m = re.exec(s)))`)
- Ternary (`? :`), nullish coalescing (`??`), optional chaining (`obj?.prop`, `arr?.[i]`, `fn?.()`), comma operator, `void`, `delete`
- Type/runtime checks: `typeof`, `instanceof` (user classes, `Error` subclasses, `Map`, `Set`, `Date`, `Array`, `Function`, Node globals), `in`, private brand checks (`#x in obj`), `new.target`

### Control Flow & Error Handling

- `if` / `else`, `switch` (including explicit fallthrough and exhaustive switches)
- `for`, `for...of` (arrays, strings, Maps, Sets, tuples, custom iterators, generators), `for...in`, `for await...of`, `while`, `do...while`
- Labeled loops and labeled blocks with `break label` / `continue label`
- `try` / `catch` / `finally` (`throw` → `panic`, `catch`/`finally` → `defer`/`recover`), optional catch binding (`catch {}`), throwing non-`Error` values, custom `extends Error` classes, `Error` `cause` and `.stack`

### Functions, Async & Generators

- Function declarations, function expressions, arrow functions, closures, recursion
- Default parameters, optional parameters, rest parameters, `arguments`
- `async` / `await`, `Promise` combinators (`all`, `race`, `allSettled`, `any`)
- Sync generators (`function*`, `yield`, `yield*`, `*[Symbol.iterator]()`) and async generators (`async function*`, `for await`)
- `.call`, `.apply`, `.bind`

### Classes, Types & Modules

- Classes: inheritance (`extends`), `super`, `abstract` classes/methods, `implements`, static members and static blocks, getters/setters, parameter properties, `#private` fields/methods, class and method decorators
- Type system: interfaces, type aliases, generics (constraints and defaults), literal and template-literal types, union/intersection types, conditional types with `infer`, `keyof`, mapped and indexed-access types, utility types (`Partial`, `Readonly`, `Pick`, `Omit`, `Required`, `NonNullable`, `Record`), `as const`, `satisfies`, type guards (`x is T`), assertion functions (`asserts x`)
- Enums: numeric, string, computed, and `const enum`
- Namespaces
- Modules: ESM (`import` / `export`, default, named, namespace, re-exports, dynamic `import()`, `import.meta.url`), CommonJS-style `import = require` / `export =`, JSON imports
- JSX: `.tsx` files compile JSX elements to HTML strings

## Importing npm Packages

TypeNative resolves bare specifiers (e.g., `import { parse } from 'yaml'`) by walking up to `node_modules/<name>`:

- Packages that ship **TypeScript source files** (`.ts`) are transpiled directly into Go alongside your project.
- Local ambient `.d.ts` files (`declare module 'my-lib' { ... }`) can supply precise parameter and return types.
- **Plain JavaScript / CommonJS-only packages** without TypeScript sources are generally not supported, because TypeNative requires static type information to emit Go.

## Known Structural Limitations

Because TypeNative compiles ahead of time to a pure-Go native binary (no JS VM, no cgo), the following features are permanently out of scope (`🚫` in [conformance.md](../conformance.md)):

- **No runtime JavaScript engine:** `eval`, `new Function`, `node:vm`, `node:repl`, `Worker({ eval: true })`, `node:inspector`, V8 heap snapshots/flags, `node:trace_events`, and `node:module` loader hooks (`register` / `registerHooks`).
- **Static class layouts:** Classes are static Go structs with fixed fields and method sets—no prototype mutation (`C.prototype.m = ...`, `Object.setPrototypeOf`, `util.inherits`), no `Proxy` over typed structs, and no sparse-array holes.
- **`null` and `undefined` share `nil`:** APIs that distinguish `undefined` from `null` at runtime (such as binding `undefined` in `node:sqlite`) treat both as `nil`.
- **Process-isolated workers:** `worker_threads`, `child_process.fork`, and `cluster` run as separate OS processes, so `SharedArrayBuffer` and `Atomics` cannot share memory across workers.
- **No cgo / no raw memory:** `go:plugin`, `go:runtime/cgo`, `go:runtime/race`, `go:unsafe`, and native SQLite extensions are unavailable (SQLite and WebAssembly run in pure Go).
- **Deprecated upstream APIs:** `with`, `node:domain`, HTTP/2 server push.
