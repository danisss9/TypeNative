# Conformance

Every TypeScript language feature and standard-library API TypeNative aims to
support, split by area. Each ✅ row links to the [conformance/](conformance/)
probe that proves it transpiles correctly (`npm run conformance`, filter with an
optional substring: `node scripts/conformance.mjs <filter>`; `--native` runs the
self-hosted binary). Each ❌ row is a known gap with no passing probe yet.

## Basic types

| Feature                                        | Status | Probe                                                                | Notes                                                                     |
| ---------------------------------------------- | :----: | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `number`                                       |   ✅    | [syntax-arithmetic.ts](conformance/syntax-arithmetic.ts)             | Transpiled to `float64`                                                   |
| `boolean`                                      |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)               | Transpiled to `bool`                                                      |
| `string`                                       |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)               |                                                                           |
| `null`                                         |   ✅    | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts)     |                                                                           |
| `undefined`                                    |   ✅    | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts)     |                                                                           |
| `any` / `unknown`                              |   ✅    | [syntax-selfhost-context.ts](conformance/syntax-selfhost-context.ts) | Dynamic values handled at runtime (JSON-like objects, arrays, primitives) |
| Nullable types (`T \| null`, `T \| undefined`) |   ✅    | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts)     | Transpiled to Go pointer types                                            |
| `bigint`                                       |   ✅    | [syntax-bigint.ts](conformance/syntax-bigint.ts)                     | `2n` literals → `*big.Int`; `**` → `.Exp`, comparisons via `.Cmp`         |
| `symbol`                                       |   ✅    | [syntax-symbols.ts](conformance/syntax-symbols.ts)                   | `Symbol()` → unique `*TnSymbol` pointers, usable as record keys           |
| `object` type                                  |   ❌    | —                                                                    | No probe yet                                                              |
| `void` / `never`                               |   ❌    | —                                                                    | No probe yet                                                              |

## Variables & destructuring

| Feature                                 | Status | Probe                                                                            | Notes                                                                    |
| --------------------------------------- | :----: | -------------------------------------------------------------------------------- | ---------------------------------------------------                      |
| Variable declarations (`let` / `const`) |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)                           |                                                                          |
| Array destructuring                     |   ✅    | [syntax-destructuring.ts](conformance/syntax-destructuring.ts)                   | Parenthesized initializers; elision and element/property reads           |
| Object destructuring                    |   ✅    | [syntax-destructuring.ts](conformance/syntax-destructuring.ts)                   | Parenthesized initializers; elision and element/property reads           |
| Destructuring with defaults             |   ✅    | [syntax-destructuring-defaults.ts](conformance/syntax-destructuring-defaults.ts) | Missing elements/properties take defaults (nil- and bounds-checked)      |
| Destructured parameters                 |   ✅    | [syntax-destructuring-params.ts](conformance/syntax-destructuring-params.ts)     | `function f({ a, b }: T)`, `([x, y]: number[])`                          |
| Object shorthand                        |   ✅    | [syntax-destructuring.ts](conformance/syntax-destructuring.ts)                   | Parenthesized initializers; elision and element/property reads           |
| Object spread                           |   ✅    | [syntax-object-spread.ts](conformance/syntax-object-spread.ts)                   | Spread sources copied field-by-field into the new struct                 |
| Array spread                            |   ✅    | [syntax-array-spread.ts](conformance/syntax-array-spread.ts)                     | `[...arr]`, `fn(...args)`                                                |
| `delete` operator                       |   ✅    | [syntax-delete.ts](conformance/syntax-delete.ts)                                 | `delete o.key` on records                                                |
| Computed keys                           |   ✅    | [syntax-computed-keys.ts](conformance/syntax-computed-keys.ts)                   | Computed keys become map entries; `o.name` reads lower to `.Get("name")` |
| Records / dictionaries                  |   ✅    | [syntax-in-operator.ts](conformance/syntax-in-operator.ts)                       | `Record<K, V>` and objects indexed by key → Go maps                      |
| Tuples                                  |   ✅    | [syntax-tuples.ts](conformance/syntax-tuples.ts)                                 | `[string, number]` fixed-length arrays                                   |
| Top-level / module-scope variables      |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)               | Functions see main-file top-level variables                              |
| Numeric separators                      |   ✅    | [syntax-numeric-separators.ts](conformance/syntax-numeric-separators.ts)         | `1_000_000`                                                              |
| Hex / octal / binary literals           |   ❌    | —                                                                                | `0xFF`, `0o17`, `0b1010`; no probe yet                                   |
| `var` declarations (hoisting)           |   ❌    | —                                                                                | No probe yet                                                             |
| `using` / `await using` declarations    |   ❌    | —                                                                                | Explicit resource management; no probe yet                               |

## Operators

| Feature                      | Status | Probe                                                                        | Notes                                                                        |
| ---------------------------- | :----: | ---------------------------------------------------------------------------- | ---------------------------------------------------                          |
| Arithmetic operators         |   ✅    | [syntax-arithmetic.ts](conformance/syntax-arithmetic.ts)                     | `+`, `-`, etc.; `%`/`%=` via `math.Mod`                                      |
| Exponent operator            |   ✅    | [syntax-exponent.ts](conformance/syntax-exponent.ts)                         | `2 ** 10`                                                                    |
| Bitwise operators            |   ✅    | [syntax-bitwise.ts](conformance/syntax-bitwise.ts)                           | `&`, `\|`, `^`, `<<`, `>>`                                                   |
| Unsigned shift               |   ✅    | [syntax-unsigned-shift.ts](conformance/syntax-unsigned-shift.ts)             | `>>>`                                                                        |
| Comparison operators         |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)                       | `==`, `!=`, `===`, `!==`, etc.                                               |
| Logical operators            |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)                       | `&&`, `\|\|`                                                                 |
| Increment / decrement        |   ✅    | [syntax-increment-expression.ts](conformance/syntax-increment-expression.ts) | `++`, `--`, incl. as expressions                                             |
| Non-null assertion (`!`)     |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)           | Stripped during transpilation                                                |
| Ternary expressions          |   ✅    | [syntax-ternary.ts](conformance/syntax-ternary.ts)                           | `condition ? a : b`                                                          |
| Nullish coalescing           |   ✅    | [syntax-nullish.ts](conformance/syntax-nullish.ts)                           | `??` operator, incl. chains                                                  |
| Optional chaining            |   ✅    | [syntax-optional-chaining.ts](conformance/syntax-optional-chaining.ts)       | `obj?.prop`, `arr?.[i]`, chains across calls                                 |
| Nullish / logical assignment |   ✅    | [syntax-logical-assignment.ts](conformance/syntax-logical-assignment.ts)     | `??=`, `\|\|=`, `&&=`                                                        |
| `in` operator                |   ✅    | [syntax-in-operator.ts](conformance/syntax-in-operator.ts)                   | `"key" in obj` on records                                                    |
| `typeof`                     |   ✅    | [syntax-typeof.ts](conformance/syntax-typeof.ts)                             | `"key" in obj`, `typeof x === "string"`                                      |
| `instanceof`                 |   ✅    | [syntax-instanceof.ts](conformance/syntax-instanceof.ts)                     | Class instance checks                                                        |
| JS truthiness                |   ✅    | [syntax-optional-params.ts](conformance/syntax-optional-params.ts)           | `if (str)`, `!count`, `a \|\| fallback` on any type                          |
| Loose equality (`==`)        |   ✅    | [semantics-loose-equality.ts](conformance/semantics-loose-equality.ts)       | `bool`/`number`/`string` mixtures coerce like JS (`TnNumber`/`TnParseFloat`) |
| Optional call (`fn?.()`)     |   ❌    | —                                                                            | No probe yet                                                                 |
| Comma operator               |   ❌    | —                                                                            | No probe yet                                                                 |
| `void` operator              |   ❌    | —                                                                            | No probe yet                                                                 |
| `new.target`                 |   ❌    | —                                                                            | No probe yet                                                                 |

## Control flow

| Feature                             | Status | Probe                                                                                                          | Notes                                                                      |
| ----------------------------------- | :----: | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| If / else statements                |   ✅    | [syntax-if-switch.ts](conformance/syntax-if-switch.ts)                                                         | Incl. unbraced bodies and else-if chains                                   |
| Switch statements                   |   ✅    | [syntax-switch.ts](conformance/syntax-switch.ts)                                                               | Case and default statements                                                |
| Switch fallthrough                  |   ✅    | [syntax-switch-fallthrough.ts](conformance/syntax-switch-fallthrough.ts)                                       | Explicit fallthrough between cases                                         |
| `for` loops                         |   ✅    | [syntax-loops.ts](conformance/syntax-loops.ts)                                                                 | Standard `for` loops, incl. unbraced bodies                                |
| `continue`                          |   ✅    | [syntax-loops.ts](conformance/syntax-loops.ts)                                                                 | `continue` in all loop kinds                                               |
| `break`                             |   ✅    | [syntax-if-switch.ts](conformance/syntax-if-switch.ts), [syntax-do-while.ts](conformance/syntax-do-while.ts)   | In switch cases and loops                                                  |
| `for...of` loops                    |   ✅    | [syntax-loops.ts](conformance/syntax-loops.ts), [syntax-for-of-string.ts](conformance/syntax-for-of-string.ts) | Arrays, Maps, Sets, strings, tuples; `Object.entries()` unwrapping         |
| `for...in` loops                    |   ✅    | [syntax-for-in.ts](conformance/syntax-for-in.ts)                                                               | Key range over records/maps                                                |
| `for await...of`                    |   ❌    | —                                                                                                              | Requires async iteration (see [Async & timing](#async--timing))            |
| `while` loops                       |   ✅    | [syntax-loops.ts](conformance/syntax-loops.ts)                                                                 | Transpiled to Go's `for` loops; assignment in condition                    |
| `do...while` loops                  |   ✅    | [syntax-do-while.ts](conformance/syntax-do-while.ts)                                                           | Implemented with conditional break                                         |
| Labeled loops                       |   ✅    | [syntax-labeled-loops.ts](conformance/syntax-labeled-loops.ts)                                                 | `LabeledStatement` → Go labels; labeled `continue`/`break`                 |
| `try` / `catch` / `finally`         |   ✅    | [syntax-try-catch-finally.ts](conformance/syntax-try-catch-finally.ts)                                         | `throw` → `panic`; catch/finally via `defer`/`recover`                     |
| Optional catch binding (`catch {}`) |   ✅    | [syntax-try-catch-finally.ts](conformance/syntax-try-catch-finally.ts)                                         |                                                                            |
| Custom error classes                |   ✅    | [syntax-custom-errors.ts](conformance/syntax-custom-errors.ts)                                                 | `extends Error` → embedded `TnError`; constructors take the message        |
| `Error.message`                     |   ✅    | [syntax-error-message.ts](conformance/syntax-error-message.ts)                                                 | `throw new Error` panics with a `*TnError`; `.message` on caught values    |
| Narrowing                           |   ✅    | [syntax-typeof.ts](conformance/syntax-typeof.ts)                                                               | `T \| undefined` narrowed after `if (x)`, `x !== undefined`, early returns |

## Functions

| Feature                                       | Status | Probe                                                                        | Notes                                                                               |
| --------------------------------------------- | :----: | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------               |
| Function declarations                         |   ✅    | [syntax-functions.ts](conformance/syntax-functions.ts)                       | Transpiled to Go functions                                                          |
| Arrow functions                               |   ✅    | [syntax-arrow-functions.ts](conformance/syntax-arrow-functions.ts)           | Transpiled to anonymous functions                                                   |
| IIFEs                                         |   ✅    | [syntax-iife.ts](conformance/syntax-iife.ts)                                 | `(() => { ... })()` and `(function name() { ... })()`                               |
| Closures over mutable state                   |   ✅    | [syntax-closures.ts](conformance/syntax-closures.ts)                         | Functions capturing and mutating outer variables; per-iteration `let`               |
| Function types                                |   ✅    | [syntax-closures.ts](conformance/syntax-closures.ts)                         | `() => number`, `(x: number) => string` as type annotations                         |
| Default parameter values                      |   ✅    | [syntax-default-params.ts](conformance/syntax-default-params.ts)             | `function(x = defaultValue)`, incl. constructors, methods, arrows                   |
| Rest parameters                               |   ✅    | [syntax-rest-params.ts](conformance/syntax-rest-params.ts)                   | `function(...args: T[])` → Go variadic                                              |
| Spread in calls                               |   ✅    | [syntax-spread-call.ts](conformance/syntax-spread-call.ts)                   | `f(...args)` incl. tuples                                                           |
| Optional parameters                           |   ✅    | [syntax-optional-params.ts](conformance/syntax-optional-params.ts)           | `function f(x?: string)`                                                            |
| Destructured parameters                       |   ✅    | [syntax-destructuring-params.ts](conformance/syntax-destructuring-params.ts) | `function f({ a, b }: T)`, `([x, y]: number[])`                                     |
| Contextual object-literal arguments           |   ✅    | [syntax-contextual-arguments.ts](conformance/syntax-contextual-arguments.ts) | Struct type inferred from parameter / return type                                   |
| Recursion                                     |   ✅    | [syntax-recursion.ts](conformance/syntax-recursion.ts)                       | Direct self-recursion                                                               |
| Generators (`function*` / `yield` / `yield*`) |   ✅    | [syntax-generators.ts](conformance/syntax-generators.ts)                     | `function*` runs in a goroutine sending yields over a channel; `for...of` ranges it |
| Async generators (`async function*`)          |   ❌    | —                                                                            | Depends on generators and async                                                     |
| Custom iterators (`Symbol.iterator`)          |   ✅    | [syntax-custom-iterators.ts](conformance/syntax-custom-iterators.ts)         | `*[Symbol.iterator]()` → a `Symbol_iterator()` channel method                       |
| `as const` assertions                         |   ✅    | [syntax-as-const.ts](conformance/syntax-as-const.ts)                         | Erased during transpilation                                                         |
| Function overloads                            |   ❌    | —                                                                            | No probe yet                                                                        |
| `this` parameter (`function f(this: T)`)      |   ❌    | —                                                                            | No probe yet                                                                        |
| `arguments` object                            |   ❌    | —                                                                            | No probe yet                                                                        |

## Classes & interfaces

| Feature                                                          | Status | Probe                                                                                    | Notes                                                                                   |
| ---------------------------------------------------------------- | :----: | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------                          |
| Classes                                                          |   ✅    | [syntax-class.ts](conformance/syntax-class.ts)                                           | Transpiled to Go structs with constructor and receiver methods                          |
| Constructor parameter properties                                 |   ✅    | [syntax-class-parameter-properties.ts](conformance/syntax-class-parameter-properties.ts) | `constructor(private x: number)`                                                        |
| Class inheritance                                                |   ✅    | [syntax-class-inheritance.ts](conformance/syntax-class-inheritance.ts)                   | `super.method()` → `self.Parent.method()`; inherited methods copied for `this` dispatch |
| `implements` clauses                                             |   ✅    | [syntax-class-implements.ts](conformance/syntax-class-implements.ts)                     | `class C implements I`                                                                  |
| Interface `extends`                                              |   ✅    | [syntax-interface-extends.ts](conformance/syntax-interface-extends.ts)                   | Inherited properties flattened into the derived struct                                  |
| Static members                                                   |   ✅    | [syntax-class-static.ts](conformance/syntax-class-static.ts)                             | Static members → package-level `Class_member` vars/functions                            |
| Getters / setters (classes)                                      |   ✅    | [syntax-class-getters.ts](conformance/syntax-class-getters.ts)                           | `c.v` reads/writes rewrite to `Get_v()`/`Set_v()` accessor calls                        |
| Getters (object literals)                                        |   ✅    | [syntax-object-getters.ts](conformance/syntax-object-getters.ts)                         | Getter closures stored as function fields; reads invoke them                            |
| Object-literal methods                                           |   ✅    | [syntax-object-methods.ts](conformance/syntax-object-methods.ts)                         | Method closures stored as function fields capturing the instance (`this` → the object)  |
| Private `#` fields                                               |   ✅    | [syntax-class-private-fields.ts](conformance/syntax-class-private-fields.ts)             | `#secret` → a plain (name-mangled) struct field                                         |
| Access modifiers (`private` / `protected` / `public` on members) |   ❌    | —                                                                                        | Constructor parameter properties ✅; member modifiers unprobed                           |
| Abstract classes                                                 |   ✅    | [syntax-class-abstract.ts](conformance/syntax-class-abstract.ts)                         | Abstract members skipped; concrete methods copied onto subclasses                       |
| Static initialization blocks (`static {}`)                       |   ❌    | —                                                                                        | No probe yet                                                                            |
| Class expressions (`const C = class {}`)                         |   ❌    | —                                                                                        | No probe yet                                                                            |
| Interfaces                                                       |   ✅    | [syntax-class-implements.ts](conformance/syntax-class-implements.ts)                     | Transpiled to Go interfaces                                                             |
| Optional properties                                              |   ✅    | [syntax-optional-chaining.ts](conformance/syntax-optional-chaining.ts)                   | `prop?: Type` in interfaces/types                                                       |
| Type-aware method dispatch                                       |   ✅    | [semantics-method-dispatch.ts](conformance/semantics-method-dispatch.ts)                 | Class `.push()` / `.length` not confused with array builtins                            |
| Index signatures (`[key: string]: T`)                            |   ❌    | —                                                                                        | No probe yet (records/dicts → Go maps ✅)                                                |

## Generics

| Feature                                                       | Status | Probe                                                                  | Notes                                                          |
| ------------------------------------------------------------- | :----: | ---------------------------------------------------------------------- | ----------------------------------                             |
| Generic functions                                             |   ✅    | [syntax-generic-functions.ts](conformance/syntax-generic-functions.ts) | Type parameters → Go generics; call sites infer from arguments |
| Generic classes                                               |   ✅    | [syntax-generic-classes.ts](conformance/syntax-generic-classes.ts)     | Type parameters via Go generics                                |
| Generic constraints (`<T extends U>`)                         |   ❌    | —                                                                      | No probe yet                                                   |
| Default type parameters (`<T = D>`)                           |   ❌    | —                                                                      | No probe yet                                                   |
| Generic interfaces / type aliases                             |   ❌    | —                                                                      | No probe yet                                                   |
| `const` type parameters / variance annotations (`in` / `out`) |   ❌    | —                                                                      | No probe yet                                                   |

## Enums

| Feature                               | Status | Probe                                                        | Notes                                                                   |
| ------------------------------------- | :----: | ------------------------------------------------------------ | --------------------------------------------                            |
| Numeric enums                         |   ✅    | [syntax-enum-numeric.ts](conformance/syntax-enum-numeric.ts) | Numeric members are `float64` constants; string enums keep a named type |
| String enums                          |   ✅    | [syntax-enum-string.ts](conformance/syntax-enum-string.ts)   | `enum` declarations and member access                                   |
| `const enum`                          |   ❌    | —                                                            | No probe yet                                                            |
| Computed / heterogeneous enum members |   ❌    | —                                                            | `enum E { A = f(), B = 's' }`; no probe yet                             |

## Type-system features

| Feature                                                   | Status | Probe                                                                | Notes                                                                           |
| --------------------------------------------------------- | :----: | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Type aliases                                              |   ✅    | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts)         | `type P = { x: number }` → Go struct; alias-of-alias                            |
| Union types                                               |   ✅    | [syntax-union-types.ts](conformance/syntax-union-types.ts)           | Narrowed via `typeof` checks                                                    |
| Type guards (`is`)                                        |   ✅    | [syntax-type-guards.ts](conformance/syntax-type-guards.ts)           | `p is T` → Go `bool`; `in` checks struct fields at runtime                      |
| `as` assertions                                           |   ✅    | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts)         | `x as T`, incl. angle-bracket syntax                                            |
| Self-host contextual typing                               |   ✅    | [syntax-selfhost-context.ts](conformance/syntax-selfhost-context.ts) | Object/array literals typed from context, `Record` literals, `in`, `any` params |
| Decorators (`@`)                                          |   ❌    | —                                                                    | No probe yet                                                                    |
| Namespaces / `module` blocks                              |   ❌    | —                                                                    | No probe yet                                                                    |
| `override` modifier                                       |   ❌    | —                                                                    | No probe yet                                                                    |
| `readonly` modifier (properties, `readonly T[]`)          |   ❌    | —                                                                    | No probe yet                                                                    |
| `satisfies` operator                                      |   ❌    | —                                                                    | No probe yet                                                                    |
| `keyof` / mapped / conditional / `infer` types            |   ❌    | —                                                                    | No probe yet                                                                    |
| `import type` / `export type`                             |   ❌    | —                                                                    | No probe yet                                                                    |
| Intersection types (`A & B`)                              |   ❌    | —                                                                    | No probe yet                                                                    |
| Literal types (`'a' \| 'b'`)                              |   ❌    | —                                                                    | No probe yet                                                                    |
| Tuple optional / rest / labeled elements                  |   ❌    | —                                                                    | `[number, ...string[]]`, `[name: string]`                                       |
| Indexed access types (`T['k']`)                           |   ❌    | —                                                                    | No probe yet                                                                    |
| Type-level `typeof` (`typeof obj`)                        |   ❌    | —                                                                    | Runtime `typeof` ✅ (see Operators)                                              |
| Template literal types                                    |   ❌    | —                                                                    | `` type S = `${A}-${B}` ``                                                      |
| Utility types (`Partial`, `Pick`, `Omit`, …)              |   ❌    | —                                                                    | `Record<K, V>` ✅ (see [Variables & destructuring](#variables--destructuring))   |
| Assertion functions (`asserts x is T`)                    |   ❌    | —                                                                    | No probe yet                                                                    |
| Callable / construct signatures (`type F = { (): void }`) |   ❌    | —                                                                    | No probe yet                                                                    |
| JSX / `.tsx` syntax                                       |   ❌    | —                                                                    | No probe yet                                                                    |
| Ambient declarations (`declare`, `.d.ts`, `x!: T`)        |   ❌    | —                                                                    | No probe yet                                                                    |
| `export =` / `import x = require()`                       |   ❌    | —                                                                    | No probe yet                                                                    |

## Modules & imports

| Feature                                            | Status | Probe                                                            | Notes                                                                                                                  |
| -------------------------------------------------- | :----: | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Named imports                                      |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import { x } from './file'`                                                                                           |
| Import renaming (`import { x as y }`)              |   ❌    | —                                                                | No probe yet                                                                                                           |
| Named exports (`export const` / `export function`) |   ✅    | [syntax-import-local.ts](conformance/syntax-import-local.ts)     | Helper [import-local-helper.ts](conformance/import-local-helper.ts) exports `multiply`                                 |
| Default imports                                    |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import x from 'pkg'` — namespace stripped in output                                                                   |
| Namespace imports                                  |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import * as x from 'pkg'`                                                                                             |
| Local file imports                                 |   ✅    | [syntax-import-local.ts](conformance/syntax-import-local.ts)     | Relative paths transpiled to a separate Go file (helper: [import-local-helper.ts](conformance/import-local-helper.ts)) |
| Default export                                     |   ✅    | [syntax-default-export.ts](conformance/syntax-default-export.ts) | `export default function`                                                                                              |
| Node.js built-in imports                           |   ✅    | [lib-node-path.ts](conformance/lib-node-path.ts)                 | `import { join } from 'node:path'` mapped to Go stdlib (see [Standard library](#standard-library))                     |
| Go package imports                                 |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import { x } from 'go:pkg'`                                                                                           |
| npm package imports                                |   ✅    | [syntax-import-npm.ts](conformance/syntax-import-npm.ts)         | `import { x } from 'pkg'` mapped to Go module imports                                                                  |
| Re-exports (`export { x } from`, `export *`)       |   ❌    | —                                                                | No probe yet                                                                                                           |
| Dynamic `import()`                                 |   ❌    | —                                                                | No probe yet                                                                                                           |
| Side-effect imports (`import './mod'`)             |   ❌    | —                                                                | No probe yet                                                                                                           |
| `import.meta.url`                                  |   ❌    | —                                                                | Not lowered (see Roadmap)                                                                                              |

## Async & timing

| Feature                                              | Status | Probe                                                        | Notes                                                                                          |
| ---------------------------------------------------- | :----: | ------------------------------------------------------------ | --------------------------------------                                                         |
| `async` / `await`                                    |   ✅    | [syntax-async-await.ts](conformance/syntax-async-await.ts)   | Async functions send returns over a channel; `await` receives; pending work drains before exit |
| `Promise` constructor / `.then`                      |   ✅    | [syntax-promise-then.ts](conformance/syntax-promise-then.ts) | `new Promise` executor runs in a goroutine; `.then` consumes the channel on a wait group       |
| `Promise.all`                                        |   ✅    | [syntax-promise-all.ts](conformance/syntax-promise-all.ts)   | `TnPromiseAll` drains every promise channel into a slice                                       |
| `Promise.resolve` / `reject` / `.catch` / `.finally` |   ❌    | —                                                            | No probe yet                                                                                   |
| `Promise.race` / `allSettled` / `any`                |   ❌    | —                                                            | No probe yet                                                                                   |
| `setInterval` / `clearInterval` / `clearTimeout`     |   ❌    | —                                                            | No probe yet                                                                                   |
| `queueMicrotask`                                     |   ❌    | —                                                            | No probe yet                                                                                   |
| `setTimeout`                                         |   ✅    | [lib-set-timeout.ts](conformance/lib-set-timeout.ts)         | `time.AfterFunc` registered on a wait group the process waits on                               |

## Semantics (JS behaviour preserved)

| Feature                                   | Status | Probe                                                                              | Notes                                                                                                       |
| ----------------------------------------- | :----: | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Array reference semantics                 |   ✅    | [semantics-array-reference.ts](conformance/semantics-array-reference.ts)           | Array variables hold `*[]T` so aliases share the slice header                                               |
| Object reference semantics                |   ✅    | [semantics-object-reference.ts](conformance/semantics-object-reference.ts)         | Aliased objects share state; [semantics-parameter-mutation.ts](conformance/semantics-parameter-mutation.ts) |
| Object identity                           |   ✅    | [semantics-object-identity.ts](conformance/semantics-object-identity.ts)           | Equal literals are different references                                                                     |
| Object key order                          |   ✅    | [semantics-object-key-order.ts](conformance/semantics-object-key-order.ts)         | Insertion order preserved                                                                                   |
| Map insertion order                       |   ✅    | [semantics-map-order.ts](conformance/semantics-map-order.ts)                       | Iteration follows insertion order                                                                           |
| Set insertion order                       |   ✅    | [semantics-set-order.ts](conformance/semantics-set-order.ts)                       | Spread follows insertion order                                                                              |
| Default sort is lexicographic             |   ✅    | [semantics-default-sort.ts](conformance/semantics-default-sort.ts)                 | `[10, 9, 1].sort()` → `1,10,9`                                                                              |
| Float math                                |   ✅    | [semantics-float-math.ts](conformance/semantics-float-math.ts)                     | `7 / 2 === 3.5`, `0.1 + 0.2 !== 0.3`                                                                        |
| Integer precision                         |   ✅    | [semantics-integer-precision.ts](conformance/semantics-integer-precision.ts)       | `2 ** 53 + 1 === 2 ** 53`                                                                                   |
| `NaN` semantics                           |   ✅    | [semantics-nan.ts](conformance/semantics-nan.ts)                                   | `NaN !== NaN`, `Number.isNaN(0 / 0)`                                                                        |
| String-number concatenation order         |   ✅    | [semantics-string-number-concat.ts](conformance/semantics-string-number-concat.ts) | `'a' + 1 + 2` vs `1 + 2 + 'a'`                                                                              |
| Array truthiness                          |   ✅    | [semantics-array-truthy.ts](conformance/semantics-array-truthy.ts)                 | Empty array is truthy                                                                                       |
| Loop closures capture per-iteration `let` |   ✅    | [semantics-loop-closures.ts](conformance/semantics-loop-closures.ts)               |                                                                                                             |

## Standard library

Every standard-library API TypeNative ports, split by module. Per
[types/typenative-npm.d.ts](types/typenative-npm.d.ts) (`node:*`) and
[types/typenative-go.d.ts](types/typenative-go.d.ts) (`go:*`).

### `console`

| API                                | Status | Probe                                                  | Notes                                                  |
| ---------------------------------- | :----: | ------------------------------------------------------ | ------------------------------------------------------ |
| `console.log`                      |   ✅    | [lib-console-log.ts](conformance/lib-console-log.ts)   | Mapped to `fmt.Println`                                |
| `console.error`                    |   ❌    | —                                                      | Mapped to `fmt.Fprintln(os.Stderr, ...)`; no probe yet |
| `console.warn`                     |   ❌    | —                                                      | Mapped to stderr like `console.error`; no probe yet    |
| `console.time` / `console.timeEnd` |   ✅    | [lib-console-time.ts](conformance/lib-console-time.ts) | Via `time.Now` / `time.Since`                          |

### `Math`

| API                                                                | Status | Probe                                                  | Notes                                                           |
| ------------------------------------------------------------------ | :----: | ------------------------------------------------------ | --------------------------------------------------------------- |
| `Math.floor` / `ceil` / `round`                                    |   ✅    | [lib-math.ts](conformance/lib-math.ts)                 | Mapped to `math.Floor`, `math.Ceil`, `math.Round`               |
| `Math.abs` / `sqrt` / `pow`                                        |   ✅    | [lib-math.ts](conformance/lib-math.ts)                 | Mapped to corresponding `math` functions                        |
| `Math.min` / `Math.max`                                            |   ✅    | [lib-math-min-max.ts](conformance/lib-math-min-max.ts) | Go builtins `min` / `max`                                       |
| `Math.max(...arr)` / spread & variadic                             |   ✅    | [lib-math-min-max.ts](conformance/lib-math-min-max.ts) | Spread and any number of arguments via `slices.Max` / `max`     |
| `Math.random`                                                      |   ✅    | [lib-math-random.ts](conformance/lib-math-random.ts)   | Mapped to `rand.Float64()`                                      |
| `Math.log` / `log2` / `log10`                                      |   ❌    | —                                                      | Mapped to `math.Log` / `math.Log2` / `math.Log10`; no probe yet |
| `Math.sin` / `cos` / `tan`                                         |   ❌    | —                                                      | Mapped to `math.Sin` / `math.Cos` / `math.Tan`; no probe yet    |
| `Math.trunc` / `sign`                                              |   ❌    | —                                                      | Mapped to `math.Trunc` / inline sign check; no probe yet        |
| Constants (`Math.PI`, `Math.E`, …)                                 |   ❌    | —                                                      | No probe yet                                                    |
| `Math.asin` / `acos` / `atan` / `atan2` / `hypot` / `cbrt` / `exp` |   ❌    | —                                                      | No probe yet                                                    |

### `JSON`

| API              | Status | Probe                                                      | Notes                                                   |
| ---------------- | :----: | ---------------------------------------------------------- | -------------------------------------                   |
| `JSON.parse`     |   ✅    | [lib-json-parse.ts](conformance/lib-json-parse.ts)         | Mapped to `encoding/json` `Unmarshal`                   |
| `JSON.stringify` |   ✅    | [lib-json-stringify.ts](conformance/lib-json-stringify.ts) | Reflection serializer includes unexported struct fields |

### `Object`

| API                                                        | Status | Probe                                                      | Notes                                                               |
| ---------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `Object.keys` / `values` / `entries`                       |   ✅    | [lib-object-helpers.ts](conformance/lib-object-helpers.ts) | Map key/value iteration helpers; typed results for maps and records |
| `Object.assign`                                            |   ✅    | [lib-object-assign.ts](conformance/lib-object-assign.ts)   | Sources (structs, maps, dynamic objects) copied into an ordered map |
| `Object.freeze` / `seal` / `isFrozen`                      |   ❌    | —                                                          | No probe yet                                                        |
| `Object.fromEntries`                                       |   ❌    | —                                                          | No probe yet                                                        |
| `Object.hasOwn` / `defineProperty` / `getOwnPropertyNames` |   ❌    | —                                                          | No probe yet                                                        |

### `String`

| API                                                       | Status | Probe                                                                  | Notes                                                                  |
| --------------------------------------------------------- | :----: | ---------------------------------------------------------------------- | -----------------------------------------------------------            |
| Template literals                                         |   ✅    | [syntax-template-literals.ts](conformance/syntax-template-literals.ts) | Backtick strings with `${expr}` interpolation                          |
| Tagged templates                                          |   ✅    | [syntax-tagged-templates.ts](conformance/syntax-tagged-templates.ts)   | Desugared to `tag([...strings], ...values)`                            |
| `toUpperCase` / `toLowerCase`                             |   ✅    | [lib-string-basics.ts](conformance/lib-string-basics.ts)               | Via `strings` package                                                  |
| `trim` / `trimStart` / `trimEnd`                          |   ✅    | [lib-string-basics.ts](conformance/lib-string-basics.ts)               | Via `strings` package                                                  |
| `split` / `join`                                          |   ✅    | [lib-string-split-join.ts](conformance/lib-string-split-join.ts)       | Via `strings` package                                                  |
| `includes` / `startsWith` / `endsWith` / `indexOf`        |   ✅    | [lib-string-search.ts](conformance/lib-string-search.ts)               | Via `strings` package                                                  |
| `replace` / `replaceAll` (string pattern)                 |   ✅    | [lib-string-replace.ts](conformance/lib-string-replace.ts)             | Via `strings` package                                                  |
| `replace` / `replaceAll` (RegExp, `$1`/`$&`, fn replacer) |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)     | `/g` vs first match, `$1`/`$&` patterns, function replacers            |
| `charAt` / `substring` / `slice`                          |   ✅    | [lib-string-slice.ts](conformance/lib-string-slice.ts)                 | Direct Go string indexing/slicing                                      |
| `charCodeAt` / `String.fromCharCode`                      |   ✅    | [lib-string-char-codes.ts](conformance/lib-string-char-codes.ts)       | `charCodeAt` reads the byte; `String.fromCharCode` → `string(rune(n))` |
| `concat` / `repeat`                                       |   ✅    | [lib-string-pad-repeat.ts](conformance/lib-string-pad-repeat.ts)       | Concatenation and `strings.Repeat`                                     |
| `padStart` / `padEnd`                                     |   ✅    | [lib-string-pad-repeat.ts](conformance/lib-string-pad-repeat.ts)       | Via `strings.Repeat`                                                   |
| `localeCompare`                                           |   ✅    | [lib-string-compare.ts](conformance/lib-string-compare.ts)             | `strings.Compare` → -1/0/1                                             |
| `match` / `matchAll` / `search`                           |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)     | Via `regexp` package (`String.match` with groups)                      |
| `at` (negative indices)                                   |   ✅    | [lib-array-at.ts](conformance/lib-array-at.ts)                         | Supports negative indices                                              |
| Unicode length / iteration                                |   ✅    | [lib-string-unicode.ts](conformance/lib-string-unicode.ts)             | `.length` counts runes; `[...str]` spreads runes                       |
| `String.raw`                                              |   ❌    | —                                                                      | No probe yet                                                           |
| `normalize`                                               |   ❌    | —                                                                      | Unicode normalization; no probe yet                                    |

### `Array`

| API                                                                         | Status | Probe                                                                        | Notes                                                                         |
| --------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------------- | -----------------------------------                                           |
| `push` / `pop`                                                              |   ✅    | [lib-array-push-pop.ts](conformance/lib-array-push-pop.ts)                   | Basic stack operations                                                        |
| `shift` / `unshift`                                                         |   ✅    | [lib-array-shift-unshift.ts](conformance/lib-array-shift-unshift.ts)         | Queue operations                                                              |
| `join` / `reverse`                                                          |   ✅    | [lib-array-reverse-join.ts](conformance/lib-array-reverse-join.ts)           | `join()` defaults to `","`; `reverse` reverses in place and returns the array |
| `slice`                                                                     |   ✅    | [lib-array-slice.ts](conformance/lib-array-slice.ts)                         | Negative indices count from the end                                           |
| `splice`                                                                    |   ✅    | [lib-array-splice.ts](conformance/lib-array-splice.ts)                       | Removes and returns elements in place, inserting extra arguments              |
| `sort` (default, lexicographic)                                             |   ✅    | [semantics-default-sort.ts](conformance/semantics-default-sort.ts)           | String sort by default                                                        |
| `sort` (comparator)                                                         |   ✅    | [lib-array-sort-comparator.ts](conformance/lib-array-sort-comparator.ts)     | Comparator lowered into `sort.SliceStable`                                    |
| `flat` / `flatMap`                                                          |   ✅    | [lib-array-flat-flatmap.ts](conformance/lib-array-flat-flatmap.ts)           | One-level `flat`; `flatMap` appends callback results                          |
| `at`                                                                        |   ✅    | [lib-array-at.ts](conformance/lib-array-at.ts)                               | Supports negative indices                                                     |
| `fill`                                                                      |   ✅    | [lib-array-fill.ts](conformance/lib-array-fill.ts)                           | `new Array<T>(n)` → `make([]T, n)`; `fill` assigns in place                   |
| `Array.from`                                                                |   ✅    | [lib-array-from.ts](conformance/lib-array-from.ts)                           | Array-likes read `length`; the callback gets the index                        |
| `Array.isArray`                                                             |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)           | Type check on values                                                          |
| `map` / `filter` / `reduce`                                                 |   ✅    | [lib-array-map-filter-reduce.ts](conformance/lib-array-map-filter-reduce.ts) | Incl. chaining and object arrays                                              |
| `some` / `every`                                                            |   ✅    | [lib-array-some-every.ts](conformance/lib-array-some-every.ts)               | Predicate quantifiers                                                         |
| `find` / `findIndex` / `findLast` / `findLastIndex`                         |   ✅    | [lib-array-find.ts](conformance/lib-array-find.ts)                           | `findLast`/`findLastIndex` search from the end                                |
| `forEach`                                                                   |   ✅    | [lib-map-iteration.ts](conformance/lib-map-iteration.ts)                     | Block-body callbacks; `Map.forEach`                                           |
| `includes` / `indexOf` / `lastIndexOf`                                      |   ✅    | [lib-array-search.ts](conformance/lib-array-search.ts)                       | `lastIndexOf` searches from the end                                           |
| `entries` / `keys` / `values`                                               |   ✅    | [lib-array-entries.ts](conformance/lib-array-entries.ts)                     | `[index, value]` pairs destructured in `for...of`                             |
| `length` truncation (`arr.length = 0`)                                      |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)           | Clear via length assignment                                                   |
| `filter(Boolean)`                                                           |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)           | Constructor as predicate                                                      |
| `concat`                                                                    |   ❌    | —                                                                            | No probe yet                                                                  |
| `reduceRight`                                                               |   ❌    | —                                                                            | No probe yet                                                                  |
| `copyWithin`                                                                |   ❌    | —                                                                            | No probe yet                                                                  |
| Change-preserving copies (`toSorted` / `toReversed` / `toSpliced` / `with`) |   ❌    | —                                                                            | ES2023; no probe yet                                                          |

### `Map` / `Set`

| API                                                      | Status | Probe                                                              | Notes                                                   |
| -------------------------------------------------------- | :----: | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `Map` (`set` / `get` / `has` / `delete` / `size`)        |   ✅    | [lib-map.ts](conformance/lib-map.ts)                               | `Map<K, V>` → Go `map[K]V`; constructor with entries    |
| `Map` iteration (`for...of`, destructuring)              |   ✅    | [lib-map-iteration.ts](conformance/lib-map-iteration.ts)           | Key/value iteration, `Object.entries()` unwrapping      |
| `Set` (`add` / `has` / `delete` / `size`)                |   ✅    | [lib-set.ts](conformance/lib-set.ts)                               | `Set<T>` → Go `map[T]struct{}`; constructor with values |
| `Set` iteration / spread                                 |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | `for...of`, `[...set]`                                  |
| `Map.clear` / `Set.clear`                                |   ❌    | —                                                                  | No probe yet                                            |
| `WeakMap` / `WeakSet`                                    |   ❌    | —                                                                  | No probe yet                                            |
| Set operations (`union` / `intersection` / `difference`) |   ❌    | —                                                                  | ES2025; no probe yet                                    |

### `Number`

| API                                               | Status | Probe                                                    | Notes                                                    |
| ------------------------------------------------- | :----: | -------------------------------------------------------- | -------------------------------------------------------- |
| `toString` (incl. radix)                          |   ✅    | [lib-number-format.ts](conformance/lib-number-format.ts) | Universal `toString()` via `fmt.Sprintf` for any type    |
| `toFixed`                                         |   ✅    | [lib-number-format.ts](conformance/lib-number-format.ts) | `n.toFixed(2)` via `strconv.FormatFloat`                 |
| `parseInt` / `parseFloat` / `Number()`            |   ✅    | [lib-number-parse.ts](conformance/lib-number-parse.ts)   | Mapped to Go's `strconv` package                         |
| `Number.isInteger` / `isNaN` / `MAX_SAFE_INTEGER` |   ✅    | [lib-number-checks.ts](conformance/lib-number-checks.ts) | Number predicates and constants                          |
| `Number.EPSILON` / `isFinite` / `toPrecision`     |   ❌    | —                                                        | No probe yet                                             |
| `String()` / `Boolean()` conversions              |   ❌    | —                                                        | No probe yet (`Number()` ✅ above, `filter(Boolean)` ✅)   |

### `Date`

| API                                              | Status | Probe                                          | Notes                                                                            |
| ------------------------------------------------ | :----: | ---------------------------------------------- | -----------------------------                                                    |
| `new Date()` / `getTime` / `toISOString`         |   ✅    | [lib-date.ts](conformance/lib-date.ts)         | `new Date(ms)` → `time.UnixMilli`; `getTime`/`toISOString` mapped to `time.Time` |
| `Date.now()`                                     |   ✅    | [lib-date-now.ts](conformance/lib-date-now.ts) | `time.Now().UnixMilli()`                                                         |
| Component getters (`getFullYear`, `getMonth`, …) |   ❌    | —                                              | No probe yet                                                                     |

### `RegExp`

| API                                                    | Status | Probe                                                                | Notes                                                           |
| ------------------------------------------------------ | :----: | -------------------------------------------------------------------- | ---------------------------------------------------             |
| Regex literals                                         |   ✅    | [lib-regex-test.ts](conformance/lib-regex-test.ts)                   | `/pattern/flags` transpiled to `regexp.MustCompile`             |
| `new RegExp()`                                         |   ✅    | [lib-regex-test.ts](conformance/lib-regex-test.ts)                   | Constructor with optional flags                                 |
| `test()`                                               |   ✅    | [lib-regex-test.ts](conformance/lib-regex-test.ts)                   | Mapped to `regexp.MatchString`                                  |
| `exec()` (groups)                                      |   ✅    | [lib-regex-groups.ts](conformance/lib-regex-groups.ts)               | Mapped to `regexp.FindStringSubmatch`                           |
| Flags (`i`, `m`)                                       |   ✅    | [lib-regex-flags.ts](conformance/lib-regex-flags.ts)                 | Case-insensitive, multiline                                     |
| Backreferences                                         |   ✅    | [lib-regex-backreference.ts](conformance/lib-regex-backreference.ts) | Backreference patterns run on a small backtracking engine       |
| Named groups                                           |   ✅    | [lib-regex-named-groups.ts](conformance/lib-regex-named-groups.ts)   | `(?<name>` → `(?P<name>`; `exec` returns a match with `.groups` |
| Global `exec` loop (`/g` + `lastIndex`)                |   ✅    | [lib-regex-global-exec.ts](conformance/lib-regex-global-exec.ts)     | /g regexes carry `lastIndex` state in the `TnRegex` wrapper     |
| Lookbehind                                             |   ✅    | [lib-regex-lookbehind.ts](conformance/lib-regex-lookbehind.ts)       | Lookaround patterns run on the backtracking engine              |
| Remaining flags (`s` / `u` / `y`) & `source` / `flags` |   ❌    | —                                                                    | No probe yet                                                    |
| `split` with RegExp                                    |   ❌    | —                                                                    | No probe yet                                                    |

### `Promise` / timers

| API                                                  | Status | Probe                                                        | Notes                                                               |
| ---------------------------------------------------- | :----: | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `Promise` constructor / `.then`                      |   ✅    | [syntax-promise-then.ts](conformance/syntax-promise-then.ts) | Channel lowering works (see [Async & timing](#async--timing))       |
| `Promise.all`                                        |   ✅    | [syntax-promise-all.ts](conformance/syntax-promise-all.ts)   | Channel lowering works (see [Async & timing](#async--timing))       |
| `Promise.resolve` / `reject` / `.catch` / `.finally` |   ❌    | —                                                            | No probe yet                                                        |
| `Promise.race` / `allSettled` / `any`                |   ❌    | —                                                            | No probe yet                                                        |
| `setInterval` / `clearInterval` / `clearTimeout`     |   ❌    | —                                                            | No probe yet                                                        |
| `queueMicrotask`                                     |   ❌    | —                                                            | No probe yet                                                        |
| `setTimeout`                                         |   ✅    | [lib-set-timeout.ts](conformance/lib-set-timeout.ts)         | Lowered to `time.AfterFunc` (see [Async & timing](#async--timing))  |

### Misc globals

| API                                         | Status | Probe                                                              | Notes                                    |
| ------------------------------------------- | :----: | ------------------------------------------------------------------ | ---------------------------------------- |
| `assert`                                    |   ✅    | [lib-console-log.ts](conformance/lib-console-log.ts)               | Transpiled to `panic` on failure         |
| `process.argv` / `process.platform`         |   ✅    | [lib-process.ts](conformance/lib-process.ts)                       | Mapped to `os.Args` / `runtime.GOOS`     |
| `process.env`                               |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Environment variable access              |
| `process.exit`                              |   ❌    | —                                                                  | Mapped to `os.Exit`; no probe yet        |
| `process.cwd()`                             |   ❌    | —                                                                  | Mapped to `os.Getwd()`; no probe yet     |
| `Infinity`                                  |   ❌    | —                                                                  | No probe yet (`NaN` semantics ✅)         |
| Global `isNaN` / `isFinite`                 |   ❌    | —                                                                  | `Number.isNaN` ✅; global forms unprobed  |
| `encodeURIComponent` / `decodeURIComponent` |   ❌    | —                                                                  | No probe yet                             |
| `structuredClone`                           |   ❌    | —                                                                  | No probe yet                             |
| `globalThis`                                |   ❌    | —                                                                  | No probe yet                             |

### Node builtins (`node:*`)

| Module                                                                               | Status | Probe                                            | Notes                                                 |
| ------------------------------------------------------------------------------------ | :----: | ------------------------------------------------ | ----------------------------------------------------- |
| `node:path` (`join`, `dirname`, `basename`, `extname`, `resolve`)                    |   ✅    | [lib-node-path.ts](conformance/lib-node-path.ts) | Mapped to Go `path`/`filepath`                        |
| `node:fs` (`read/write/append/exists/mkdir/readdir/copy/rm/unlink`)                  |   ✅    | [lib-node-fs.ts](conformance/lib-node-fs.ts)     | Via Go helpers                                        |
| `node:url` (`fileURLToPath`, `pathToFileURL`)                                        |   ❌    | —                                                | Declared but no probe yet                             |
| `node:os` (`platform`, `homedir`, `tmpdir`)                                          |   ✅    | [lib-node-fs.ts](conformance/lib-node-fs.ts)     | `platform()` covered; `homedir`/`tmpdir` unprobed     |
| `node:child_process` (`exec`, `execSync`, `spawnSync`, `spawnInherit`)               |   ✅    | [lib-node-fs.ts](conformance/lib-node-fs.ts)     | Sync API shape, stdio-inherit runs                    |
| `node:readline` (`question`)                                                         |   ❌    | —                                                | Declared (TypeNative sync extension) but no probe yet |
| `node:assert` / `node:assert/strict`                                                 |   ❌    | —                                                | Undeclared; global `assert` is mapped to `panic`      |
| `node:async_hooks`                                                                   |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:buffer`                                                                        |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:cluster`                                                                       |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:console`                                                                       |   ❌    | —                                                | Undeclared; global `console` methods are mapped       |
| `node:constants`                                                                     |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:crypto`                                                                        |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:dgram`                                                                         |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:diagnostics_channel`                                                           |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:dns` / `node:dns/promises`                                                     |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:domain`                                                                        |   ❌    | —                                                | Deprecated upstream; undeclared                       |
| `node:events`                                                                        |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:fs/promises`                                                                   |   ❌    | —                                                | Undeclared; sync `node:fs` subset only                |
| `node:http`                                                                          |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:http2`                                                                         |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:https`                                                                         |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:inspector` / `node:inspector/promises`                                         |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:module`                                                                        |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:net`                                                                           |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:path/posix` / `node:path/win32`                                                |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:perf_hooks`                                                                    |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:process`                                                                       |   ❌    | —                                                | Undeclared; global `process` partially mapped         |
| `node:punycode`                                                                      |   ❌    | —                                                | Deprecated upstream; undeclared                       |
| `node:querystring`                                                                   |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:readline/promises`                                                             |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:repl`                                                                          |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:sea`                                                                           |   ❌    | —                                                | Undeclared; unsupported (`node:`-only module)         |
| `node:sqlite`                                                                        |   ❌    | —                                                | Undeclared; unsupported (`node:`-only module)         |
| `node:stream` / `node:stream/consumers` / `node:stream/promises` / `node:stream/web` |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:string_decoder`                                                                |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:sys`                                                                           |   ❌    | —                                                | Deprecated alias of `node:util`; undeclared           |
| `node:test` / `node:test/reporters`                                                  |   ❌    | —                                                | Undeclared; unsupported (`node:`-only module)         |
| `node:timers` / `node:timers/promises`                                               |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:tls`                                                                           |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:trace_events`                                                                  |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:tty`                                                                           |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:util` / `node:util/types`                                                      |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:v8`                                                                            |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:vm`                                                                            |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:wasi`                                                                          |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:worker_threads`                                                                |   ❌    | —                                                | Undeclared; unsupported                               |
| `node:zlib`                                                                          |   ❌    | —                                                | Undeclared; unsupported                               |

### Go bridges (`go:*`)

| Module                              | Status | Probe                                                  | Notes                                                                         |
| ----------------------------------- | :----: | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `go:fmt` (`Println`, `Sprintf`)     |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts) | Direct Go package access                                                      |
| `go:strings` (`ToUpper`, `ToLower`) |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts) | Direct Go package access                                                      |
| `go:strconv` (`FormatBool`)         |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts) | Direct Go package access                                                      |
| `go:archive/tar`                    |   ❌    | —                                                      | tar archive read/write; not declared in types, no probe yet                   |
| `go:archive/zip`                    |   ❌    | —                                                      | ZIP archive read/write; not declared in types, no probe yet                   |
| `go:bufio`                          |   ❌    | —                                                      | Buffered I/O; not declared in types, no probe yet                             |
| `go:bytes`                          |   ❌    | —                                                      | Byte-slice utilities; not declared in types, no probe yet                     |
| `go:cmp`                            |   ❌    | —                                                      | Ordered comparison primitives; not declared in types, no probe yet            |
| `go:compress/bzip2`                 |   ❌    | —                                                      | bzip2 decompression (read-only); not declared in types, no probe yet          |
| `go:compress/flate`                 |   ❌    | —                                                      | DEFLATE compression; not declared in types, no probe yet                      |
| `go:compress/gzip`                  |   ❌    | —                                                      | gzip read/write; not declared in types, no probe yet                          |
| `go:compress/lzw`                   |   ❌    | —                                                      | LZW compression (GIF/PDF/TIFF); not declared in types, no probe yet           |
| `go:compress/zlib`                  |   ❌    | —                                                      | zlib read/write; not declared in types, no probe yet                          |
| `go:container/heap`                 |   ❌    | —                                                      | Heap / priority queue; not declared in types, no probe yet                    |
| `go:container/list`                 |   ❌    | —                                                      | Doubly linked list; not declared in types, no probe yet                       |
| `go:container/ring`                 |   ❌    | —                                                      | Circular list; not declared in types, no probe yet                            |
| `go:context`                        |   ❌    | —                                                      | Cancellation and deadlines; not declared in types, no probe yet               |
| `go:crypto`                         |   ❌    | —                                                      | Crypto constants and algorithm selection; not declared in types, no probe yet |
| `go:crypto/aes`                     |   ❌    | —                                                      | AES encryption; not declared in types, no probe yet                           |
| `go:crypto/cipher`                  |   ❌    | —                                                      | Block cipher modes (GCM, CBC, CTR); not declared in types, no probe yet       |
| `go:crypto/des`                     |   ❌    | —                                                      | DES / triple DES (deprecated); not declared in types, no probe yet            |
| `go:crypto/dsa`                     |   ❌    | —                                                      | DSA signatures (deprecated); not declared in types, no probe yet              |
| `go:crypto/ecdh`                    |   ❌    | —                                                      | ECDH key exchange; not declared in types, no probe yet                        |
| `go:crypto/ecdsa`                   |   ❌    | —                                                      | ECDSA signatures; not declared in types, no probe yet                         |
| `go:crypto/ed25519`                 |   ❌    | —                                                      | Ed25519 signatures; not declared in types, no probe yet                       |
| `go:crypto/elliptic`                |   ❌    | —                                                      | Elliptic curves (legacy; use ecdh/ecdsa); not declared in types, no probe yet |
| `go:crypto/fips140`                 |   ❌    | —                                                      | FIPS 140-3 mode controls; not declared in types, no probe yet                 |
| `go:crypto/hkdf`                    |   ❌    | —                                                      | HKDF key derivation; not declared in types, no probe yet                      |
| `go:crypto/hmac`                    |   ❌    | —                                                      | HMAC keyed hashing; not declared in types, no probe yet                       |
| `go:crypto/hpke`                    |   ❌    | —                                                      | HPKE encryption (RFC 9180); not declared in types, no probe yet               |
| `go:crypto/md5`                     |   ❌    | —                                                      | MD5 hash; not declared in types, no probe yet                                 |
| `go:crypto/mlkem`                   |   ❌    | —                                                      | ML-KEM post-quantum key encapsulation; not declared in types, no probe yet    |
| `go:crypto/mlkem/mlkemtest`         |   ❌    | —                                                      | ML-KEM test vectors helper; not declared in types, no probe yet               |
| `go:crypto/pbkdf2`                  |   ❌    | —                                                      | PBKDF2 key derivation; not declared in types, no probe yet                    |
| `go:crypto/rand`                    |   ❌    | —                                                      | Cryptographically secure random bytes; not declared in types, no probe yet    |
| `go:crypto/rc4`                     |   ❌    | —                                                      | RC4 stream cipher (deprecated); not declared in types, no probe yet           |
| `go:crypto/rsa`                     |   ❌    | —                                                      | RSA signatures / encryption; not declared in types, no probe yet              |
| `go:crypto/sha1`                    |   ❌    | —                                                      | SHA-1 hash; not declared in types, no probe yet                               |
| `go:crypto/sha256`                  |   ❌    | —                                                      | SHA-224 / SHA-256 hashes; not declared in types, no probe yet                 |
| `go:crypto/sha3`                    |   ❌    | —                                                      | SHA-3 / SHAKE hashes; not declared in types, no probe yet                     |
| `go:crypto/sha512`                  |   ❌    | —                                                      | SHA-384 / SHA-512 family hashes; not declared in types, no probe yet          |
| `go:crypto/subtle`                  |   ❌    | —                                                      | Constant-time comparison primitives; not declared in types, no probe yet      |
| `go:crypto/tls`                     |   ❌    | —                                                      | TLS client / server; not declared in types, no probe yet                      |
| `go:crypto/x509`                    |   ❌    | —                                                      | X.509 certificates and revocation; not declared in types, no probe yet        |
| `go:crypto/x509/pkix`               |   ❌    | —                                                      | X.509 ASN.1/PKIX structures; not declared in types, no probe yet              |
| `go:database/sql`                   |   ❌    | —                                                      | SQL database access; not declared in types, no probe yet                      |
| `go:database/sql/driver`            |   ❌    | —                                                      | SQL driver interfaces; not declared in types, no probe yet                    |
| `go:debug/buildinfo`                |   ❌    | —                                                      | Build info from executables; not declared in types, no probe yet              |
| `go:debug/dwarf`                    |   ❌    | —                                                      | DWARF debug info parsing; not declared in types, no probe yet                 |
| `go:debug/elf`                      |   ❌    | —                                                      | ELF object files; not declared in types, no probe yet                         |
| `go:debug/gosym`                    |   ❌    | —                                                      | Go symbol tables; not declared in types, no probe yet                         |
| `go:debug/macho`                    |   ❌    | —                                                      | Mach-O object files; not declared in types, no probe yet                      |
| `go:debug/pe`                       |   ❌    | —                                                      | PE (Windows) object files; not declared in types, no probe yet                |
| `go:debug/plan9obj`                 |   ❌    | —                                                      | Plan 9 object files; not declared in types, no probe yet                      |
| `go:embed`                          |   ❌    | —                                                      | Files embedded via //go:embed; not declared in types, no probe yet            |
| `go:encoding`                       |   ❌    | —                                                      | Shared encoding interfaces; not declared in types, no probe yet               |
| `go:encoding/ascii85`               |   ❌    | —                                                      | ascii85 encoding; not declared in types, no probe yet                         |
| `go:encoding/asn1`                  |   ❌    | —                                                      | ASN.1 DER encoding; not declared in types, no probe yet                       |
| `go:encoding/base32`                |   ❌    | —                                                      | base32 encoding; not declared in types, no probe yet                          |
| `go:encoding/base64`                |   ❌    | —                                                      | base64 encoding; not declared in types, no probe yet                          |
| `go:encoding/binary`                |   ❌    | —                                                      | Binary packing / varints; not declared in types, no probe yet                 |
| `go:encoding/csv`                   |   ❌    | —                                                      | CSV read/write; not declared in types, no probe yet                           |
| `go:encoding/gob`                   |   ❌    | —                                                      | Go binary serialization; not declared in types, no probe yet                  |
| `go:encoding/hex`                   |   ❌    | —                                                      | hex encoding; not declared in types, no probe yet                             |
| `go:encoding/json`                  |   ❌    | —                                                      | JSON encode/decode; not declared in types, no probe yet                       |
| `go:encoding/pem`                   |   ❌    | —                                                      | PEM encoding; not declared in types, no probe yet                             |
| `go:encoding/xml`                   |   ❌    | —                                                      | XML read/write; not declared in types, no probe yet                           |
| `go:errors`                         |   ❌    | —                                                      | Error creation / wrapping / inspection; not declared in types, no probe yet   |
| `go:expvar`                         |   ❌    | —                                                      | Public process variables; not declared in types, no probe yet                 |
| `go:flag`                           |   ❌    | —                                                      | Command-line flag parsing; not declared in types, no probe yet                |
| `go:go/ast`                         |   ❌    | —                                                      | Go syntax tree; not declared in types, no probe yet                           |
| `go:go/build`                       |   ❌    | —                                                      | Go package build metadata; not declared in types, no probe yet                |
| `go:go/build/constraint`            |   ❌    | —                                                      | Build-tag constraint parsing; not declared in types, no probe yet             |
| `go:go/constant`                    |   ❌    | —                                                      | Untyped constant values; not declared in types, no probe yet                  |
| `go:go/doc`                         |   ❌    | —                                                      | Go doc extraction; not declared in types, no probe yet                        |
| `go:go/doc/comment`                 |   ❌    | —                                                      | Doc comment parse/print; not declared in types, no probe yet                  |
| `go:go/format`                      |   ❌    | —                                                      | Go source formatting; not declared in types, no probe yet                     |
| `go:go/importer`                    |   ❌    | —                                                      | Export-data type importer; not declared in types, no probe yet                |
| `go:go/parser`                      |   ❌    | —                                                      | Go source parser; not declared in types, no probe yet                         |
| `go:go/printer`                     |   ❌    | —                                                      | Go AST printer; not declared in types, no probe yet                           |
| `go:go/scanner`                     |   ❌    | —                                                      | Go tokenizer; not declared in types, no probe yet                             |
| `go:go/token`                       |   ❌    | —                                                      | Go tokens / positions; not declared in types, no probe yet                    |
| `go:go/types`                       |   ❌    | —                                                      | Go type checker; not declared in types, no probe yet                          |
| `go:go/version`                     |   ❌    | —                                                      | Go version comparison; not declared in types, no probe yet                    |
| `go:hash`                           |   ❌    | —                                                      | Hash function interface; not declared in types, no probe yet                  |
| `go:hash/adler32`                   |   ❌    | —                                                      | Adler-32 checksum; not declared in types, no probe yet                        |
| `go:hash/crc32`                     |   ❌    | —                                                      | CRC-32 checksum; not declared in types, no probe yet                          |
| `go:hash/crc64`                     |   ❌    | —                                                      | CRC-64 checksum; not declared in types, no probe yet                          |
| `go:hash/fnv`                       |   ❌    | —                                                      | FNV-1 / FNV-1a hash; not declared in types, no probe yet                      |
| `go:hash/maphash`                   |   ❌    | —                                                      | Seeded string hashing; not declared in types, no probe yet                    |
| `go:html`                           |   ❌    | —                                                      | HTML escaping; not declared in types, no probe yet                            |
| `go:html/template`                  |   ❌    | —                                                      | HTML templating (auto-escaped); not declared in types, no probe yet           |
| `go:image`                          |   ❌    | —                                                      | 2D image interface; not declared in types, no probe yet                       |
| `go:image/color`                    |   ❌    | —                                                      | Color types; not declared in types, no probe yet                              |
| `go:image/color/palette`            |   ❌    | —                                                      | Standard color palettes; not declared in types, no probe yet                  |
| `go:image/draw`                     |   ❌    | —                                                      | Image compositing; not declared in types, no probe yet                        |
| `go:image/gif`                      |   ❌    | —                                                      | GIF decode/encode; not declared in types, no probe yet                        |
| `go:image/jpeg`                     |   ❌    | —                                                      | JPEG decode/encode; not declared in types, no probe yet                       |
| `go:image/png`                      |   ❌    | —                                                      | PNG decode/encode; not declared in types, no probe yet                        |
| `go:index/suffixarray`              |   ❌    | —                                                      | Suffix-array substring search; not declared in types, no probe yet            |
| `go:io`                             |   ❌    | —                                                      | Core I/O interfaces (Reader/Writer); not declared in types, no probe yet      |
| `go:io/fs`                          |   ❌    | —                                                      | Filesystem abstraction; not declared in types, no probe yet                   |
| `go:io/ioutil`                      |   ❌    | —                                                      | Deprecated I/O helpers (Go 1.16); not declared in types, no probe yet         |
| `go:iter`                           |   ❌    | —                                                      | Range-over-func iterator types; not declared in types, no probe yet           |
| `go:log`                            |   ❌    | —                                                      | Leveled logging to stderr; not declared in types, no probe yet                |
| `go:log/slog`                       |   ❌    | —                                                      | Structured logging; not declared in types, no probe yet                       |
| `go:log/syslog`                     |   ❌    | —                                                      | syslog client (Unix only); not declared in types, no probe yet                |
| `go:maps`                           |   ❌    | —                                                      | Generic map utilities; not declared in types, no probe yet                    |
| `go:math`                           |   ❌    | —                                                      | Float math functions; not declared in types, no probe yet                     |
| `go:math/big`                       |   ❌    | —                                                      | Arbitrary-precision arithmetic; not declared in types, no probe yet           |
| `go:math/bits`                      |   ❌    | —                                                      | Bit counting / manipulation; not declared in types, no probe yet              |
| `go:math/cmplx`                     |   ❌    | —                                                      | Complex-number math; not declared in types, no probe yet                      |
| `go:math/rand`                      |   ❌    | —                                                      | Pseudo-random generator (legacy); not declared in types, no probe yet         |
| `go:math/rand/v2`                   |   ❌    | —                                                      | Pseudo-random generator (v2); not declared in types, no probe yet             |
| `go:mime`                           |   ❌    | —                                                      | MIME type lookup; not declared in types, no probe yet                         |
| `go:mime/multipart`                 |   ❌    | —                                                      | multipart/form-data parsing; not declared in types, no probe yet              |
| `go:mime/quotedprintable`           |   ❌    | —                                                      | quoted-printable encoding; not declared in types, no probe yet                |
| `go:net`                            |   ❌    | —                                                      | Network I/O (TCP/UDP/Unix sockets); not declared in types, no probe yet       |
| `go:net/http`                       |   ❌    | —                                                      | HTTP client / server; not declared in types, no probe yet                     |
| `go:net/http/cgi`                   |   ❌    | —                                                      | CGI handler support; not declared in types, no probe yet                      |
| `go:net/http/cookiejar`             |   ❌    | —                                                      | HTTP cookie storage; not declared in types, no probe yet                      |
| `go:net/http/fcgi`                  |   ❌    | —                                                      | FastCGI server; not declared in types, no probe yet                           |
| `go:net/http/httptest`              |   ❌    | —                                                      | HTTP test helpers; not declared in types, no probe yet                        |
| `go:net/http/httptrace`             |   ❌    | —                                                      | HTTP request tracing; not declared in types, no probe yet                     |
| `go:net/http/httputil`              |   ❌    | —                                                      | HTTP utilities (reverse proxy); not declared in types, no probe yet           |
| `go:net/http/pprof`                 |   ❌    | —                                                      | Profiling endpoints over HTTP; not declared in types, no probe yet            |
| `go:net/mail`                       |   ❌    | —                                                      | RFC 5322 address parsing; not declared in types, no probe yet                 |
| `go:net/netip`                      |   ❌    | —                                                      | IP address / prefix types; not declared in types, no probe yet                |
| `go:net/rpc`                        |   ❌    | —                                                      | Go RPC; not declared in types, no probe yet                                   |
| `go:net/rpc/jsonrpc`                |   ❌    | —                                                      | JSON-RPC codec for net/rpc; not declared in types, no probe yet               |
| `go:net/smtp`                       |   ❌    | —                                                      | SMTP client; not declared in types, no probe yet                              |
| `go:net/textproto`                  |   ❌    | —                                                      | Text-based protocol helpers; not declared in types, no probe yet              |
| `go:net/url`                        |   ❌    | —                                                      | URL parsing / building; not declared in types, no probe yet                   |
| `go:os`                             |   ❌    | —                                                      | OS functions (files, env, process); not declared in types, no probe yet       |
| `go:os/exec`                        |   ❌    | —                                                      | External command execution; not declared in types, no probe yet               |
| `go:os/signal`                      |   ❌    | —                                                      | OS signal handling; not declared in types, no probe yet                       |
| `go:os/user`                        |   ❌    | —                                                      | User / group lookup; not declared in types, no probe yet                      |
| `go:path`                           |   ❌    | —                                                      | Slash-separated path utilities; not declared in types, no probe yet           |
| `go:path/filepath`                  |   ❌    | —                                                      | OS-specific file paths; not declared in types, no probe yet                   |
| `go:plugin`                         |   ❌    | —                                                      | Go plugin loading (cgo; Linux/macOS/BSD); not declared in types, no probe yet |
| `go:reflect`                        |   ❌    | —                                                      | Runtime reflection; not declared in types, no probe yet                       |
| `go:regexp`                         |   ❌    | —                                                      | Regular expressions (RE2); not declared in types, no probe yet                |
| `go:regexp/syntax`                  |   ❌    | —                                                      | Regex syntax parsing; not declared in types, no probe yet                     |
| `go:runtime`                        |   ❌    | —                                                      | Runtime introspection (GC, goroutines); not declared in types, no probe yet   |
| `go:runtime/coverage`               |   ❌    | —                                                      | Coverage counter writing; not declared in types, no probe yet                 |
| `go:runtime/debug`                  |   ❌    | —                                                      | Debug controls (stack dump, GC tuning); not declared in types, no probe yet   |
| `go:runtime/metrics`                |   ❌    | —                                                      | Runtime metrics; not declared in types, no probe yet                          |
| `go:runtime/pprof`                  |   ❌    | —                                                      | CPU / memory profiling; not declared in types, no probe yet                   |
| `go:runtime/race`                   |   ❌    | —                                                      | Race detector interaction; not declared in types, no probe yet                |
| `go:runtime/trace`                  |   ❌    | —                                                      | Execution tracing; not declared in types, no probe yet                        |
| `go:slices`                         |   ❌    | —                                                      | Generic slice utilities; not declared in types, no probe yet                  |
| `go:sort`                           |   ❌    | —                                                      | Sorting; not declared in types, no probe yet                                  |
| `go:structs`                        |   ❌    | —                                                      | Struct layout annotations; not declared in types, no probe yet                |
| `go:sync`                           |   ❌    | —                                                      | Sync primitives (Mutex, WaitGroup); not declared in types, no probe yet       |
| `go:sync/atomic`                    |   ❌    | —                                                      | Atomic memory operations; not declared in types, no probe yet                 |
| `go:syscall`                        |   ❌    | —                                                      | Raw system call interface; not declared in types, no probe yet                |
| `go:testing`                        |   ❌    | —                                                      | Test / benchmark harness; not declared in types, no probe yet                 |
| `go:testing/cryptotest`             |   ❌    | —                                                      | FIPS crypto test helpers; not declared in types, no probe yet                 |
| `go:testing/fstest`                 |   ❌    | —                                                      | In-memory filesystem maps; not declared in types, no probe yet                |
| `go:testing/iotest`                 |   ❌    | —                                                      | Reader / writer test shims; not declared in types, no probe yet               |
| `go:testing/quick`                  |   ❌    | —                                                      | Property-based testing; not declared in types, no probe yet                   |
| `go:testing/slogtest`               |   ❌    | —                                                      | slog handler testing; not declared in types, no probe yet                     |
| `go:testing/synctest`               |   ❌    | —                                                      | Deterministic async testing; not declared in types, no probe yet              |
| `go:text/scanner`                   |   ❌    | —                                                      | Generic token scanning; not declared in types, no probe yet                   |
| `go:text/tabwriter`                 |   ❌    | —                                                      | Column-aligned text output; not declared in types, no probe yet               |
| `go:text/template`                  |   ❌    | —                                                      | Data-driven text templating; not declared in types, no probe yet              |
| `go:text/template/parse`            |   ❌    | —                                                      | Template parse tree; not declared in types, no probe yet                      |
| `go:time`                           |   ❌    | —                                                      | Dates, durations, timers; not declared in types, no probe yet                 |
| `go:time/tzdata`                    |   ❌    | —                                                      | Embedded timezone database; not declared in types, no probe yet               |
| `go:unicode`                        |   ❌    | —                                                      | Unicode properties / tables; not declared in types, no probe yet              |
| `go:unicode/utf16`                  |   ❌    | —                                                      | UTF-16 encoding; not declared in types, no probe yet                          |
| `go:unicode/utf8`                   |   ❌    | —                                                      | UTF-8 encoding; not declared in types, no probe yet                           |
| `go:unique`                         |   ❌    | —                                                      | Interned canonical values; not declared in types, no probe yet                |
| `go:unsafe`                         |   ❌    | —                                                      | Unsafe pointers / memory layout; not declared in types, no probe yet          |
| `go:weak`                           |   ❌    | —                                                      | Weak pointers; not declared in types, no probe yet                            |

### npm packages

| Pattern                   | Status | Probe                                                    | Notes                                                                                             |
| ------------------------- | :----: | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `import { x } from 'pkg'` |   ✅    | [syntax-import-npm.ts](conformance/syntax-import-npm.ts) | Mapped to Go module imports (fixture dep in [conformance/package.json](conformance/package.json)) |

## Roadmap (known limitations)

- `import.meta.url` is not lowered.
