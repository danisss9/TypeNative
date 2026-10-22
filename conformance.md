# Conformance

Every TypeScript language feature and standard-library API TypeNative aims to
support, split by area. Each ✅ row links to the [conformance/](conformance/)
probe that proves it transpiles correctly (`npm run conformance`, filter with an
optional substring: `node scripts/conformance.mjs <filter>`; `--native` runs the
self-hosted binary).

| Status | Meaning |
| :----: | ------- |
| ✅ | Implemented; the linked probe proves it (`—` in the Probe column: implemented, not probed yet) |
| ❌ | Not implemented yet, but feasible: a known gap |
| 🚫 | Will not be implemented: needs something a native Go binary doesn't have (a JavaScript engine, mutable prototypes, shared memory between isolates, cgo), or is deprecated upstream |

User programs are type-checked against [types/](types/) only (`lib: []`), so an API that isn't
declared there fails the type check before it reaches the transpiler. The
[roadmap](#roadmap-known-limitations) lists the structural limitations and the order in which the
❌ rows are planned.

## Basic types

| Feature                                        | Status | Probe                                                                | Notes                                                                     |
| ---------------------------------------------- | :----: | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `number`                                       |   ✅    | [syntax-arithmetic.ts](conformance/syntax-arithmetic.ts)             | Transpiled to `float64`                                                   |
| `boolean`                                      |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)               | Transpiled to `bool`                                                      |
| `string`                                       |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)               |                                                                           |
| `null`                                         |   ✅    | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts)     |                                                                           |
| `undefined`                                    |   ✅    | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts)     |                                                                           |
| `any` / `unknown`                              |   ✅    | [syntax-selfhost-context.ts](conformance/syntax-selfhost-context.ts) | Dynamic values handled at runtime (JSON-like objects, arrays, primitives) |
| A variable declared `any` / `unknown` with a primitive initializer (`const x: any = '6'`) | ✅ | [semantics-any-variables.ts](conformance/semantics-any-variables.ts) | Dynamic: `-` `*` `/` use ToNumber, `==` coerces like JS, reassignment to another type works. `any + number` adds numbers (a string operand isn't concatenated); objects keep their inferred type |
| Nullable types (`T \| null`, `T \| undefined`) |   ✅    | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts)     | Transpiled to Go pointer types                                            |
| `bigint`                                       |   ✅    | [syntax-bigint.ts](conformance/syntax-bigint.ts)                     | `2n` literals → `*big.Int`; `**` → `.Exp`, comparisons via `.Cmp`         |
| `bigint` bitwise / shift operators (`&`, `\|`, `^`, `~`, `<<`, `>>`, compound forms) | ✅ | [syntax-bigint-bitwise.ts](conformance/syntax-bigint-bitwise.ts) | `math/big`'s two's-complement `And` / `Or` / `Xor` / `Not`; shifts round toward -Infinity |
| `BigInt()`, `BigInt.asIntN` / `asUintN` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | Integers, numeric strings and booleans; a fraction throws a `RangeError`, a bad string a `SyntaxError` |
| bigint–number loose comparisons (`5n == 5`) | ❌ | — | `false` (no cross-type coercion) |
| `symbol`                                       |   ✅    | [syntax-symbols.ts](conformance/syntax-symbols.ts)                   | `Symbol()` → unique `*TnSymbol` pointers, usable as record keys           |
| `object` type                                  |   ✅    | [syntax-object-type.ts](conformance/syntax-object-type.ts)           | `object` → `interface{}`                                                  |
| `void` / `never`                               |   ✅    | [syntax-void-never.ts](conformance/syntax-void-never.ts)             | No return value in Go                                                     |

## Variables & destructuring

| Feature                                 | Status | Probe                                                                            | Notes                                                                    |
| --------------------------------------- | :----: | -------------------------------------------------------------------------------- | ---------------------------------------------------                      |
| Variable declarations (`let` / `const`) |   ✅    | [syntax-variables.ts](conformance/syntax-variables.ts)                           |                                                                          |
| Array destructuring                     |   ✅    | [syntax-destructuring.ts](conformance/syntax-destructuring.ts)                   | Parenthesized initializers; elision and element/property reads           |
| Object destructuring                    |   ✅    | [syntax-destructuring.ts](conformance/syntax-destructuring.ts)                   | Parenthesized initializers; elision and element/property reads; the initializer is evaluated once ([lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts)) |
| Destructuring with defaults             |   ✅    | [syntax-destructuring-defaults.ts](conformance/syntax-destructuring-defaults.ts) | Missing elements/properties take defaults (nil- and bounds-checked)      |
| Destructured parameters                 |   ✅    | [syntax-destructuring-params.ts](conformance/syntax-destructuring-params.ts)     | `function f({ a, b }: T)`, `([x, y]: number[])`                          |
| Object shorthand                        |   ✅    | [lib-go-container-heap.ts](conformance/lib-go-container-heap.ts)                 | `{ name, priority }` takes the fields from same-named variables          |
| Object spread                           |   ✅    | [syntax-object-spread.ts](conformance/syntax-object-spread.ts)                   | Spread sources copied field-by-field into the new struct                 |
| Array spread                            |   ✅    | [syntax-array-spread.ts](conformance/syntax-array-spread.ts)                     | `[...arr]`, `fn(...args)`                                                |
| `delete` operator                       |   ✅    | [syntax-delete.ts](conformance/syntax-delete.ts)                                 | `delete o.key` on records                                                |
| Computed keys                           |   ✅    | [syntax-computed-keys.ts](conformance/syntax-computed-keys.ts)                   | Computed keys become map entries; `o.name` reads lower to `.Get("name")` |
| Records / dictionaries                  |   ✅    | [syntax-in-operator.ts](conformance/syntax-in-operator.ts)                       | `Record<K, V>` and objects indexed by key → Go maps; so are literals with keys that aren't identifiers (`{ 'Content-Type': … }`, [lib-node-http-server.ts](conformance/lib-node-http-server.ts)) |
| Reading a missing key of a `Record` / `Map` of primitives (`rec[k] === undefined`) | ❌ | — | Gives the value type's zero value (`""`, `0`), so the comparison is `false`; test with `k in rec` / `map.has(k)` |
| Tuples                                  |   ✅    | [syntax-tuples.ts](conformance/syntax-tuples.ts)                                 | `[string, number]` fixed-length arrays                                   |
| Top-level / module-scope variables      |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)               | Functions see main-file top-level variables                              |
| Numeric separators                      |   ✅    | [syntax-numeric-separators.ts](conformance/syntax-numeric-separators.ts)         | `1_000_000`                                                              |
| Hex / octal / binary literals           |   ✅    | [syntax-numeric-literals.ts](conformance/syntax-numeric-literals.ts)             | `0xFF`, `0o17`, `0b1010`, `1e3`                                          |
| `var` declarations (hoisting)           |   ✅    | [syntax-var.ts](conformance/syntax-var.ts)                                       | Function- and module-level `var`                                         |
| `using` / `await using` declarations    |   ✅    | [syntax-using.ts](conformance/syntax-using.ts)                                   | Disposed in reverse order when the block ends (`defer`); `[Symbol.dispose]` methods |
| Writing past the end of an array (`arr[arr.length + 2] = x`) | ✅ | [semantics-array-growth.ts](conformance/semantics-array-growth.ts) | The array grows; holes read as the zero value (`0`, `""`), not `undefined` |
| Sparse-array holes | 🚫 | — | Slices have no holes: a hole would read as the zero value, not `undefined` |

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
| `typeof`                     |   ✅    | [syntax-typeof.ts](conformance/syntax-typeof.ts)                             | `typeof x === "string"`; `"function"` for function values                    |
| `instanceof`                 |   ✅    | [syntax-instanceof.ts](conformance/syntax-instanceof.ts)                     | User classes, `Error` classes and Node globals (`URL`, `Uint8Array`, …)      |
| JS truthiness                |   ✅    | [syntax-optional-params.ts](conformance/syntax-optional-params.ts)           | `if (str)`, `!count`, `a \|\| fallback` on any type                          |
| Loose equality (`==`)        |   ✅    | [semantics-loose-equality.ts](conformance/semantics-loose-equality.ts), [semantics-any-variables.ts](conformance/semantics-any-variables.ts) | `bool`/`number`/`string` mixtures coerce like JS (`TnNumber`/`TnParseFloat`), also between `any` values (`TnLooseEqual`) |
| Optional call (`fn?.()`)     |   ✅    | [syntax-optional-call.ts](conformance/syntax-optional-call.ts)               | Nil check on the function value; result is nullable                          |
| Comma operator               |   ✅    | [syntax-comma-operator.ts](conformance/syntax-comma-operator.ts)             | In `for` headers (`i = 0, j = 10` / `i++, j--`)                              |
| `void` operator              |   ✅    | [syntax-void-operator.ts](conformance/syntax-void-operator.ts)               | Evaluates, then `nil`                                                        |
| `new.target`                 |   ✅    | [syntax-new-target.ts](conformance/syntax-new-target.ts)                     | Constructors pass the target class name through `super()` chains             |
| `instanceof Map` / `Set` / `Date` / `Array`, subclass instances | ✅ | [syntax-instanceof-builtins.ts](conformance/syntax-instanceof-builtins.ts) | Maps and Sets made by `new Map()` / `new Set()` are tagged (records are not Maps); arrays exclude Buffers; `instanceof Parent` holds for subclass instances |
| `#x in obj` (private brand checks) | ✅ | [syntax-instanceof-builtins.ts](conformance/syntax-instanceof-builtins.ts) | An instance of the class declaring `#x`, or of a subclass |

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
| `for await...of`                    |   ✅    | [syntax-for-await.ts](conformance/syntax-for-await.ts)                                                         | Ranges over the async generator's channel                                  |
| `while` loops                       |   ✅    | [syntax-loops.ts](conformance/syntax-loops.ts)                                                                 | Transpiled to Go's `for` loops; assignment in condition                    |
| `do...while` loops                  |   ✅    | [syntax-do-while.ts](conformance/syntax-do-while.ts)                                                           | Implemented with conditional break                                         |
| Labeled loops                       |   ✅    | [syntax-labeled-loops.ts](conformance/syntax-labeled-loops.ts)                                                 | `LabeledStatement` → Go labels; labeled `continue`/`break`                 |
| `try` / `catch` / `finally`         |   ✅    | [syntax-try-catch-finally.ts](conformance/syntax-try-catch-finally.ts)                                         | `throw` → `panic`; catch/finally via `defer`/`recover`                     |
| Optional catch binding (`catch {}`) |   ✅    | [syntax-try-catch-finally.ts](conformance/syntax-try-catch-finally.ts)                                         |                                                                            |
| Custom error classes                |   ✅    | [syntax-custom-errors.ts](conformance/syntax-custom-errors.ts)                                                 | `extends Error` → embedded `TnError`; constructors take the message        |
| `Error.message`                     |   ✅    | [syntax-error-message.ts](conformance/syntax-error-message.ts)                                                 | `throw new Error` panics with a `*TnError`; `.message` on caught values    |
| `Error` `cause` (`new Error(message, { cause })`, `err.cause`) |   ✅    | [lib-node-fetch-bad-port.ts](conformance/lib-node-fetch-bad-port.ts) | Built-in error classes too |
| Narrowing                           |   ✅    | [syntax-typeof.ts](conformance/syntax-typeof.ts)                                                               | `T \| undefined` narrowed after `if (x)`, `x !== undefined`, early returns |
| Exhaustive `switch` without `default`; statements after a `switch` | ✅ | [syntax-switch-exhaustive.ts](conformance/syntax-switch-exhaustive.ts) | A function that can end without a `return` returns its result type's zero value (JS: `undefined`) |
| Labeled blocks and statements (`label: { … break label; }`) | ✅ | [syntax-labeled-blocks.ts](conformance/syntax-labeled-blocks.ts) | `break label` jumps past the statement (`goto`) |
| Throwing non-`Error` values (`throw 'x'`, `throw { code: 1 }`) | ✅ | — | Caught as `interface{}`; properties read dynamically |
| `debugger` | ✅ | — | Erased |
| `with` | 🚫 | — | Not allowed in strict mode (modules are strict) |

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
| Recursive arrow functions                     |   ✅    | [syntax-recursive-arrow.ts](conformance/syntax-recursive-arrow.ts)           | `const f = () => … f() …` → declared, then assigned                                 |
| Generators (`function*` / `yield` / `yield*`) |   ✅    | [syntax-generators.ts](conformance/syntax-generators.ts)                     | `function*` runs in a goroutine sending yields over a channel; `for...of` ranges it |
| Async generators (`async function*`)          |   ✅    | [syntax-async-generators.ts](conformance/syntax-async-generators.ts)         | Goroutine + channel, consumed with `for await`                                      |
| Custom iterators (`Symbol.iterator`)          |   ✅    | [syntax-custom-iterators.ts](conformance/syntax-custom-iterators.ts)         | `*[Symbol.iterator]()` → a `Symbol_iterator()` channel method                       |
| `as const` assertions                         |   ✅    | [syntax-as-const.ts](conformance/syntax-as-const.ts)                         | Erased during transpilation                                                         |
| Function overloads                            |   ✅    | [syntax-function-overloads.ts](conformance/syntax-function-overloads.ts)     | Signatures are erased; the implementation is emitted                                |
| `this` parameter (`function f(this: T)`)      |   ✅    | [syntax-this-parameter.ts](conformance/syntax-this-parameter.ts)             | Erased                                                                              |
| `arguments` object                            |   ✅    | [syntax-arguments.ts](conformance/syntax-arguments.ts)                       | Functions reading it take extra arguments variadically (`[]interface{}`)            |
| Top-level `await` | ✅ | — | In modules (files with an `import` / `export`) |
| Generator `next()` | ✅ | [lib-iterator-helpers.ts](conformance/lib-iterator-helpers.ts) | `{ value, done }` |
| Generator `next(value)` (sending a value in) / `return()` / `throw()` | ❌ | — | Generators are goroutines feeding a channel: values only flow out |
| `fn.call` / `fn.apply` / `fn.bind` | ✅ | [syntax-function-values.ts](conformance/syntax-function-values.ts) | Function declarations and function values; `apply` spreads the array over the parameters; `thisArg` is ignored (methods taken from an object are already bound in Go) |
| `fn.name` / `fn.length` | ✅ | [syntax-function-values.ts](conformance/syntax-function-values.ts) | Known at compile time for declared functions, classes and function variables |
| `eval` / `new Function(…)` | 🚫 | — | Compile and run JavaScript at runtime: needs a JavaScript engine |

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
| Private `#` fields                                               |   ✅    | [syntax-class-private-fields.ts](conformance/syntax-class-private-fields.ts)             | `#secret` → a `__secret` struct field, left out of `JSON.stringify` and `console.log`  |
| Access modifiers (`private` / `protected` / `public` on members) |   ✅    | [syntax-access-modifiers.ts](conformance/syntax-access-modifiers.ts)                     | `private` / `protected` / `public` are erased                                           |
| Abstract classes                                                 |   ✅    | [syntax-class-abstract.ts](conformance/syntax-class-abstract.ts)                         | Abstract members skipped; concrete methods copied onto subclasses                       |
| Static initialization blocks (`static {}`)                       |   ✅    | [syntax-static-blocks.ts](conformance/syntax-static-blocks.ts)                           | Go `func init()`                                                                        |
| Class expressions (`const C = class {}`)                         |   ✅    | [syntax-class-expressions.ts](conformance/syntax-class-expressions.ts)                   | `const C = class {…}` becomes a class named after the variable                          |
| Interfaces                                                       |   ✅    | [syntax-class-implements.ts](conformance/syntax-class-implements.ts)                     | Transpiled to Go interfaces                                                             |
| Optional properties                                              |   ✅    | [syntax-optional-chaining.ts](conformance/syntax-optional-chaining.ts)                   | `prop?: Type` in interfaces/types                                                       |
| Type-aware method dispatch                                       |   ✅    | [semantics-method-dispatch.ts](conformance/semantics-method-dispatch.ts)                 | Class `.push()` / `.length` not confused with array builtins                            |
| Index signatures (`[key: string]: T`)                            |   ✅    | [syntax-index-signatures.ts](conformance/syntax-index-signatures.ts)                     | `{ [k: K]: V }` is `Record<K, V>` (an ordered Go map)                                   |
| Methods without a return-type annotation | ✅ | [syntax-method-return-inference.ts](conformance/syntax-method-return-inference.ts) | Inferred from the returns, as for functions (also returns nested in `if` / loops / `switch` / `try`); an inherited `return this` returns the subclass |
| Field initializers reading parameter properties or parent fields | ✅ | [syntax-class-field-order.ts](conformance/syntax-class-field-order.ts) | `super()`, then parameter properties, then field initializers, then the constructor body (TS's ES2020 order) |
| Arrow-function fields (`h = () => this.x`), fields reading earlier fields | ✅ | — | Run in the constructor; `this` is the instance |
| Private methods (`#m()`) | ✅ | [syntax-method-return-inference.ts](conformance/syntax-method-return-inference.ts) | |
| A private and a public member with the same name (`#x` and `x`) | ✅ | [syntax-private-public-names.ts](conformance/syntax-private-public-names.ts) | `#x` is the Go field `__x` |
| Private accessors (`get #x()`) / static private fields (`static #x`) | ✅ | [syntax-class-accessor-inheritance.ts](conformance/syntax-class-accessor-inheritance.ts), [syntax-class-static-inheritance.ts](conformance/syntax-class-static-inheritance.ts) | |
| `accessor` fields | ✅ | — | Plain fields (decorating them is not supported) |
| Static inheritance (`Child.staticOfParent()`) | ✅ | [syntax-class-static-inheritance.ts](conformance/syntax-class-static-inheritance.ts) | Resolved to the declaring class's `Parent_member` at compile time |
| Inherited getters / setters, `super.x` on accessors | ✅ | [syntax-class-accessor-inheritance.ts](conformance/syntax-class-accessor-inheritance.ts) | Accessors are copied onto subclasses like methods |
| Object-literal setters (`set x(v) {}`) | ✅ | [syntax-object-setters.ts](conformance/syntax-object-setters.ts) | A `Set_x` closure field: `o.x = v` calls it |
| Mixins (class factories, `return class extends Base {}`, `class extends f()`) | ❌ | — | `Unsupported syntax: ClassExpression` outside `const C = class {}` |
| Polymorphic `this` return types (fluent chains) | ✅ | [syntax-polymorphic-this.ts](conformance/syntax-polymorphic-this.ts) | `this` is the class; methods inherited by a subclass return the subclass |
| Dynamic keys on class instances and typed objects (`inst[key]`) | ✅ | [syntax-instance-keys.ts](conformance/syntax-instance-keys.ts) | A `switch` over the declared fields and getters (reads and writes); through `any`, reflection |
| Declaration merging (interface + interface, enum + enum, class + interface) | ✅ | [syntax-declaration-merging.ts](conformance/syntax-declaration-merging.ts) | Merged within one scope; an interface adds its properties to a same-named class as fields; namespace + function merging works too |
| Prototype mutation (`C.prototype.m = …`, `Object.setPrototypeOf`, `util.inherits`) | 🚫 | — | Classes are static Go structs with fixed method sets |

## Generics

| Feature                                                       | Status | Probe                                                                  | Notes                                                          |
| ------------------------------------------------------------- | :----: | ---------------------------------------------------------------------- | ----------------------------------                             |
| Generic functions                                             |   ✅    | [syntax-generic-functions.ts](conformance/syntax-generic-functions.ts) | Type parameters → Go generics; call sites infer from arguments |
| Generic classes                                               |   ✅    | [syntax-generic-classes.ts](conformance/syntax-generic-classes.ts)     | Type parameters via Go generics                                |
| Generic constraints (`<T extends U>`)                         |   ✅    | [syntax-generic-constraints.ts](conformance/syntax-generic-constraints.ts) | Object-type bounds become `any`; properties of `T` values read dynamically |
| Default type parameters (`<T = D>`)                           |   ✅    | [syntax-generic-defaults.ts](conformance/syntax-generic-defaults.ts)   | Defaults are erased; Go infers from arguments                  |
| Generic interfaces / type aliases                             |   ✅    | [syntax-generic-interfaces.ts](conformance/syntax-generic-interfaces.ts) | Go generic structs; literals instantiate them (`Box[float64]{…}`) |
| `const` type parameters / variance annotations (`in` / `out`) |   ✅    | [syntax-const-type-parameters.ts](conformance/syntax-const-type-parameters.ts) | Erased; object literals of method interfaces use an adapter struct |

## Enums

| Feature                               | Status | Probe                                                        | Notes                                                                   |
| ------------------------------------- | :----: | ------------------------------------------------------------ | --------------------------------------------                            |
| Numeric enums                         |   ✅    | [syntax-enum-numeric.ts](conformance/syntax-enum-numeric.ts) | Numeric members are `float64` constants; string enums keep a named type |
| String enums                          |   ✅    | [syntax-enum-string.ts](conformance/syntax-enum-string.ts)   | `enum` declarations and member access                                   |
| `const enum`                          |   ✅    | [syntax-const-enum.ts](conformance/syntax-const-enum.ts)     | Compiled like a regular enum                                            |
| Computed / heterogeneous enum members |   ✅    | [syntax-enum-computed.ts](conformance/syntax-enum-computed.ts) | Computed members assigned in source order; mixed enums keep each member's type |
| Reverse mapping (`Color[0]`), `Enum['Member']` | ✅ | [syntax-enum-reverse.ts](conformance/syntax-enum-reverse.ts) | A generated `Color__name` function: the last member with the value wins; an unknown value gives `""` (JS: `undefined`). String enum members concatenate and print as strings |

## Type-system features

| Feature                                                   | Status | Probe                                                                | Notes                                                                           |
| --------------------------------------------------------- | :----: | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Type aliases                                              |   ✅    | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts)         | `type P = { x: number }` → Go struct; alias-of-alias                            |
| Union types                                               |   ✅    | [syntax-union-types.ts](conformance/syntax-union-types.ts)           | Narrowed via `typeof` checks                                                    |
| Type guards (`is`)                                        |   ✅    | [syntax-type-guards.ts](conformance/syntax-type-guards.ts)           | `p is T` → Go `bool`; `in` checks struct fields at runtime                      |
| `as` assertions                                           |   ✅    | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts)         | `x as T`, incl. angle-bracket syntax (`<T>x`); `any` values convert to `T`          |
| Self-host contextual typing                               |   ✅    | [syntax-selfhost-context.ts](conformance/syntax-selfhost-context.ts) | Object/array literals typed from context, `Record` literals, `in`, `any` params |
| Decorators (`@`)                                          |   ✅    | [syntax-decorators.ts](conformance/syntax-decorators.ts)             | Standard method & class decorators, applied in source order; `this` is the receiver |
| Field / accessor / parameter decorators, `context.addInitializer`, `Symbol.metadata` | ❌ | — | Only method and class decorators: field and accessor decorators fail the type check (`ClassFieldDecoratorContext` / `ClassAccessorDecoratorContext` are not declared) |
| Namespaces / `module` blocks                              |   ✅    | [syntax-namespaces.ts](conformance/syntax-namespaces.ts)             | Flattened to prefixed declarations (`N.f` → `N_f`), nested and in types         |
| `override` modifier                                       |   ✅    | [syntax-override.ts](conformance/syntax-override.ts)                 | Erased                                                                          |
| `readonly` modifier (properties, `readonly T[]`)          |   ✅    | [syntax-readonly.ts](conformance/syntax-readonly.ts)                 | Erased (`readonly T[]` → `[]T`)                                                 |
| `satisfies` operator                                      |   ✅    | [syntax-satisfies.ts](conformance/syntax-satisfies.ts)               | Checked by tsc, erased; the type guides literals                                |
| `keyof` / mapped types                                    |   ✅    | [syntax-keyof-mapped-types.ts](conformance/syntax-keyof-mapped-types.ts) | `keyof` → `string`; mapped types → structs (literal keys) or maps               |
| Conditional types                                         |   ✅    | [syntax-conditional-types.ts](conformance/syntax-conditional-types.ts) | Resolved to their branch's Go type                                              |
| `infer` types                                             |   ✅    | [syntax-infer-types.ts](conformance/syntax-infer-types.ts)           | Resolved to their branch's Go type                                              |
| `import type` / `export type`                             |   ✅    | [syntax-import-type.ts](conformance/syntax-import-type.ts)           | Type-only imports are erased                                                    |
| Intersection types (`A & B`)                              |   ✅    | [syntax-intersection-types.ts](conformance/syntax-intersection-types.ts) | Object types merge into one struct                                              |
| Literal types (`'a' \| 'b'`)                              |   ✅    | [syntax-literal-types.ts](conformance/syntax-literal-types.ts)       | Erased; string/number/boolean literals map to their base Go types              |
| Tuple optional / rest / labeled elements                  |   ✅    | [syntax-tuple-elements.ts](conformance/syntax-tuple-elements.ts)     | Tuples are slices                                                               |
| Indexed access types (`T['k']`)                           |   ✅    | [syntax-indexed-access-types.ts](conformance/syntax-indexed-access-types.ts) | `T['k']` resolves to the member type                                            |
| Type-level `typeof` (`typeof obj`)                        |   ✅    | [syntax-type-typeof.ts](conformance/syntax-type-typeof.ts)           | The variable's Go type                                                          |
| Template literal types                                    |   ✅    | [syntax-template-literal-types.ts](conformance/syntax-template-literal-types.ts) | Template literal types → `string`                                               |
| Utility types (`Partial`, `Pick`, `Omit`, …)              |   ✅    | [syntax-utility-types.ts](conformance/syntax-utility-types.ts)       | `Partial` / `Required` / `Readonly` / `Pick` / `Omit` / `NonNullable` → the base type |
| Assertion functions (`asserts x is T`)                    |   ✅    | [syntax-assertion-functions.ts](conformance/syntax-assertion-functions.ts) | No return value                                                                 |
| Callable / construct signatures (`type F = { (): void }`) |   ✅    | [syntax-callable-signatures.ts](conformance/syntax-callable-signatures.ts) | Function types; a class passed as a value is its constructor                    |
| JSX / `.tsx` syntax                                       |   ✅    | [syntax-jsx.tsx](conformance/syntax-jsx.tsx)                           | Renders to HTML strings (text escaped); components are calls with props         |
| Ambient declarations (`declare`, `.d.ts`, `x!: T`)        |   ✅    | [syntax-ambient-declarations.ts](conformance/syntax-ambient-declarations.ts) | `declare` only types code; `declare const` is an unset variable                 |
| `export =` / `import x = require()`                       |   ✅    | [syntax-export-equals.ts](conformance/syntax-export-equals.ts)       | `import x = require()` is a namespace import                                    |
| Recursive types (`type Tree = { children: Tree[] }`) | ✅ | — | Self-referencing structs |

## Modules & imports

| Feature                                            | Status | Probe                                                            | Notes                                                                                                                  |
| -------------------------------------------------- | :----: | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Named imports                                      |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import { x } from './file'`                                                                                           |
| Import renaming (`import { x as y }`)              |   ✅    | [syntax-import-renaming.ts](conformance/syntax-import-renaming.ts) | Local file imports                                                                                                     |
| Named exports (`export const` / `export function`) |   ✅    | [syntax-import-local.ts](conformance/syntax-import-local.ts)     | Helper [import-local-helper.ts](conformance/import-local-helper.ts) exports `multiply`                                 |
| Default imports                                    |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import x from 'pkg'` — namespace stripped in output                                                                   |
| Namespace imports                                  |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import * as x from 'pkg'`                                                                                             |
| Local file imports                                 |   ✅    | [syntax-import-local.ts](conformance/syntax-import-local.ts)     | Relative paths transpiled to a separate Go file (helper: [import-local-helper.ts](conformance/import-local-helper.ts)) |
| Default export                                     |   ✅    | [syntax-default-export.ts](conformance/syntax-default-export.ts) | `export default function`                                                                                              |
| Node.js built-in imports                           |   ✅    | [lib-node-path.ts](conformance/lib-node-path.ts)                 | `node:x` or bare (`'fs'`), named / default / namespace imports, subpaths (`fs/promises`) (see [Node builtins](#node-builtins-node)) |
| Go package imports                                 |   ✅    | [syntax-import-go.ts](conformance/syntax-import-go.ts)           | `import { x } from 'go:pkg'`                                                                                           |
| npm package imports                                |   ✅    | [syntax-import-npm.ts](conformance/syntax-import-npm.ts)         | `import { x } from 'pkg'` mapped to Go module imports                                                                  |
| Re-exports (`export { x } from`, `export *`)       |   ✅    | [syntax-re-exports.ts](conformance/syntax-re-exports.ts)         | Re-exported files are included (one Go package)                                                                        |
| Dynamic `import()`                                 |   ✅    | [syntax-dynamic-import.ts](conformance/syntax-dynamic-import.ts) | `const m = await import('./x')` is a namespace import                                                                  |
| Side-effect imports (`import './mod'`)             |   ✅    | [syntax-side-effect-import.ts](conformance/syntax-side-effect-import.ts) | Module top-level statements run in Go's `init()`                                                                       |
| `import.meta.url`                                  |   ✅    | [syntax-import-meta.ts](conformance/syntax-import-meta.ts)       | The `file://` URL of the running program (`os.Executable` → `pathToFileURL`)                                           |

## Async & timing

| Feature                                              | Status | Probe                                                        | Notes                                                                                          |
| ---------------------------------------------------- | :----: | ------------------------------------------------------------ | --------------------------------------                                                         |
| `async` / `await`                                    |   ✅    | [syntax-async-await.ts](conformance/syntax-async-await.ts)   | The body runs synchronously until its first `await`; `await` runs pending event-loop tasks while it waits; the loop drains before exit |
| Async arrow callbacks (`emitter.on('x', async () => { await … })`, `test('t', async () => …)`) | ✅ | [lib-node-test.ts](conformance/lib-node-test.ts) | Run to completion when called (their awaits keep the event loop running), so the caller sees them finish before it continues |
| `Promise` constructor / `.then`                      |   ✅    | [syntax-promise-then.ts](conformance/syntax-promise-then.ts) | The executor runs synchronously; promises are buffered channels; `.then` callbacks run on the event loop |
| `Promise.all`                                        |   ✅    | [syntax-promise-all.ts](conformance/syntax-promise-all.ts)   | `TnPromiseAll` drains every promise channel into a slice                                       |
| `Promise.resolve`                                    |   ✅    | [lib-promise-resolve.ts](conformance/lib-promise-resolve.ts) | Buffered channel holding the value                                                             |
| `Promise.reject` / `.catch` / `.finally`             |   ✅    | [lib-promise-catch.ts](conformance/lib-promise-catch.ts)     | Rejected promises are closed channels with a reason; `await` rethrows                          |
| `Promise.race` / `allSettled` / `any`                |   ✅    | [lib-promise-combinators.ts](conformance/lib-promise-combinators.ts) | Goroutine per promise; first settled / all settled / first fulfilled                           |
| `clearTimeout`                                       |   ✅    | [lib-timers.ts](conformance/lib-timers.ts)                   | `TnClearTimeout` stops the timer                                                               |
| `setInterval` / `clearInterval`                      |   ✅    | [lib-set-interval.ts](conformance/lib-set-interval.ts)       | `time.Ticker` posting to the event loop; the process lives until cleared                       |
| `queueMicrotask`                                     |   ✅    | [lib-queue-microtask.ts](conformance/lib-queue-microtask.ts) | Runs after the current synchronous code (end of main or of an event-loop task)                 |
| `setTimeout`                                         |   ✅    | [lib-set-timeout.ts](conformance/lib-set-timeout.ts)         | `time.AfterFunc` posting the callback to the event loop, which keeps the process alive          |
| `resolve` / `reject` passed as values                |   ✅    | [lib-node-async-hooks.ts](conformance/lib-node-async-hooks.ts) | `new Promise((resolve) => setTimeout(resolve, ms))`                 |
| Async class methods (instance, static, inherited, unannotated); `return otherPromise()` | ✅ | [syntax-async-methods.ts](conformance/syntax-async-methods.ts) | Lowered like async functions; a returned promise is awaited |
| `Promise.withResolvers` / `Promise.try` | ✅ | [lib-promise-extras.ts](conformance/lib-promise-extras.ts) | |
| Async arrows kept as values (`const f = async () => …`) | ✅ | [lib-promise-extras.ts](conformance/lib-promise-extras.ts) | Return a promise like async functions (concise bodies too); async arrows passed straight to a call run inline (see above) |

## Semantics (JS behaviour preserved)

| Feature                                   | Status | Probe                                                                              | Notes                                                                                                       |
| ----------------------------------------- | :----: | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Array reference semantics                 |   ✅    | [semantics-array-reference.ts](conformance/semantics-array-reference.ts)           | Array variables hold `*[]T` so aliases share the slice header                                               |
| `any[]` arrays mutated through a parameter (`function f(a: any[]) { a.push(x) }`) | ❌ | — | `any[]` arrays are plain `[]interface{}`, not shared references: a `push` inside the callee is lost to the caller (typed arrays share) |
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
| An object's own `length` field (`{ length: 3 }.length`) | ✅ | [semantics-length-field.ts](conformance/semantics-length-field.ts) | A field read, not an array length |
| Loop closures capture per-iteration `let` |   ✅    | [semantics-loop-closures.ts](conformance/semantics-loop-closures.ts)               |                                                                                                             |
| Functions stored in Records               |   ✅    | [semantics-record-functions.ts](conformance/semantics-record-functions.ts)         | `rec.fn()` → `rec.Get("fn")()`, also for names like `get` / `sort`                                          |

## Sample apps

End-to-end programs that combine many features the way real code does (they run in the suite like any probe).

| App | Probe | Covers |
| --- | ----- | ------ |
| `wc`-style CLI | [app-cli-wordcount.ts](conformance/app-cli-wordcount.ts) | `util.parseArgs`, `fs`, `path`, `os.EOL`, a class with a `Map` field, tuples sorted with a `\|\|` comparator, `reduce` into an object, `crypto` |
| JSON API on HTTP + SQLite | [app-http-sqlite.ts](conformance/app-http-sqlite.ts) | `http.createServer` routing, `URL`, `node:sqlite` prepared statements, `fetch` (POST / GET / DELETE), JSON bodies, status codes |
| Stream pipeline | [app-stream-pipeline.ts](conformance/app-stream-pipeline.ts) | A generator through `Readable.from`, a CSV-aggregating `Transform`, `Float64Array` series, `stream/promises` `pipeline` to files, gzip and Brotli streams, SHA-256 |

## Standard library

Every standard-library API TypeNative ports, split by module. Per
[types/typenative-npm.d.ts](types/typenative-npm.d.ts) (`node:*`) and
[types/typenative-go.d.ts](types/typenative-go.d.ts) (`go:*`).

### `console`

| API                                | Status | Probe                                                  | Notes                                                  |
| ---------------------------------- | :----: | ------------------------------------------------------ | ------------------------------------------------------ |
| `console.log`                      |   ✅    | [lib-console-log.ts](conformance/lib-console-log.ts)   | `fmt.Println`; non-string arguments print like Node (`util.inspect`), format strings like `util.format` |
| `console.error`                    |   ✅    | [lib-console-error.ts](conformance/lib-console-error.ts) | `fmt.Fprintln(os.Stderr, ...)`                         |
| `console.warn`                     |   ✅    | [lib-console-error.ts](conformance/lib-console-error.ts) | Mapped to stderr like `console.error`                  |
| `console.time` / `console.timeEnd` / `console.timeLog` |   ✅    | [lib-console-time.ts](conformance/lib-console-time.ts) | Node's format: `label: 1.234ms`                         |
| `console.info` / `debug` / `dir` / `count` / `countReset` / `group` / `groupEnd` / `assert` / `trace` | ✅ | [lib-console-more.ts](conformance/lib-console-more.ts) | `group` indents every later console line; `assert` prints `Assertion failed` |
| `console.table` (arrays, objects, `Map`, `Set`, a `properties` filter) | ✅ | [lib-node-console-table.ts](conformance/lib-node-console-table.ts) | Node's box-drawn layout (left-aligned cells); other values are logged as is |

### `Math`

| API                                                                | Status | Probe                                                  | Notes                                                           |
| ------------------------------------------------------------------ | :----: | ------------------------------------------------------ | --------------------------------------------------------------- |
| `Math.floor` / `ceil` / `round`                                    |   ✅    | [lib-math.ts](conformance/lib-math.ts)                 | Mapped to `math.Floor`, `math.Ceil`, `math.Round`               |
| `Math.abs` / `sqrt` / `pow`                                        |   ✅    | [lib-math.ts](conformance/lib-math.ts)                 | Mapped to corresponding `math` functions                        |
| `Math.min` / `Math.max`                                            |   ✅    | [lib-math-min-max.ts](conformance/lib-math-min-max.ts) | Go builtins `min` / `max`                                       |
| `Math.max(...arr)` / spread & variadic                             |   ✅    | [lib-math-min-max.ts](conformance/lib-math-min-max.ts) | Spread and any number of arguments via `slices.Max` / `max`     |
| `Math.random`                                                      |   ✅    | [lib-math-random.ts](conformance/lib-math-random.ts)   | Mapped to `rand.Float64()`                                      |
| `Math.log` / `log2` / `log10`                                      |   ✅    | [lib-math-functions.ts](conformance/lib-math-functions.ts) | `math.Log` / `math.Log2` / `math.Log10`                         |
| `Math.sin` / `cos` / `tan`                                         |   ✅    | [lib-math-functions.ts](conformance/lib-math-functions.ts) | `math.Sin` / `math.Cos` / `math.Tan`                            |
| `Math.trunc` / `sign`                                              |   ✅    | [lib-math-functions.ts](conformance/lib-math-functions.ts) | `math.Trunc` / inline sign check                                |
| Constants (`Math.PI`, `Math.E`, …)                                 |   ✅    | [lib-math-constants.ts](conformance/lib-math-constants.ts) | `math.Pi`, `math.E`, `math.Sqrt2`, …                            |
| `Math.asin` / `acos` / `atan` / `atan2` / `hypot` / `cbrt` / `exp` |   ✅    | [lib-math-more.ts](conformance/lib-math-more.ts)       | Corresponding `math` functions                                  |
| `Math.sinh` / `cosh` / `tanh` / `expm1` / `log1p` | ✅ | — | Corresponding `math` functions |
| `Math.fround` / `imul` / `clz32` / `asinh` / `acosh` / `atanh` / `sumPrecise` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | `sumPrecise` is a compensated (Neumaier) sum |
| `Math.f16round` | ❌ | — | Not declared |

### `JSON`

| API              | Status | Probe                                                      | Notes                                                   |
| ---------------- | :----: | ---------------------------------------------------------- | -------------------------------------                   |
| `JSON.parse`     |   ✅    | [lib-json-parse.ts](conformance/lib-json-parse.ts)         | Mapped to `encoding/json` `Unmarshal`; assigned to an interface type, the result converts into its struct |
| `JSON.stringify` |   ✅    | [lib-json-stringify.ts](conformance/lib-json-stringify.ts) | Reflection serializer includes unexported struct fields and inherited ones |
| `JSON.stringify` `space`, replacer (function or key list), `toJSON()`; circular structures; `JSON.parse` reviver and `SyntaxError`s | ✅ | [lib-json-options.ts](conformance/lib-json-options.ts) | Node's layout; Dates serialize as ISO strings, `Map` / `Set` as `{}`, bigints throw. A replacer or reviver returning `undefined` gives `null` (it doesn't drop the key) |
| Key order of `JSON.parse` objects | ❌ | — | Parsed objects are Go maps: `JSON.stringify` writes their keys sorted |

### `Object`

| API                                                        | Status | Probe                                                      | Notes                                                               |
| ---------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `Object.keys` / `values` / `entries`                       |   ✅    | [lib-object-helpers.ts](conformance/lib-object-helpers.ts) | Map key/value iteration helpers; typed results for maps and records |
| `Object.assign`                                            |   ✅    | [lib-object-assign.ts](conformance/lib-object-assign.ts)   | Sources (structs, maps, dynamic objects) copied into an ordered map |
| `Object.freeze` / `seal` / `preventExtensions` / `isFrozen` / `isSealed` / `isExtensible` | ✅ | [lib-object-freeze.ts](conformance/lib-object-freeze.ts) | Integrity level tracked by identity; writes rejected by `Readonly<T>` types (`preventExtensions` / `isSealed` / `isExtensible` not probed) |
| `Object.fromEntries`                                       |   ✅    | [lib-object-from-entries.ts](conformance/lib-object-from-entries.ts) | `TnFromEntries` → dynamic object                                    |
| `Object.hasOwn` / `defineProperty` / `getOwnPropertyNames` |   ✅    | [lib-object-own.ts](conformance/lib-object-own.ts)         | Maps, dynamic objects and typed objects (literal keys); `{ value }` descriptors |
| `Object.hasOwn` / `defineProperty` with a non-literal key on a typed object | ✅ | [lib-object-own-computed.ts](conformance/lib-object-own-computed.ts) | A `switch` over the declared fields (an unset optional field is not own) |
| `Object.is` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | SameValue; two empty object literals may share an address in Go, so `Object.is({}, {})` can be `true` |
| `Object.groupBy` / `Map.groupBy` | ✅ | [lib-group-by.ts](conformance/lib-group-by.ts) | Groups in first-seen key order |
| `Object.create` / `getPrototypeOf` / `getOwnPropertyDescriptor(s)` / `defineProperties` | ❌ | — | Not declared |

### `String`

| API                                                       | Status | Probe                                                                  | Notes                                                                  |
| --------------------------------------------------------- | :----: | ---------------------------------------------------------------------- | -----------------------------------------------------------            |
| Template literals                                         |   ✅    | [syntax-template-literals.ts](conformance/syntax-template-literals.ts) | Backtick strings with `${expr}` interpolation                          |
| Tagged templates                                          |   ✅    | [syntax-tagged-templates.ts](conformance/syntax-tagged-templates.ts)   | Desugared to `tag([...strings], ...values)`                            |
| `toUpperCase` / `toLowerCase`                             |   ✅    | [lib-string-basics.ts](conformance/lib-string-basics.ts)               | Via `strings` package                                                  |
| `trim` / `trimStart` / `trimEnd`                          |   ✅    | [lib-string-basics.ts](conformance/lib-string-basics.ts)               | Via `strings` package                                                  |
| `split` / `join`                                          |   ✅    | [lib-string-split-join.ts](conformance/lib-string-split-join.ts)       | Via `strings` package                                                  |
| `includes` / `startsWith` / `endsWith` / `indexOf` (with `fromIndex`)        |   ✅    | [lib-string-search.ts](conformance/lib-string-search.ts)               | Via `strings` package                                                  |
| `replace` / `replaceAll` (string pattern)                 |   ✅    | [lib-string-replace.ts](conformance/lib-string-replace.ts)             | Via `strings` package                                                  |
| `replace` / `replaceAll` (RegExp, `$1`/`$&`, fn replacer) |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)     | `/g` vs first match, `$1`/`$&` patterns, function replacers            |
| `charAt` / `substring` / `slice`                          |   ✅    | [lib-string-slice.ts](conformance/lib-string-slice.ts)                 | Direct Go string indexing/slicing                                      |
| `charCodeAt` / `String.fromCharCode`                      |   ✅    | [lib-string-char-codes.ts](conformance/lib-string-char-codes.ts)       | `charCodeAt` reads the byte; `String.fromCharCode` → `string(rune(n))` |
| `concat` / `repeat`                                       |   ✅    | [lib-string-pad-repeat.ts](conformance/lib-string-pad-repeat.ts)       | Concatenation and `strings.Repeat`                                     |
| `padStart` / `padEnd`                                     |   ✅    | [lib-string-pad-repeat.ts](conformance/lib-string-pad-repeat.ts)       | Via `strings.Repeat`                                                   |
| `localeCompare`                                           |   ✅    | [lib-string-compare.ts](conformance/lib-string-compare.ts)             | `strings.Compare` → -1/0/1: code-unit order, not locale-aware          |
| `match` / `matchAll` / `search`                           |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)     | Via `regexp` package (`String.match` with groups)                      |
| `at` (negative indices)                                   |   ✅    | [lib-array-at.ts](conformance/lib-array-at.ts)                         | Supports negative indices                                              |
| Unicode length / iteration                                |   ✅    | [lib-string-unicode.ts](conformance/lib-string-unicode.ts)             | `.length` counts runes; `[...str]` spreads runes                       |
| `String.raw`                                              |   ✅    | [lib-string-raw.ts](conformance/lib-string-raw.ts)                     | Raw template text with values interpolated                             |
| `normalize`                                               |   ✅    | [lib-string-normalize.ts](conformance/lib-string-normalize.ts)         | `golang.org/x/text/unicode/norm`, copied from GOROOT's vendor tree (offline) |
| `split(sep, limit)` / `lastIndexOf(s, fromIndex)` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | |
| `localeCompare(s, locales, options)` | ❌ | — | Locales / options are not declared; the comparison is by code unit |
| `codePointAt` / `String.fromCodePoint` / `substr` / `trimLeft` / `trimRight` / `isWellFormed` / `toWellFormed` / `toLocaleUpperCase` / `toLocaleLowerCase` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | `codePointAt` past the end is `NaN` (JS: `undefined`); the locale variants ignore the locale |

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
| `concat`                                                                    |   ✅    | [lib-array-concat.ts](conformance/lib-array-concat.ts)                       | Arrays flattened one level, values appended                                   |
| `reduceRight`                                                               |   ✅    | [lib-array-reduce-right.ts](conformance/lib-array-reduce-right.ts)           | `reduce` over a reversed copy                                                 |
| `copyWithin`                                                                |   ✅    | [lib-array-copy-within.ts](conformance/lib-array-copy-within.ts)             | Go `copy` (overlap-safe)                                                      |
| Change-preserving copies (`toSorted` / `toReversed` / `with`)               |   ✅    | [lib-array-copies.ts](conformance/lib-array-copies.ts)                       | Clone, then sort / reverse / set                                              |
| `toSpliced`                                                                 |   ✅    | [lib-array-to-spliced.ts](conformance/lib-array-to-spliced.ts)               | `slices.Concat` of the kept parts                                             |
| `Array.of` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | |
| Iterator helpers on generators (`map` / `filter` / `flatMap` / `take` / `drop` / `toArray` / `forEach` / `some` / `every` / `find` / `reduce`), `Iterator.from(array)` | ✅ | [lib-iterator-helpers.ts](conformance/lib-iterator-helpers.ts) | Lazy (works on infinite generators): one goroutine per stage |
| `Array.fromAsync` | ❌ | — | Not declared |
| `[...map.keys()]` / `[...map.values()]` | ✅ | [lib-group-by.ts](conformance/lib-group-by.ts) | |

### `Map` / `Set`

| API                                                      | Status | Probe                                                              | Notes                                                   |
| -------------------------------------------------------- | :----: | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `Map` (`set` / `get` / `has` / `delete` / `size`)        |   ✅    | [lib-map.ts](conformance/lib-map.ts)                               | `Map<K, V>` → Go `map[K]V`; constructor with entries    |
| `Map` iteration (`for...of`, destructuring)              |   ✅    | [lib-map-iteration.ts](conformance/lib-map-iteration.ts)           | Key/value iteration, `Object.entries()` unwrapping      |
| `Set` (`add` / `has` / `delete` / `size`)                |   ✅    | [lib-set.ts](conformance/lib-set.ts)                               | `Set<T>` → Go `map[T]struct{}`; constructor with values |
| `Set` iteration / spread                                 |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | `for...of`, `[...set]`                                  |
| `Map.clear` / `Set.clear`                                |   ✅    | [lib-map-clear.ts](conformance/lib-map-clear.ts)                   | `TnMap.Clear()`                                         |
| `WeakMap` / `WeakSet`                                    |   ✅    | [lib-weak-collections.ts](conformance/lib-weak-collections.ts)     | Same as `Map` / `Set` (weakness is not observable)      |
| Set operations (`union` / `intersection` / `difference`) |   ✅    | [lib-set-operations.ts](conformance/lib-set-operations.ts)         | Plus `symmetricDifference` / `isSubsetOf` / `isSupersetOf` / `isDisjointFrom` |

### `Number`

| API                                               | Status | Probe                                                    | Notes                                                    |
| ------------------------------------------------- | :----: | -------------------------------------------------------- | -------------------------------------------------------- |
| `toString` (incl. radix)                          |   ✅    | [lib-number-format.ts](conformance/lib-number-format.ts) | Universal `toString()` via `fmt.Sprintf` for any type    |
| `toFixed`                                         |   ✅    | [lib-number-format.ts](conformance/lib-number-format.ts) | `n.toFixed(2)` via `strconv.FormatFloat`                 |
| `parseInt` / `parseFloat` / `Number()`            |   ✅    | [lib-number-parse.ts](conformance/lib-number-parse.ts)   | Mapped to Go's `strconv` package                         |
| `Number.isInteger` / `isNaN` / `MAX_SAFE_INTEGER` |   ✅    | [lib-number-checks.ts](conformance/lib-number-checks.ts) | Number predicates and constants                          |
| `Number.MIN_SAFE_INTEGER` / `MAX_VALUE`             |   ✅    | —                                                        |                                                          |
| `Number.EPSILON` / `isFinite` / `toPrecision`     |   ✅    | [lib-number-misc.ts](conformance/lib-number-misc.ts)     | `toPrecision` → `strconv.FormatFloat(x, 'g', n, 64)`     |
| `String()` / `Boolean()` conversions              |   ✅    | [lib-conversions.ts](conformance/lib-conversions.ts)     | JS formatting / truthiness                               |
| `toExponential` / `Number.isSafeInteger` / `parseInt` / `parseFloat` / `MIN_VALUE` / `NEGATIVE_INFINITY` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | |
| Number `toLocaleString` | ❌ | — | Needs `Intl` |

### `Date`

| API                                              | Status | Probe                                          | Notes                                                                            |
| ------------------------------------------------ | :----: | ---------------------------------------------- | -----------------------------                                                    |
| `new Date()` / `getTime` / `toISOString`         |   ✅    | [lib-date.ts](conformance/lib-date.ts)         | `new Date(ms)` → `time.UnixMilli`; `getTime`/`toISOString` mapped to `time.Time` |
| `Date.now()`                                     |   ✅    | [lib-date-now.ts](conformance/lib-date-now.ts) | `time.Now().UnixMilli()`                                                         |
| Component getters (`getFullYear`, `getMonth`, …) |   ✅    | [lib-date-getters.ts](conformance/lib-date-getters.ts) | Local and `getUTC*` getters, `Date.UTC`                                          |
| `toJSON` / `valueOf`; Invalid Dates (`getTime()` is `NaN`, `toISOString` throws a `RangeError`) | ✅ | [lib-date-parse-set.ts](conformance/lib-date-parse-set.ts) | |
| `toString` / `toDateString` / `toTimeString` / `toUTCString`, `String(date)`, `` `${date}` `` | ✅ | [lib-date-parse-set.ts](conformance/lib-date-parse-set.ts) | Node's formats in the local zone; long zone names for common zones (`Coordinated Universal Time`, `Central European Standard Time`, …), `GMT±hh:mm` otherwise |
| `new Date(string)` / `new Date(y, m, d, …)` / `new Date(date)` / `Date.parse` | ✅ | [lib-date-parse-set.ts](conformance/lib-date-parse-set.ts) | ISO strings (date-only UTC, date-times local unless offset) and the formats `toString` / `toUTCString` / common `Month D, YYYY` and `YYYY/MM/DD` forms produce; an unparsable string is an Invalid Date |
| Setters (`setFullYear`, `setDate`, `setHours`, … and `setUTC*`), `setTime`, `getTimezoneOffset` | ✅ | [lib-date-parse-set.ts](conformance/lib-date-parse-set.ts) | Fields overflow like JS. Dates are values: a setter updates the variable or field it is called on, not other references to the same Date |
| `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString` | ✅ | [lib-date-parse-set.ts](conformance/lib-date-parse-set.ts) | `en-US` format; locales and options are ignored |
| Date arithmetic and ordering (`b - a`, `+d`, `a < b`) | ✅ | [semantics-date-arithmetic.ts](conformance/semantics-date-arithmetic.ts) | The time value in milliseconds; `any` operands of `-` `*` `/` `%` convert with ToNumber |

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
| Remaining flags (`s` / `u` / `y`) & `source` / `flags` |   ✅    | [lib-regex-more-flags.ts](conformance/lib-regex-more-flags.ts)       | Sticky matching, `\u{…}` escapes, `lastIndex` / `source` / `flags` / flag getters |
| `split` with RegExp                                    |   ✅    | [lib-regex-split.ts](conformance/lib-regex-split.ts)                 | `re.Split(s, -1)`                                               |
| Unicode property escapes (`\p{L}`) with `u` | ✅ | — | Go's `regexp` |
| `\p{…}` in patterns that need the backtracking engine (backreferences, lookaround); `d` flag (`indices`); `v` flag; `RegExp.escape` | ❌ | — | The backtracking engine has no `\p`: `/(\p{L})\1/u` doesn't match `aa` (wrong result, no error) |

### `Promise` / timers

See [Async & timing](#async--timing): `Promise` (constructor, `.then` / `.catch` / `.finally`,
`resolve` / `reject` / `all` / `race` / `allSettled` / `any`), `setTimeout`, `setInterval`,
`queueMicrotask` and their `clear*` functions, plus the gaps.

### Misc globals

| API                                         | Status | Probe                                                              | Notes                                    |
| ------------------------------------------- | :----: | ------------------------------------------------------------------ | ---------------------------------------- |
| `assert`                                    |   ✅    | [lib-console-log.ts](conformance/lib-console-log.ts)               | Transpiled to `panic` on failure         |
| `process.argv` / `process.platform`         |   ✅    | [lib-process.ts](conformance/lib-process.ts)                       | Node's shapes (`[execPath, script, ...args]`, `win32`); the rest of `process` is in [node:process](#nodeprocess) |
| `process.env`                               |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Environment variable access              |
| `process.exit`                              |   ✅    | [lib-process-exit.ts](conformance/lib-process-exit.ts)             | `os.Exit`, after `process.on('exit')` listeners |
| `process.cwd()`                             |   ✅    | [lib-process-cwd.ts](conformance/lib-process-cwd.ts)               | `os.Getwd()`                             |
| `Buffer` / `Uint8Array` / `TextEncoder` / `TextDecoder` / `atob` / `btoa` | ✅ | [lib-node-buffer-encodings.ts](conformance/lib-node-buffer-encodings.ts) | See [node:buffer](#nodebuffer)           |
| `URL` / `URLSearchParams`                   |   ✅    | [lib-node-url-class.ts](conformance/lib-node-url-class.ts)         | See [node:url](#nodeurl)                 |
| `EventTarget` / `Event` / `AbortController` / `AbortSignal` | ✅ | [lib-node-abort.ts](conformance/lib-node-abort.ts) | See [node:events](#nodeevents)           |
| `performance` / `setImmediate` / `crypto`   |   ✅    | [lib-node-perf-hooks.ts](conformance/lib-node-perf-hooks.ts)       | See [perf_hooks](#nodeperf_hooks), [timers](#nodetimers), [crypto](#nodecrypto) |
| `TypeError` / `RangeError` / `SyntaxError` & co. | ✅ | [lib-node-assert.ts](conformance/lib-node-assert.ts)             | `TnError`s carrying their `name`; `instanceof` checks the name |
| `Infinity`                                  |   ✅    | [lib-globals.ts](conformance/lib-globals.ts)                       | `math.Inf(1)`                            |
| Global `isNaN` / `isFinite`                 |   ✅    | [lib-globals.ts](conformance/lib-globals.ts)                       | `math.IsNaN` / `math.IsInf`              |
| `encodeURIComponent` / `decodeURIComponent` |   ✅    | [lib-uri.ts](conformance/lib-uri.ts)                               | `TnEncodeURIComponent` / `url.PathUnescape` |
| `structuredClone`                           |   ✅    | [lib-structured-clone.ts](conformance/lib-structured-clone.ts)     | Reflection deep copy                     |
| `fetch` / `Headers` / `Request` / `Response` |   ✅    | [lib-node-fetch.ts](conformance/lib-node-fetch.ts)                 | See [fetch](#fetch)                      |
| `ReadableStream` / `WritableStream` / `TransformStream` & co., `TextEncoderStream` / `TextDecoderStream`, `CompressionStream` / `DecompressionStream` | ✅ | [lib-node-stream-web.ts](conformance/lib-node-stream-web.ts) | See [stream/web](#nodestreamweb) |
| `Blob` / `File` / `FormData`                 |   ✅    | [lib-node-blob.ts](conformance/lib-node-blob.ts)                   | See [buffer](#nodebuffer) and [fetch](#fetch) |
| `MessageChannel` / `MessagePort` / `BroadcastChannel` | ✅ | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | See [worker_threads](#nodeworker_threads) |
| `__filename` / `__dirname`                  |   ✅    | —                                                                  | The running executable (a native binary has no script file) |
| `globalThis`                                |   ✅    | [lib-global-this.ts](conformance/lib-global-this.ts)               | `globalThis.x` is the global `x`; `(globalThis as any)` is a dynamic object |
| `err.stack` | ✅ | [lib-error-stack.ts](conformance/lib-error-stack.ts) | `Name: message` and an `at fn (file.ts:line)` line per TS frame (no columns), from `runtime.Callers` and the `//line` directives |
| `AggregateError` (`errors`) | ✅ | [lib-error-stack.ts](conformance/lib-error-stack.ts) | |
| `Error.captureStackTrace` / `Error.isError` / `DOMException` | ❌ | — | Not declared |
| `Symbol.for` / `Symbol.keyFor` / `description` | ✅ | [lib-builtins-statics.ts](conformance/lib-builtins-statics.ts) | A global registry by key |
| `[Symbol.asyncIterator]()` methods; `Symbol.toPrimitive` / `hasInstance` / `toStringTag` | ❌ | — | Only `Symbol()`, `Symbol.iterator` and `Symbol.dispose` are lowered |
| `WeakRef` / `FinalizationRegistry` | ✅ | [lib-weak-refs.ts](conformance/lib-weak-refs.ts) | Go's `weak` package and `runtime.AddCleanup`; cleanup callbacks run on the event loop. Targets must be objects (pointers) |
| `Reflect` (`ownKeys` / `has` / `get` / `set` / …) | ❌ | — | Feasible over the existing dynamic property access |
| `Proxy` | 🚫 | — | Intercepting every property access on static Go structs; a `Proxy` limited to dynamic (`any`) objects would be feasible |
| `Intl` (`NumberFormat`, `DateTimeFormat`, `Collator`, `PluralRules`, `ListFormat`, `RelativeTimeFormat`, `Segmenter`), `toLocaleString` | ❌ | — | Needs locale data (vendored `golang.org/x/text`, or hand-written `en-US` first) |
| `Temporal` | ❌ | — | Feasible on Go's `time` and tzdata |
| `WebSocket` / `navigator` / `CustomEvent` / `URLPattern` / `EventSource` / `reportError` | ❌ | — | Not declared |
| `WebAssembly` | ❌ | — | Needs a Wasm runtime: vendoring wazero (pure Go, no cgo) would provide one (see [wasi](#nodewasi)) |

### Node builtins (`node:*`)

Every module can be imported as `node:x` or by its bare name (`fs`), with
named, default or namespace imports; subpaths (`fs/promises`, `path/posix`,
`stream/promises`, …) work too. Signatures follow `@types/node`
([types/typenative-npm.d.ts](types/typenative-npm.d.ts)). Callbacks, timers, I/O
completions and events run on one event loop, one at a time, as in Node; an
async function runs synchronously until its first `await`.

| Module                                      | Status | Section                                                    |
| ------------------------------------------- | :----: | ---------------------------------------------------------- |
| `node:assert` / `node:assert/strict`        |   ✅    | [assert](#nodeassert)                                       |
| `node:async_hooks`                          |   ✅    | [async_hooks](#nodeasync_hooks)                             |
| `node:buffer` (+ globals `Buffer`, `Uint8Array`, `atob`, `btoa`, `Blob`, `File`) | ✅ | [buffer](#nodebuffer)                 |
| `node:child_process`                        |   ✅    | [child_process](#nodechild_process)                         |
| `node:cluster`                              |   ✅    | [cluster](#nodecluster)                                     |
| `node:console`                              |   ✅    | [console](#nodeconsole)                                     |
| `node:constants`                            |   ✅    | [constants](#nodeconstants--nodesys)                        |
| `node:crypto` (+ global `crypto`)           |   ✅    | [crypto](#nodecrypto)                                       |
| `node:dgram`                                |   ✅    | [dgram](#nodedgram)                                         |
| `node:diagnostics_channel`                  |   ✅    | [diagnostics_channel](#nodediagnostics_channel)             |
| `node:dns` / `node:dns/promises`            |   ✅    | [dns](#nodedns)                                             |
| `node:domain`                               |   🚫    | [domain](#nodedomain)                                       |
| `node:events` (+ `EventTarget`, `AbortController`) | ✅ | [events](#nodeevents)                                      |
| `node:fs` / `node:fs/promises`              |   ✅    | [fs](#nodefs)                                               |
| `node:http` / `node:https`                  |   ✅    | [http / https](#nodehttp--nodehttps)                        |
| `node:http2`                                |   ✅    | [http2](#nodehttp2)                                         |
| `node:inspector`                            |   🚫    | [inspector](#nodeinspector)                                 |
| `node:module`                               |   ❌    | [module](#nodemodule)                                       |
| `node:net`                                  |   ✅    | [net](#nodenet)                                             |
| `node:os`                                   |   ✅    | [os](#nodeos)                                               |
| `node:path` / `path/posix` / `path/win32`   |   ✅    | [path](#nodepath)                                           |
| `node:perf_hooks` (+ global `performance`)  |   ✅    | [perf_hooks](#nodeperf_hooks)                               |
| `node:process` (+ global `process`)         |   ✅    | [process](#nodeprocess)                                     |
| `node:punycode`                             |   ✅    | [punycode](#nodepunycode)                                   |
| `node:querystring`                          |   ✅    | [querystring](#nodequerystring)                             |
| `node:readline` / `node:readline/promises`  |   ✅    | [readline](#nodereadline)                                   |
| `node:repl`                                 |   🚫    | [repl](#noderepl)                                           |
| `node:sea`                                  |   ❌    | [sea](#nodesea)                                             |
| `node:sqlite`                               |   ✅    | [sqlite](#nodesqlite)                                       |
| `node:stream` / `stream/promises` / `stream/consumers` | ✅ | [stream](#nodestream)                                     |
| `node:stream/web` (+ globals `ReadableStream`, `WritableStream`, `TransformStream`, …) | ✅ | [stream/web](#nodestreamweb)                 |
| `node:string_decoder`                       |   ✅    | [string_decoder](#nodestring_decoder)                       |
| `node:sys`                                  |   ✅    | [constants / sys](#nodeconstants--nodesys)                  |
| `node:test`                                 |   ✅    | [test](#nodetest)                                           |
| `node:test/reporters`                       |   ❌    | [test/reporters](#nodetestreporters)                        |
| `node:timers` / `node:timers/promises`      |   ✅    | [timers](#nodetimers)                                       |
| `node:tls`                                  |   ✅    | [tls](#nodetls)                                             |
| `node:trace_events`                         |   🚫    | [trace_events](#nodetrace_events)                           |
| `node:tty`                                  |   ✅    | [tty](#nodetty)                                             |
| `node:url` (+ globals `URL`, `URLSearchParams`) | ✅  | [url](#nodeurl)                                             |
| `node:util` / `node:util/types`             |   ✅    | [util](#nodeutil)                                           |
| `node:v8`                                   |   ❌    | [v8](#nodev8)                                               |
| `node:vm`                                   |   🚫    | [vm](#nodevm)                                               |
| `node:wasi`                                 |   ❌    | [wasi](#nodewasi)                                           |
| `node:worker_threads` (+ globals `MessageChannel`, `MessagePort`, `BroadcastChannel`) | ✅ | [worker_threads](#nodeworker_threads) |
| `node:zlib`                                 |   ✅    | [zlib](#nodezlib)                                           |
| Global `fetch` (+ `Headers`, `Request`, `Response`, `FormData`) | ✅ | [fetch](#fetch)                                |

#### `node:path`

| API                                                                 | Status | Probe                                                                    | Notes                                                                 |
| ------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `join` / `dirname` / `basename` / `extname` / `resolve`             |   ✅    | [lib-node-path.ts](conformance/lib-node-path.ts)                         | Ports of Node's algorithms (not Go's `filepath`): same results as Node |
| `normalize` / `relative` / `isAbsolute` / `parse` / `format` / `sep` / `delimiter` | ✅ | [lib-node-path-more.ts](conformance/lib-node-path-more.ts) | Trailing separators, `.bashrc`-style extensions, `''` for same paths   |
| `path.posix` / `path.win32` / `node:path/posix` / `toNamespacedPath` |   ✅    | [lib-node-path-posix-win32.ts](conformance/lib-node-path-posix-win32.ts) | Both flavours on every OS (drive letters, UNC roots); `path` is the platform's |
| `matchesGlob` (`*`, `**`, `?`, `[...]`, `{a,b}`; no leading-dot matches) |   ✅    | [lib-node-path-glob.ts](conformance/lib-node-path-glob.ts) | minimatch-style patterns compiled to regular expressions |

#### `node:buffer`

| API                                                                                     | Status | Probe                                                                          | Notes                                                                                  |
| --------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `Buffer.from` / `alloc` / `concat` / `byteLength` / `isBuffer` / `compare`; `buf[i]`, `length` | ✅ | [lib-node-buffer.ts](conformance/lib-node-buffer.ts)                          | Buffers are Go `[]byte`; `subarray` / `slice` share memory; writes wrap modulo 256      |
| `toString` / `equals` / `indexOf` / `includes` / `fill` / `write` / `copy`              |   ✅    | [lib-node-buffer.ts](conformance/lib-node-buffer.ts)                           | `` `${buf}` `` decodes UTF-8; `console.log(buf)` prints `<Buffer 68 69>`                |
| Encodings (utf8, hex, base64, base64url, latin1, ascii, utf16le); `atob` / `btoa`        |   ✅    | [lib-node-buffer-encodings.ts](conformance/lib-node-buffer-encodings.ts)       | Invalid UTF-8 bytes decode to U+FFFD, as in Node                                        |
| `TextEncoder` / `TextDecoder` (`decode(bytes, { stream: true })`), minimal `Uint8Array` |   ✅    | [lib-node-buffer-encodings.ts](conformance/lib-node-buffer-encodings.ts)       | `Uint8Array` is `[]byte` too: `length`, indexing, `subarray`, `slice`, `set`            |
| `read*` / `write*` (U)Int8/16/32 LE/BE, Float, Double                                    |   ✅    | [lib-node-buffer-binary.ts](conformance/lib-node-buffer-binary.ts)             | Out-of-range offsets throw `ERR_OUT_OF_RANGE`                                           |
| `Blob` / `File` (`size`, `type`, `name`, `lastModified`, `text()` / `bytes()` / `arrayBuffer()`, `slice`, `stream()`); parts of strings, Buffers and Blobs | ✅ | [lib-node-blob.ts](conformance/lib-node-blob.ts) | Also globals; bytes held in memory |
| `read/writeBigInt64LE/BE`, `read/writeBigUInt64LE/BE`, `swap16/32/64`; `isUtf8` / `isAscii` / `transcode` / `kMaxLength` | ✅ | [lib-node-buffer-bigint.ts](conformance/lib-node-buffer-bigint.ts) | bigints are `*big.Int` |
| Typed arrays (`Int8Array`, `Uint8ClampedArray`, `Int16Array`, `Uint16Array`, `Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array`): indexing, `length` / `byteLength` / `buffer`, `from` / `of`, `fill` / `set` / `subarray` / `slice` / `copyWithin`, `map` / `filter` / `reduce` / `forEach` & co., `sort` / `toSorted`, `join`, `for…of`, spread; `ArrayBuffer` (`slice`, `isView`); `DataView` (all getters / setters incl. BigInt64) | ✅ | [lib-typed-arrays.ts](conformance/lib-typed-arrays.ts) | One Go slice per element type; views on an `ArrayBuffer` share its memory. Writes convert like JS (wrapping, clamping). A view's `.buffer` is its own bytes (`byteOffset` 0). Out-of-range reads give `0`, not `undefined`. |
| `BigInt64Array` / `BigUint64Array` | ❌ | — | `DataView` already has the BigInt64 accessors |
| `Float16Array`, resizable `ArrayBuffer` (`resize`, `transfer`), `Uint8Array` `toBase64` / `fromBase64` / `toHex` / `fromHex` | ❌ | — | Not declared |

#### `node:fs`

| API                                                                                     | Status | Probe                                                                  | Notes                                                                                     |
| --------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `readFileSync` / `writeFileSync` / `appendFileSync` / `existsSync` / `rmSync`           |   ✅    | [lib-node-fs.ts](conformance/lib-node-fs.ts)                           | `readFileSync` returns a Buffer without an encoding, a string with one; `flag` option     |
| `statSync` / `lstatSync` (`Stats`) / `renameSync` / `copyFileSync` / `truncateSync` / `realpathSync` / `accessSync` / `unlinkSync` | ✅ | [lib-node-fs-stat.ts](conformance/lib-node-fs-stat.ts) | `throwIfNoEntry: false`; Go exposes only the modification time portably, so `atime` / `ctime` / `birthtime` report it too |
| `mkdirSync` / `mkdtempSync` / `readdirSync` (`withFileTypes`, `recursive`) / `rmdirSync` / `cpSync` |   ✅    | [lib-node-fs-dirs.ts](conformance/lib-node-fs-dirs.ts)                 | `Dirent` with `isFile()` / `isDirectory()` / `parentPath`                                  |
| Node system errors (`err.code` / `syscall` / `path` / `errno`)                          |   ✅    | [lib-node-fs-errors.ts](conformance/lib-node-fs-errors.ts)             | `ENOENT: no such file or directory, open 'x'`; `EEXIST`, `ENOTEMPTY`, `ERR_FS_EISDIR`, `COPYFILE_EXCL` |
| File descriptors: `openSync` / `readSync` / `writeSync` / `fstatSync` / `closeSync`     |   ✅    | [lib-node-fs-fd.ts](conformance/lib-node-fs-fd.ts)                     | Flags `r`, `w`, `a`, `+`, `x`; positional reads and writes                                 |
| Callback API (`readFile(path, enc, (err, data) => …)` & co.)                            |   ✅    | [lib-node-fs-callbacks.ts](conformance/lib-node-fs-callbacks.ts)       | Work runs on a goroutine; callbacks run on the event loop                                 |
| `fs/promises` / `fs.promises` (incl. `FileHandle` from `open`)                          |   ✅    | [lib-node-fs-promises.ts](conformance/lib-node-fs-promises.ts)         | Rejections carry the error code                                                            |
| `createReadStream` / `createWriteStream`                                                |   ✅    | [lib-node-fs-streams.ts](conformance/lib-node-fs-streams.ts)           | `encoding`, `start` / `end`, `highWaterMark`, `flags`                                      |
| `chmodSync` / `utimesSync` / `symlinkSync` / `readlinkSync` / `linkSync`                |   ✅    | —                                                                      | Implemented, not probed (symlinks need privileges on Windows)                             |
| `watch` (`recursive`, `persistent`, `signal`, `ref` / `unref`, `'change'` / `'error'` / `'close'`) / `watchFile` / `unwatchFile`; `fs/promises` `watch` | ✅ | [lib-node-fs-watch.ts](conformance/lib-node-fs-watch.ts) | `watch` uses the OS's notifications through the vendored `fsnotify` (only linked into programs that call it); recursive watches add subdirectories as they appear. `watchFile` polls `stat()` |

#### `node:os`

| API                                                                                          | Status | Probe                                        | Notes                                                                   |
| -------------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | ----------------------------------------------------------------------- |
| `platform` / `arch` / `type` / `machine` / `EOL` / `devNull` / `endianness`                  |   ✅    | [lib-node-os.ts](conformance/lib-node-os.ts) | Node's names (`win32`, `x64`, `Windows_NT`, `x86_64`)                    |
| `hostname` / `homedir` / `tmpdir` / `userInfo` / `cpus` / `availableParallelism` / `networkInterfaces` / `constants.signals` | ✅ | [lib-node-os.ts](conformance/lib-node-os.ts) | `cpus()` has one entry per logical CPU (model / speed / times are zero) |
| `totalmem` / `freemem` / `uptime` / `loadavg` / `release` / `version` | ✅ | [lib-node-os-mem.ts](conformance/lib-node-os-mem.ts) | `/proc` on Linux, `sysctl` on macOS / BSD, `GlobalMemoryStatusEx` / `GetTickCount64` on Windows (`loadavg` is zeros there, as in Node) |

#### `node:process`

| API                                                                                                  | Status | Probe                                                          | Notes                                                                       |
| ---------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `argv` / `argv0` / `execPath` / `execArgv` / `pid` / `ppid` / `arch` / `version` / `versions`         |   ✅    | [lib-node-process.ts](conformance/lib-node-process.ts)         | `argv` has Node's shape: `[execPath, script, ...args]`; `version` is `v24.0.0`; `versions.go` is Go's |
| `hrtime` / `hrtime.bigint` / `uptime` / `memoryUsage` / `chdir` / `cwd` / `stdout.write` / `nextTick` / `exitCode` | ✅ | [lib-node-process.ts](conformance/lib-node-process.ts) | `exitCode` is applied when the event loop drains                            |
| `process.env` reads, writes, `delete`, `in`, `Object.keys(process.env)`; `import { env } from 'node:process'` | ✅ | [lib-node-process-env.ts](conformance/lib-node-process-env.ts) | `os.Setenv` / `os.Unsetenv`; missing variables read as `""`                  |
| `process.on('exit' \| 'SIGINT' \| 'SIGTERM' \| 'SIGHUP')` / `once` / `off` / `emit`                   |   ✅    | [lib-node-process-events.ts](conformance/lib-node-process-events.ts) | `'exit'` runs after the event loop with the exit code; signals arrive on the loop |
| `process.stdin` / `stdout` / `stderr` as streams                                                     |   ✅    | [lib-node-child-process-async.ts](conformance/lib-node-child-process-async.ts) | `stdin` keeps the process alive only while flowing                           |
| `kill` / `emitWarning` / `getuid` / `getgid`                                                         |   ✅    | —                                                              | Implemented, not probed                                                     |
| `on('uncaughtException')` / `'uncaughtExceptionMonitor'` / `'unhandledRejection'` / `'beforeExit'` (per drain, can schedule more work); `cpuUsage` / `resourceUsage` / `availableMemory` / `loadEnvFile` | ✅ | [lib-node-process-uncaught.ts](conformance/lib-node-process-uncaught.ts), [lib-node-os-mem.ts](conformance/lib-node-os-mem.ts) | Throws in the top-level code, loop callbacks and detached async calls reach the handlers; CPU times from `/proc` (Linux) or Go's runtime metrics |
| `stdout.columns` / `rows` / `getWindowSize()` (and `stderr`), `stdin.setRawMode` / `isRaw`, `umask` | ✅ | [lib-node-process-tty.ts](conformance/lib-node-process-tty.ts) | A per-OS helper: `TIOCGWINSZ` and termios ioctls (Linux, macOS, FreeBSD), the console API (Windows). `columns` / `rows` are `0`, not `undefined`, when not a terminal (`columns \|\| 80` still works); raw mode is libuv's and is undone at exit; `setRawMode` throws when stdin isn't a terminal. No raw mode on Linux PowerPC / MIPS, no `umask` on Windows (`0`, as in Node); no `'resize'` event |

#### `node:console`

| API                                                         | Status | Probe                                                      | Notes                                                   |
| ----------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------------------- |
| Module re-export (`import { log } from 'node:console'`)     |   ✅    | [lib-node-console-class.ts](conformance/lib-node-console-class.ts) | Same as the global `console`                            |
| `new Console(stdout, stderr)` / `new Console({ stdout, stderr })` |   ✅    | [lib-node-console-class.ts](conformance/lib-node-console-class.ts) | `log` / `info` / `debug` / `error` / `warn` / `dir` |

#### `node:util`

| API                                                                                   | Status | Probe                                                            | Notes                                                                                     |
| ------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `format` / `formatWithOptions` (`%s %d %i %f %j %o %O %c %%`)                          |   ✅    | [lib-node-util-format.ts](conformance/lib-node-util-format.ts)   | Extra arguments appended; also used by `console.log`                                       |
| `inspect` (`depth`, `breakLength`, `compact`)                                          |   ✅    | [lib-node-util-inspect.ts](conformance/lib-node-util-inspect.ts) | Node's layout rules: single line up to 80 columns, number arrays grouped in columns, `Map(1) {…}`, `ClassName {…}`, `[Circular *1]` |
| `isDeepStrictEqual` / `types.*` (`node:util/types`) / `deprecate` / `stripVTControlCharacters` / `styleText` | ✅ | [lib-node-util-misc.ts](conformance/lib-node-util-misc.ts) | `styleText` colours only TTYs unless `validateStream: false`                               |
| `promisify` / `callbackify`                                                           |   ✅    | [lib-node-util-promisify.ts](conformance/lib-node-util-promisify.ts) | Node functions map to their promise versions at compile time (`fs.readFile`, `setTimeout`, `exec`); other functions are wrapped |
| `parseArgs` (short / long / grouped flags, `multiple`, `default`, `strict`, `allowPositionals`, `allowNegative`, `tokens`, Node's errors), `getSystemErrorName` / `getSystemErrorMessage` / `getSystemErrorMap`, `MIMEType` / `MIMEParams`, `parseEnv` (+ `process.loadEnvFile`), `aborted`, `debuglog` (`NODE_DEBUG`), `toUSVString` | ✅ | [lib-node-util-parse-args.ts](conformance/lib-node-util-parse-args.ts) | |
| `inspect.custom` methods, `getCallSites` | ❌ | — | `[inspect.custom]()` can lower to a method like `[Symbol.dispose]()`; `getCallSites` can read `runtime.Callers`, which reports `.ts` lines through the `//line` directives |
| `inherits` (legacy) | 🚫 | — | Rewrites prototypes; classes are static Go structs |
| Node's errno numbers per OS (`err.errno`, `getSystemErrorMap`) | ✅ | [lib-node-errno.ts](conformance/lib-node-errno.ts) | libuv's table, generated into `src/node/errno_tables.ts`: the OS's errno on Unix (`ECONNREFUSED` is `-111` on Linux, `-61` on macOS) and libuv's fixed numbers on Windows (`ENOENT` is `-4058`). Messages are libuv's; the map matches Node's on Linux entry for entry |

#### `node:assert`

| API                                                                                       | Status | Probe                                                          | Notes                                                                       |
| ----------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `assert` / `ok` / `equal` / `strictEqual` (+ `not*`) / `match` / `throws` / `doesNotThrow` / `fail` / `ifError`; `node:assert/strict` | ✅ | [lib-node-assert.ts](conformance/lib-node-assert.ts) | Failures throw an `AssertionError` (`code: 'ERR_ASSERTION'`, `actual`, `expected`, `operator`); `throws` validates with a RegExp, class or object |
| `deepEqual` / `deepStrictEqual` (+ `not*`) / `rejects` / `doesNotReject`                   |   ✅    | [lib-node-assert-deep.ts](conformance/lib-node-assert-deep.ts) | Key order is ignored for objects, Maps and Sets; failure messages are simplified (no diff) |

#### `node:url`

| API                                                                                          | Status | Probe                                                                  | Notes                                                                                      |
| -------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `fileURLToPath` / `pathToFileURL`                                                            |   ✅    | [lib-node-url.ts](conformance/lib-node-url.ts)                         | `pathToFileURL` returns a `URL`; Windows drive letters                                      |
| `URL` (WHATWG): parsing, relative resolution, getters / setters, `canParse`, `parse`; `domainToASCII` / `domainToUnicode`; `format` | ✅ | [lib-node-url-class.ts](conformance/lib-node-url-class.ts) | Special schemes, dot segments, default ports, percent-encode sets, IDN hosts (punycode); invalid input throws `ERR_INVALID_URL` |
| `URLSearchParams` (and `url.searchParams`, kept in sync)                                     |   ✅    | [lib-node-url-search-params.ts](conformance/lib-node-url-search-params.ts) | `for...of`, `forEach`, `sort`, construction from strings / objects / pairs                  |
| Legacy `url.parse` / `url.resolve`                                                           |   ❌    | —                                                                      | Deprecated upstream, but a pure port is feasible                                             |

#### `node:querystring`

| API                                                                   | Status | Probe                                                        | Notes                                      |
| --------------------------------------------------------------------- | :----: | ------------------------------------------------------------ | ------------------------------------------ |
| `parse` / `stringify` / `escape` / `unescape` / `decode` / `encode`   |   ✅    | [lib-node-querystring.ts](conformance/lib-node-querystring.ts) | Repeated keys become arrays; custom separators |

#### `node:punycode`

| API                                           | Status | Probe                                                    | Notes                           |
| --------------------------------------------- | :----: | -------------------------------------------------------- | ------------------------------- |
| `encode` / `decode` / `toASCII` / `toUnicode` |   ✅    | [lib-node-punycode.ts](conformance/lib-node-punycode.ts) | RFC 3492 (deprecated upstream)  |

#### `node:string_decoder`

| API                                     | Status | Probe                                                              | Notes                                                       |
| --------------------------------------- | :----: | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `StringDecoder` (`write` / `end`)       |   ✅    | [lib-node-string-decoder.ts](conformance/lib-node-string-decoder.ts) | Holds back split UTF-8 / UTF-16LE characters and base64 groups |

#### `node:crypto`

| API                                                                       | Status | Probe                                                            | Notes                                                                     |
| ------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `createHash` / `createHmac` / `hash` / `getHashes` (`update` / `digest` / `copy`) | ✅ | [lib-node-crypto-hash.ts](conformance/lib-node-crypto-hash.ts) | md5, sha1, sha224/256/384/512, sha512-224/256, sha3-224/256/384/512        |
| `randomBytes` / `randomUUID` / `randomInt` / `getRandomValues` / `timingSafeEqual`; global `crypto` | ✅ | [lib-node-crypto-random.ts](conformance/lib-node-crypto-random.ts) | `crypto/rand`                                                              |
| `pbkdf2Sync` / `hkdfSync`                                                 |   ✅    | [lib-node-crypto-kdf.ts](conformance/lib-node-crypto-kdf.ts)     | `crypto/pbkdf2` / `crypto/hkdf` (Go 1.24+)                                 |
| `createCipheriv` / `createDecipheriv` (aes-128/192/256-cbc/ctr/gcm)       |   ✅    | [lib-node-crypto-cipher.ts](conformance/lib-node-crypto-cipher.ts) | GCM output arrives from `final()` (authenticated as a whole)               |
| `scryptSync` / `scrypt` (`N` / `r` / `p` / `maxmem` and their aliases); callback forms of `pbkdf2`, `hkdf`, `randomBytes`, `randomFill`; `randomFillSync` | ✅ | [lib-node-crypto-scrypt.ts](conformance/lib-node-crypto-scrypt.ts) | scrypt written out over `crypto/pbkdf2` (Salsa20/8, BlockMix, ROMix); callbacks run on the event loop |
| `KeyObject` (`type`, `asymmetricKeyType`, `asymmetricKeyDetails`, `symmetricKeySize`, `export` as PEM / DER / JWK, `equals`, `KeyObject.from`), `createPrivateKey` / `createPublicKey` / `createSecretKey` (PEM, DER, JWK; pkcs1 / pkcs8 / sec1 / spki; certificates) | ✅ | [lib-node-crypto-keys.ts](conformance/lib-node-crypto-keys.ts) | RSA, EC (P-256 / P-384 / P-521), Ed25519, X25519 |
| `generateKeyPair(Sync)` (`rsa`, `ec`, `ed25519`, `x25519`; KeyObjects or `publicKeyEncoding` / `privateKeyEncoding`), `generateKey(Sync)` (`hmac`, `aes`) | ✅ | [lib-node-crypto-keys.ts](conformance/lib-node-crypto-keys.ts) | RSA keys use the public exponent 65537 |
| `sign` / `verify`, `createSign` / `createVerify` (RSA PKCS#1 v1.5 and PSS with `saltLength`, ECDSA in DER or `ieee-p1363`, Ed25519); `publicEncrypt` / `privateDecrypt` (OAEP with `oaepHash` / `oaepLabel`, PKCS#1, none), `privateEncrypt` / `publicDecrypt`; `crypto.constants` | ✅ | [lib-node-crypto-sign.ts](conformance/lib-node-crypto-sign.ts) | |
| `createECDH` (compressed / uncompressed keys), `getCurves`, `diffieHellman` (ec / x25519 KeyObjects), `createDiffieHellman` / `getDiffieHellman` (modp1 – modp18) | ✅ | [lib-node-crypto-sign.ts](conformance/lib-node-crypto-sign.ts) | `createDiffieHellman(bits)` generates a random (not safe) prime |
| `generatePrime(Sync)` (`bigint`, `safe`, `add` / `rem`), `checkPrime(Sync)` | ✅ | [lib-node-crypto-sign.ts](conformance/lib-node-crypto-sign.ts) | `math/big`'s Miller-Rabin |
| `X509Certificate` (`subject`, `issuer`, `subjectAltName`, `validFrom` / `validTo` (+ `Date`s), fingerprints, `serialNumber`, `ca`, `publicKey`, `raw`, `keyUsage`, `checkHost` / `checkIP` / `checkEmail`, `checkIssued`, `verify`, `toString`, `toLegacyObject`) | ✅ | [lib-node-crypto-keys.ts](conformance/lib-node-crypto-keys.ts) | `crypto/x509` |
| `crypto.subtle` / `webcrypto.subtle`: `digest`, `generateKey`, `importKey` / `exportKey` (`raw`, `spki`, `pkcs8`, `jwk`), `sign` / `verify` (HMAC, RSASSA-PKCS1-v1_5, RSA-PSS, ECDSA, Ed25519), `encrypt` / `decrypt` (AES-GCM / CBC / CTR, RSA-OAEP), `deriveBits` / `deriveKey` (PBKDF2, HKDF, ECDH, X25519), `wrapKey` / `unwrapKey` | ✅ | [lib-node-crypto-subtle.ts](conformance/lib-node-crypto-subtle.ts) | Key usages are recorded but not enforced |
| Encrypted private keys (`passphrase` / `cipher`), `rsa-pss` / `dsa` / `dh` / `ed448` / `x448` key types, `secp256k1`, AES-KW, `Certificate` (SPKAC), `hash` streams (`createHash` as a stream) | ❌ | — | Not in Go's standard library, but portable: AES-KW (RFC 3394) and hash streams are small; encrypted PKCS#8 is PBES2 over `pbkdf2` + AES-CBC; `rsa-pss` / `dsa` / `dh` keys and SPKAC are ASN.1 on existing primitives; `secp256k1` / `ed448` / `x448` need vendored curve code |

#### `node:zlib`

| API                                                                                                  | Status | Probe                                                      | Notes                                                    |
| ---------------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------- | -------------------------------------------------------- |
| `gzipSync` / `gunzipSync` / `deflateSync` / `inflateSync` / `deflateRawSync` / `inflateRawSync` / `unzipSync` / `crc32` / `constants` | ✅ | [lib-node-zlib.ts](conformance/lib-node-zlib.ts) | `{ level }`; invalid input throws `Z_DATA_ERROR` |
| `createGzip` / `createGunzip` / `createDeflate` / `createInflate` / `createDeflateRaw` / `createInflateRaw` / `createUnzip` | ✅ | [lib-node-zlib-streams.ts](conformance/lib-node-zlib-streams.ts) | Transforms that (de)compress when the input ends |
| Callback forms `gzip` / `gunzip` / `deflate` / `inflate` / `deflateRaw` / `inflateRaw` / `unzip` (`buf, [options], cb`) and `util.promisify` of them | ✅ | [lib-node-zlib-async.ts](conformance/lib-node-zlib-async.ts) | The codec runs on a goroutine; the callback runs on the event loop |
| Brotli: `brotliCompressSync` / `brotliDecompressSync`, callback and promisified `brotliCompress` / `brotliDecompress`, `createBrotliCompress` / `createBrotliDecompress`, `constants.BROTLI_*` | ✅ | [lib-node-zlib-brotli.ts](conformance/lib-node-zlib-brotli.ts) | The vendored `andybalholm/brotli` (pure Go, only linked into programs that use it); `params` quality / window. Output matches Node's; decoder errors carry Node's codes |

#### `node:timers`

| API                                                                              | Status | Probe                                                              | Notes                                                                      |
| -------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `setTimeout` / `setInterval` / `setImmediate` (+ extra arguments) / `clear*`; global `setImmediate` | ✅ | [lib-node-timers.ts](conformance/lib-node-timers.ts) | Callbacks run on the event loop                                             |
| `node:timers/promises` (`setTimeout`, `setImmediate`, `setInterval`, `scheduler`) |   ✅    | [lib-node-timers-promises.ts](conformance/lib-node-timers-promises.ts) | `{ signal }` aborts; `setInterval` is an async iterator                      |
| `Timeout` / `Immediate` handles: `ref` / `unref` / `hasRef` / `refresh` / `close` (also on intervals) | ✅ | [lib-node-timers-ref.ts](conformance/lib-node-timers-ref.ts) | Unref'ed timers don't keep the process alive |

#### `node:perf_hooks`

| API                                                                                    | Status | Probe                                                      | Notes                                       |
| -------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------- |
| `performance.now` / `timeOrigin` / `mark` / `measure` / `getEntries*` / `clearMarks`; global `performance` | ✅ | [lib-node-perf-hooks.ts](conformance/lib-node-perf-hooks.ts) | Monotonic milliseconds since process start |
| `PerformanceObserver` (`entryTypes` / `type` + `buffered`, batched, sorted by `startTime`), `timerify`, `createHistogram`, `monitorEventLoopDelay`, `eventLoopUtilization` | ✅ | [lib-node-perf-observer.ts](conformance/lib-node-perf-observer.ts) | `eventLoopUtilization` is estimated from CPU time |

#### `node:tty`

| API          | Status | Probe                                                      | Notes                                    |
| ------------ | :----: | ---------------------------------------------------------- | ---------------------------------------- |
| `isatty(fd)` |   ✅    | [lib-node-perf-hooks.ts](conformance/lib-node-perf-hooks.ts) | Character-device check on fds 0–2        |
| `ReadStream` / `WriteStream` classes | ❌ | — | Feasible; the terminal calls behind them exist (`process.stdout.columns`, `process.stdin.setRawMode` in [process](#nodeprocess)) |

#### `node:constants` / `node:sys`

| API                                       | Status | Probe                                                      | Notes                                                |
| ----------------------------------------- | :----: | ---------------------------------------------------------- | ---------------------------------------------------- |
| `node:constants` (`F_OK`, `SIGINT`, …)    |   ✅    | [lib-node-perf-hooks.ts](conformance/lib-node-perf-hooks.ts) | Deprecated upstream: `fs.constants` + `os.constants.signals` |
| `node:sys`                                |   ✅    | —                                                          | Deprecated alias of `node:util`                      |

#### `node:events`

| API                                                                                                  | Status | Probe                                                          | Notes                                                                      |
| ---------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `EventEmitter`: `on` / `once` / `off` / `prepend*` / `emit` / `removeAllListeners` / `listenerCount` / `eventNames` / max listeners / `newListener`; unhandled `'error'` throws | ✅ | [lib-node-events.ts](conformance/lib-node-events.ts) | Listeners are called with any signature; removal by identity                |
| `class X extends EventEmitter`                                                                       |   ✅    | [lib-node-events-extends.ts](conformance/lib-node-events-extends.ts) | The emitter is embedded; `this.emit` and inherited methods work           |
| `events.once` (→ promise) / `events.on` (async iterator)                                             |   ✅    | [lib-node-events-once.ts](conformance/lib-node-events-once.ts) | `'error'` rejects `once`                                                   |
| `EventTarget` / `Event` / `AbortController` / `AbortSignal` (`abort`, `timeout`, `any`, `throwIfAborted`) | ✅ | [lib-node-abort.ts](conformance/lib-node-abort.ts)            | Globals (also exported by `node:events`)                                   |
| `errorMonitor`, `captureRejections` (option and global), `getMaxListeners` / `setMaxListeners` (static), `addAbortListener` | ✅ | [lib-node-events-extra.ts](conformance/lib-node-events-extra.ts) | Captures rejections of listeners that return a promise; async arrow listeners run inline (their `await`s don't yield to `emit`) |
| Symbol event names other than `errorMonitor`, `EventEmitterAsyncResource`, `Symbol.for('nodejs.rejection')` | ❌ | — | Event names are strings today; symbols are unique pointers, usable as listener keys, and `EventEmitterAsyncResource` fits on `AsyncResource` |

#### `node:stream`

| API                                                                                                   | Status | Probe                                                                | Notes                                                                                        |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Readable` (`push`, `read`, `pause` / `resume`, `setEncoding`, `destroy`), `Readable.from`, `for await` | ✅    | [lib-node-stream-readable.ts](conformance/lib-node-stream-readable.ts) | Arrays, strings, Buffers and async generators as sources                                      |
| `Writable` (`write` / `end` / callbacks, `final`, `'finish'`, write after end)                         |   ✅    | [lib-node-stream-writable.ts](conformance/lib-node-stream-writable.ts) | Strings become Buffers unless `decodeStrings: false` or `objectMode`                          |
| `Transform` / `PassThrough` / `Duplex`, `pipe` chains, subclasses overriding `_transform` & co.        |   ✅    | [lib-node-stream-transform.ts](conformance/lib-node-stream-transform.ts) | Option methods (`transform`, `flush`, `write`, `final`, `read`) and `_`-overrides both work; `this` inside option methods is not the stream (use the callback) |
| `pipeline` / `finished` / `stream/promises` / `stream/consumers` (`text`, `json`, `buffer`)           |   ✅    | [lib-node-stream-pipeline.ts](conformance/lib-node-stream-pipeline.ts) | Errors destroy the pipeline and reach the callback / rejection                               |
| `Readable.toWeb` / `fromWeb`, `Writable.toWeb` / `fromWeb`, `Duplex.toWeb` / `fromWeb`, `compose` (Node and web streams) | ✅ | [lib-node-stream-web-bridge.ts](conformance/lib-node-stream-web-bridge.ts) | `toWeb` pauses the Node stream while the web queue is full |
| Backpressure (`highWaterMark` beyond `write()`'s return value), `compose` with generator functions | ❌  | —                                                                    | Not implemented yet                                                                          |

#### `node:stream/web`

| API                                                                                                   | Status | Probe                                                                | Notes                                                                 |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `ReadableStream` (underlying source `start` / `pull` / `cancel`, sync or async), `getReader()` → `read` / `releaseLock` / `cancel` / `closed`, `locked`, `cancel`, `tee`, `for await` / `values()`, `ReadableStream.from` | ✅ | [lib-node-stream-web.ts](conformance/lib-node-stream-web.ts) | Promise reactions run as microtasks on the event loop; an error ends `for await` with a throw |
| `WritableStream` (sink `start` / `write` / `close` / `abort`), `getWriter()` → `write` / `close` / `abort` / `ready` / `closed` / `desiredSize` / `releaseLock`; controller `error` / `signal` | ✅ | [lib-node-stream-web.ts](conformance/lib-node-stream-web.ts) | Writes run one at a time; `ready` follows the queue's backpressure |
| `TransformStream` (`transform` / `flush` / `start`, controller `enqueue` / `error` / `terminate`), `pipeThrough` / `pipeTo` (`preventClose` / `preventAbort` / `preventCancel` / `signal`) | ✅ | [lib-node-stream-web.ts](conformance/lib-node-stream-web.ts) | A transform waits until its readable side wants more |
| `CountQueuingStrategy` / `ByteLengthQueuingStrategy`, `{ highWaterMark, size }` strategies             |   ✅    | [lib-node-stream-web.ts](conformance/lib-node-stream-web.ts)         |                                                                       |
| `TextEncoderStream` / `TextDecoderStream` (characters split across chunks), `CompressionStream` / `DecompressionStream` (`gzip`, `deflate`, `deflate-raw`) | ✅ | [lib-node-stream-web-bridge.ts](conformance/lib-node-stream-web-bridge.ts) | Decompression decodes once the input ends |
| BYOB readers (`getReader({ mode: 'byob' })` reads into a view), byte-stream controllers' `byobRequest`, transferring streams | ❌ | — | `getReader({ mode: 'byob' })` returns a default reader |

#### `node:readline`

| API                                                                                     | Status | Probe                                                                    | Notes                                                                   |
| --------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `createInterface` (`'line'` / `'close'`, `question(q, cb)`, `prompt`, `close`, `for await`) |   ✅    | [lib-node-readline.ts](conformance/lib-node-readline.ts)                 | Any readable stream as input (`process.stdin` included)                  |
| `node:readline/promises` (`await rl.question(q)`)                                        |   ✅    | [lib-node-readline-promises.ts](conformance/lib-node-readline-promises.ts) |                                                                         |
| `question(prompt)` (synchronous)                                                        |   ✅    | [lib-node-readline-question.ts](conformance/lib-node-readline-question.ts) | TypeNative extension (not in Node): used by the self-hosted compiler     |
| `cursorTo` / `moveCursor` / `clearLine` / `clearScreenDown`                              |   ✅    | [lib-node-readline-cursor.ts](conformance/lib-node-readline-cursor.ts)   | ANSI escape sequences written to the stream; optional callback           |
| `emitKeypressEvents(stream)` (`'keypress'` with `(str, key)`) | ✅ | [lib-node-readline-keypress.ts](conformance/lib-node-readline-keypress.ts) | A port of Node's key decoder: names, `ctrl` / `meta` / `shift`, xterm / rxvt / putty sequences, Escape after 500 ms. `str` is `""` (not `undefined`) for escape sequences, and so are `name` / `code` when Node leaves them out |
| `Interface` line editing, `history`, `completer` | ❌ | — | Feasible: keypresses and raw mode exist; needs the terminal-mode line editor on top |

#### `node:child_process`

| API                                                                                              | Status | Probe                                                                      | Notes                                                                                     |
| ------------------------------------------------------------------------------------------------ | :----: | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `execSync` / `execFileSync` / `spawnSync` (`encoding`, `input`, `cwd`, `env`, `shell`, `stdio: 'inherit'`) | ✅ | [lib-node-child-process-sync.ts](conformance/lib-node-child-process-sync.ts) | Buffers unless an encoding is given (as in Node); a non-zero exit throws with `status` / `stdout` / `stderr` |
| `exec` / `execFile` (callbacks), `spawn` → `ChildProcess` (stdio streams, `'exit'` / `'close'`, `kill`); `promisify(exec)` | ✅ | [lib-node-child-process-async.ts](conformance/lib-node-child-process-async.ts) | `'close'` follows the end of the stdio streams being read; exit codes on `err.code`     |
| `fork(modulePath, args, { env, cwd, silent })` → `send` / `'message'` / `disconnect` / `'disconnect'` / `connected`; in the child `process.send` / `process.on('message')` / `process.connected` / `process.disconnect` | ✅ | [lib-node-child-process-fork.ts](conformance/lib-node-child-process-fork.ts) | The child is this program run again (branch on `process.argv` / `process.send`), linked over loopback TCP; messages are structured clones (a superset of Node's default JSON) |
| `spawn` `detached`, `child.unref()` / `ref()` | ✅ | [lib-node-child-process-detached.ts](conformance/lib-node-child-process-detached.ts) | A new session (`setsid`) on Unix; `DETACHED_PROCESS \| CREATE_NEW_PROCESS_GROUP` on Windows, as libuv does. An unref'ed child's stdio pipes don't keep the parent alive either |
| `stdio` arrays beyond stdout, forking another file | ❌ | — | Extra `stdio` entries are `ExtraFiles`; another file needs a second entry point compiled into the binary (see the [roadmap](#roadmap-known-limitations)) |
| `serialization: 'advanced'` handle passing (`send(msg, socket)`) | ❌ | — | Needs file-descriptor passing over the IPC channel (`SCM_RIGHTS` on Unix) |

#### `node:cluster`

| API                                                                                                   | Status | Probe                                                                | Notes                                                                 |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `isPrimary` / `isWorker` / `isMaster`, `fork(env)`, `workers`, `worker`, `setupPrimary` / `settings`, `disconnect(cb)`, `SCHED_RR` / `schedulingPolicy`; events `'fork'` / `'online'` / `'listening'` / `'message'` / `'disconnect'` / `'exit'` | ✅ | [lib-node-cluster.ts](conformance/lib-node-cluster.ts) | Workers are this program run again with `NODE_UNIQUE_ID` set |
| `Worker` (`id`, `process`, `send`, `'message'`, `disconnect`, `kill`, `isConnected`, `isDead`, `exitedAfterDisconnect`); `process.send` from workers | ✅ | [lib-node-cluster.ts](conformance/lib-node-cluster.ts) | |
| Shared ports: `net` / `http` / `https` / `tls` servers in workers listen on one port (also `listen(0)`), connections round-robin | ✅ | [lib-node-cluster.ts](conformance/lib-node-cluster.ts) | The primary owns the listener and relays each connection to a worker's private loopback listener with the client's address (no handle passing) |
| `SCHED_NONE` (OS-level balancing), `exclusive: true` listeners, dgram sockets in workers | ❌ | — | Everything goes through the primary today; `SO_REUSEPORT` or handle passing would remove it |

#### `node:diagnostics_channel`

| API                                                                                  | Status | Probe                                                                        | Notes                         |
| ------------------------------------------------------------------------------------ | :----: | ---------------------------------------------------------------------------- | ----------------------------- |
| `channel` / `publish` / `subscribe` / `unsubscribe` / `hasSubscribers`               |   ✅    | [lib-node-diagnostics-channel.ts](conformance/lib-node-diagnostics-channel.ts) | Synchronous; shared by name   |
| `tracingChannel` (`start` / `end` / `asyncStart` / `asyncEnd` / `error` channels, `subscribe` / `unsubscribe`, `traceSync` / `tracePromise` / `traceCallback`); `channel.bindStore` / `unbindStore` / `runStores` | ✅ | [lib-node-diagnostics-tracing.ts](conformance/lib-node-diagnostics-tracing.ts) | The context gets `result` / `error`; a struct context without those fields is copied into a record |

#### `node:net`

| API                                                                                                   | Status | Probe                                        | Notes                                                                                     |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `createServer` / `Server` (`listen` forms incl. `{ port, host }` and Unix paths, `address()`, `close(cb)`, `getConnections`, `maxConnections`, `ref` / `unref`; `'listening'` / `'connection'` / `'close'` / `'error'`) | ✅ | [lib-node-net.ts](conformance/lib-node-net.ts) | A listening server keeps the process alive; `close()` emits `'close'` once its connections end |
| `connect` / `createConnection` / `Socket` (a duplex stream: `write` / `end` / `'data'` / `'end'`, `setEncoding`, `remoteAddress` / `remotePort` / `localPort`, `setTimeout` + `'timeout'`, `setNoDelay`, `setKeepAlive`, `destroy`, `'close'(hadError)`) | ✅ | [lib-node-net.ts](conformance/lib-node-net.ts) | One goroutine reads the `net.Conn`; `allowHalfOpen: false` ends the socket after `'end'`, as in Node |
| Node's errors (`connect ECONNREFUSED 127.0.0.1:80`, `EADDRINUSE`, `ECONNRESET`; `code` / `errno` / `syscall` / `address` / `port`) | ✅ | [lib-node-net.ts](conformance/lib-node-net.ts) |                                                                                           |
| `isIP` / `isIPv4` / `isIPv6`                                                                           |   ✅    | [lib-node-net.ts](conformance/lib-node-net.ts) |                                                                                         |
| `BlockList` (`addAddress` / `addRange` / `addSubnet` / `check` / `rules` / `isBlockList`) / `SocketAddress` (`parse`, `toJSON`) | ✅ | [lib-node-net-blocklist.ts](conformance/lib-node-net-blocklist.ts) | `net/netip`; IPv4-mapped IPv6 addresses match IPv4 rules, as in Node |
| `net.Stream`, `get/setDefaultAutoSelectFamily(AttemptTimeout)`                                          |   ✅    | [lib-node-net-blocklist.ts](conformance/lib-node-net-blocklist.ts) | Go's dialer always races IPv4 / IPv6, so the settings are reported but not used |
| IPC handle passing (`send(msg, socket)`)                                                               |   ❌    | —                                            | Needs file-descriptor passing over the IPC channel                                        |

#### `node:dns`

| API                                                                                    | Status | Probe                                        | Notes                                                                 |
| -------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | --------------------------------------------------------------------- |
| `lookup` (`family`, `all`) and `dns/promises` / `dns.promises` `lookup`                 |   ✅    | [lib-node-dns.ts](conformance/lib-node-dns.ts) | Go's resolver; `getaddrinfo ENOTFOUND host` errors with `hostname`   |
| `resolve` (rrtype) / `resolve4` / `resolve6` / `resolveCname` / `resolveMx` / `resolveTxt` / `resolveNs` / `resolveSrv` / `reverse` (callback and promise forms), `getServers` | ✅ | — | Implemented, not probed (needs a network); `getServers` reads `/etc/resolv.conf` |
| `Resolver` class (callback and `dns/promises` forms: `setServers` / `getServers` / `setLocalAddress` / `cancel`, `timeout` option), module `setServers`, `lookupService` | ✅ | [lib-node-dns-resolver.ts](conformance/lib-node-dns-resolver.ts) | Go's pure resolver dialing the configured servers in turn; `ETIMEOUT` / `ECANCELLED`; services from `/etc/services` |
| `resolveAny` / `resolveCaa` / `resolveNaptr` / `resolvePtr` / `resolveSoa`, the `ttl` option, `tries` |   ❌    | —                                            | Go's resolver hides these records and TTLs, but GOROOT vendors `golang.org/x/net/dns/dnsmessage`, which can be copied in the way `normalize` copies `x/text` |

#### `node:http` / `node:https`

| API                                                                                                   | Status | Probe                                                          | Notes                                                                                        |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `createServer((req, res) => …)` / `'request'`; `IncomingMessage` (a Readable: `method`, `url`, `headers`, `headersDistinct`, `rawHeaders`, `httpVersion`, `socket.remoteAddress`) | ✅ | [lib-node-http-server.ts](conformance/lib-node-http-server.ts) | Go's `net/http` serves the connections; bodies stream into the request                       |
| `ServerResponse` (a Writable: `statusCode`, `setHeader` / `getHeader` / `getHeaders` / `hasHeader` / `removeHeader` / `appendHeader`, `writeHead`, `write`, `end`, `headersSent`, `'finish'`) | ✅ | [lib-node-http-server.ts](conformance/lib-node-http-server.ts) | `end(data)` without earlier writes sends a `Content-Length`; `write()` streams a chunked body |
| `request` / `get` (URL strings, `URL` objects, options: `hostname` / `port` / `path` / `method` / `headers` / `auth` / `timeout` / `signal` / `socketPath`); `ClientRequest` (`setHeader`, `write`, `end`, `destroy`, `'response'`, `'error'`, `'timeout'`) | ✅ | [lib-node-http-client.ts](conformance/lib-node-http-client.ts) | No redirects are followed and bodies are not decompressed, as in Node; `destroy()` before a response fails with `socket hang up` |
| `STATUS_CODES` / `METHODS` / `maxHeaderSize` / `Agent` / `globalAgent`                                |   ✅    | [lib-node-http-server.ts](conformance/lib-node-http-server.ts) | `Agent` options are accepted; Go's transport pools connections                               |
| `https.createServer({ key, cert })` / `https.request` / `https.get` (`ca`, `rejectUnauthorized`, `servername`, client `key` / `cert`) | ✅ | [lib-node-https.ts](conformance/lib-node-https.ts) | Certificate checks as in [node:tls](#nodetls)                                               |
| `headers` values                                                                                      |   ✅    | [lib-node-http-client.ts](conformance/lib-node-http-client.ts) | Repeated headers are joined with `, ` (`; ` for `cookie`) — including `set-cookie`, which Node keeps as an array: use `headersDistinct['set-cookie']` |
| Server `'upgrade'` / `'connect'` (`req, socket, head`) and client `'upgrade'` / `'connect'` events | ✅ | [lib-node-http-upgrade.ts](conformance/lib-node-http-upgrade.ts) | The server hijacks the connection; an upgrade nobody listens for is an ordinary request, an unhandled CONNECT closes the connection, as in Node |
| Trailers we send, `Agent` socket pooling control | ❌ | — | Feasible: Go's `Trailer` header, `Transport.MaxConnsPerHost` / `MaxIdleConnsPerHost` |
| `statusMessage` on responses we send, `'checkContinue'` | ❌ | — | Go's `ResponseWriter` sends its standard reason phrases and answers `100-continue` itself: needs a hijacked connection |

#### `node:http2`

| API                                                                                                   | Status | Probe                                                                | Notes                                                                 |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `createServer` (cleartext h2c) / `createSecureServer({ key, cert, allowHTTP1 })`; `'stream'` → `ServerHttp2Stream` (`respond`, `write` / `end`, `respondWithFile`, `close`, a Duplex over the request body) with `:method` / `:path` / `:scheme` / `:authority` headers | ✅ | [lib-node-http2.ts](conformance/lib-node-http2.ts), [lib-node-http2-secure.ts](conformance/lib-node-http2-secure.ts) | On `net/http`'s HTTP/2 (`http.Protocols`) |
| Compatibility API: `(req, res)` handlers get `Http2ServerRequest` / `Http2ServerResponse` (`httpVersion` `'2.0'`, pseudo-headers in `req.headers`) | ✅ | [lib-node-http2.ts](conformance/lib-node-http2.ts) | The node:http objects |
| `connect(authority, { ca, rejectUnauthorized, servername })` → `ClientHttp2Session` (`request`, `close`, `destroy`, `'connect'` / `'error'` / `'close'`, `alpnProtocol`, `encrypted`); `ClientHttp2Stream` (`'response'` with `:status`, body as a Readable, request bodies) | ✅ | [lib-node-http2.ts](conformance/lib-node-http2.ts), [lib-node-http2-secure.ts](conformance/lib-node-http2-secure.ts) | Connection failures error the session and cancel its streams (`ERR_HTTP2_STREAM_CANCEL`); request bodies are sent once the writable side ends |
| `constants`, `getDefaultSettings` | ✅ | [lib-node-http2.ts](conformance/lib-node-http2.ts) | |
| `ping`, `settings` / `goaway` / `altsvc`, `'session'` events, `getPackedSettings`, upgrades from HTTP/1 | ❌ | — | Go's bundled HTTP/2 hides frames: needs a vendored `golang.org/x/net/http2` |
| Server push | 🚫 | — | Deprecated (browsers removed it); Go's server doesn't push |

#### `node:tls`

| API                                                                                                   | Status | Probe                                        | Notes                                                                                       |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `createServer({ key, cert, ca, requestCert, ALPNProtocols, minVersion, maxVersion }, cb)` / `'secureConnection'` | ✅ | [lib-node-tls.ts](conformance/lib-node-tls.ts) | Handshakes run on the accept goroutine                                                    |
| `connect` (`host`, `port`, `ca`, `servername`, `rejectUnauthorized`, client `key` / `cert`) / `'secureConnect'`; `TLSSocket` (`authorized`, `authorizationError`, `encrypted`, `alpnProtocol`, `getPeerCertificate`, `getProtocol`, `getCipher`) | ✅ | [lib-node-tls.ts](conformance/lib-node-tls.ts) | Node's verification codes: `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID` |
| `createSecureContext` / `getCiphers` / `DEFAULT_MIN_VERSION` / `DEFAULT_MAX_VERSION`                   |   ✅    | —                                            | Implemented, not probed; cipher names are Go's                                              |
| `checkServerIdentity` (function and `connect` option)                                                  |   ✅    | [lib-node-tls-identity.ts](conformance/lib-node-tls-identity.ts) | Node's rules: one leftmost wildcard label, IP altnames, CN only without DNS altnames |
| PFX / passphrase-protected keys, session resumption, `renegotiate`, `rootCertificates`                 |   ❌    | —                                     | Not implemented yet: PFX needs a PKCS#12 decoder; `rootCertificates` can embed Mozilla's bundle (as Node does); Go has session tickets (`ClientSessionCache`) and client-side renegotiation |

#### `node:dgram`

| API                                                                                       | Status | Probe                                          | Notes                                         |
| ----------------------------------------------------------------------------------------- | :----: | ---------------------------------------------- | --------------------------------------------- |
| `createSocket('udp4' \| 'udp6' \| { type })`, `bind`, `send` (offset / length forms, callback), `'message'(msg, rinfo)`, `address`, `close`, `connect` / `disconnect` / `remoteAddress`, `ref` / `unref` | ✅ | [lib-node-dgram.ts](conformance/lib-node-dgram.ts) | `send` binds an unbound socket first, as in Node |
| `addMembership` / `dropMembership`, `setMulticastInterface` / `setMulticastTTL` / `setMulticastLoopback`, `setBroadcast`, `setTTL` | ✅ | [lib-node-dgram-multicast.ts](conformance/lib-node-dgram-multicast.ts) | `setsockopt` on the socket per OS (Linux, macOS, the BSDs, Windows). Options before `bind()` throw `EBADF` and membership binds an unbound socket, as in Node |
| `addSourceSpecificMembership` / `dropSourceSpecificMembership` | ❌ | — | Feasible: `IP_ADD_SOURCE_MEMBERSHIP`, whose struct layout differs per OS |

#### `fetch`

| API                                                                                                   | Status | Probe                                            | Notes                                                                                      |
| ----------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `fetch(url \| Request, { method, headers, body, redirect, signal })`; `Response` (`status`, `ok`, `statusText`, `headers`, `url`, `redirected`, `text()` / `json()` / `bytes()` / `arrayBuffer()`, `clone()`, `Response.json` / `error` / `redirect`) | ✅ | [lib-node-fetch.ts](conformance/lib-node-fetch.ts) | Follows redirects (`manual` / `error` too); gzip bodies are decompressed; failures reject with `TypeError('fetch failed')` whose `cause` is the system error; aborts reject with `AbortError` |
| `Headers` (`get` / `set` / `append` / `has` / `delete` / `forEach` / `entries` / `getSetCookie`, `for...of`) / `Request` |   ✅    | [lib-node-fetch.ts](conformance/lib-node-fetch.ts) | Names are lower-cased and iterated in sorted order                                         |
| Streaming bodies: `response.body` / `request.body` as `ReadableStream`s, `ReadableStream` request bodies (`duplex: 'half'`), `clone()` tees the body | ✅ | [lib-node-fetch-stream.ts](conformance/lib-node-fetch-stream.ts) | Network bodies are read a chunk per pull |
| `Blob` / `FormData` bodies (multipart encoding), `blob()` / `formData()` (multipart and urlencoded) |   ✅    | [lib-node-blob.ts](conformance/lib-node-blob.ts), [lib-node-fetch-stream.ts](conformance/lib-node-fetch-stream.ts) | |
| The Fetch standard's bad-port list (also on redirects)                                                |   ✅    | [lib-node-fetch-bad-port.ts](conformance/lib-node-fetch-bad-port.ts) | `TypeError: fetch failed` with cause `bad port`                                            |

#### `node:async_hooks`

| API                                                                                                  | Status | Probe                                                      | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AsyncLocalStorage` (`run`, `getStore`, `enterWith`, `exit`, `disable`, static `bind` / `snapshot`)    |   ✅    | [lib-node-async-hooks.ts](conformance/lib-node-async-hooks.ts) | The store follows timers, `setImmediate`, `nextTick`, microtasks, promise callbacks, `await`, async function bodies, fs / dns callbacks; streams, sockets and servers emit in the context they were created / listened in |
| `AsyncResource` (`runInAsyncScope`, `bind`, `asyncId`, static `bind`)                                 |   ✅    | [lib-node-async-hooks.ts](conformance/lib-node-async-hooks.ts) | Captures the context it is created in                                                                   |
| `createHook` callbacks (`init` / `before` / `after` / `destroy`), real `executionAsyncId` / `triggerAsyncId` |   ❌    | —                                                  | `createHook` is accepted but never calls back; ids are always `1` / `0`. Feasible: the event loop's `TnAsyncSnapshot` / `TnAsyncRun` are where the callbacks would fire |

#### `node:test`

| API                                                                                                  | Status | Probe                                                   | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `test` / `it` / `describe` / `suite` (+ `.skip` / `.todo` / `.only`; `skip` / `todo` / `timeout` options); sync, async and `done`-callback tests | ✅ | [lib-node-test.ts](conformance/lib-node-test.ts) | Tests run one after another once the main module has finished, as in Node |
| `before` / `after` / `beforeEach` / `afterEach` (file and suite level, `t.before` & co.)              |   ✅    | [lib-node-test.ts](conformance/lib-node-test.ts)        | Node's order: outer `beforeEach` first, inner `afterEach` first                                          |
| `TestContext`: `t.test` subtests, `t.skip`, `t.todo`, `t.diagnostic`, `t.plan`, `t.name`, `t.fullName`, `t.signal`, `t.mock` |   ✅    | [lib-node-test.ts](conformance/lib-node-test.ts) |                                                                                       |
| Reporting: TAP (Node's default when stdout is not a terminal) / spec (on a terminal); `tests` / `suites` / `pass` / `fail` / `cancelled` / `skipped` / `todo` counters; exit code 1 on failure | ✅ | [lib-node-test-fail.ts](conformance/lib-node-test-fail.ts) | Same layout as Node, without `location` / `stack` yet (the `//line` directives make them recoverable through `runtime.Callers`); timeouts count as cancelled |
| `mock.fn(original?, implementation?)`; `fn.mock.calls` / `callCount()` / `mockImplementation(Once)` / `resetCalls()` / `restore()` |   ✅    | [lib-node-test.ts](conformance/lib-node-test.ts) | The mock has the original's Go function type                                                          |
| `t.assert` (`node:assert`'s functions, counted by `t.plan`) and `mock.timers` (`enable({ apis, now })`, `tick`, `runAll`, `setTime`, `reset`; `setTimeout` / `setInterval` / `setImmediate` / `Date`) | ✅ | [lib-node-test-mock-timers.ts](conformance/lib-node-test-mock-timers.ts) | Mocked timers do not keep the process alive; `t.mock` timers reset after each test |
| `mock.method` / `mock.getter` / `mock.setter`                                                         |   ❌    | —                                   | Object-literal methods are function fields and can be swapped; class methods need calls routed through a replaceable table |
| Snapshots, `--test-only` / `--test-name-pattern` / `--test-reporter` flags, `run()`                      |   ❌    | —                                   | Not implemented (`only` runs everything, like Node without `--test-only`); flags can be read from the binary's arguments; `run()` needs extra entry points |
| Coverage | ❌ | — | Would need Go's `-cover` instrumentation mapped back through the `//line` directives |

#### `node:worker_threads`

| API                                                                                                  | Status | Probe                                                              | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Worker` (`workerData`, `argv`, `env` / `SHARE_ENV`; `postMessage`, `'online'` / `'message'` / `'error'` / `'exit'`, `terminate()`, `threadId`, `ref` / `unref`); `isMainThread`, `parentPort`, `workerData`, `threadId` | ✅ | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | A worker re-runs the current program as a child process (an isolate of its own, as in Node) linked over loopback TCP; branch on `isMainThread` |
| Messages: structured clone of JSON-like values, Buffers (arriving as `Uint8Array`s), `Map`, `Set`, `Date`, `bigint`, errors |   ✅    | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | Functions throw `DataCloneError`                                                                    |
| Uncaught exceptions in a worker / `terminate()`                                                        |   ✅    | [lib-node-worker-errors.ts](conformance/lib-node-worker-errors.ts) | `'error'` with the message, then exit code `1`                                                          |
| `MessageChannel` / `MessagePort` (`postMessage`, `on('message')`, `onmessage`, `start`, `close`, `ref` / `unref`), `receiveMessageOnPort`, `BroadcastChannel`, `get/setEnvironmentData` | ✅ | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | Channels and broadcast channels work within one process (ports can't be transferred to workers)     |
| Workers for another file, transferring ports, `resourceLimits`, worker `stdout: true` streams |   ❌    | —                                     | Another file needs a second entry point compiled into the binary (see the [roadmap](#roadmap-known-limitations)); ports can be relayed through the parent; `resourceLimits` maps to `debug.SetMemoryLimit` |
| `eval: true`, `SharedArrayBuffer` / `Atomics` | 🚫 | — | `eval` needs a JavaScript engine; workers are processes, so memory is not shared |

#### `node:sqlite`

SQLite comes from [ncruces/go-sqlite3](https://github.com/ncruces/go-sqlite3): SQLite compiled
to Wasm and translated to Go, so programs need no cgo and still cross-compile. The npm package
ships the driver in [govendor/](govendor/) (`npm run vendor:go` updates it), so builds need no
network; it adds about 10 MB to a binary. Rows are records: `row.name`, `row as Row` and
`rows as Row[]` all work.

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `new DatabaseSync(path, options)` (`:memory:`, files, `file:` URIs), `open` / `close` / `isOpen` / `isTransaction` / `location()`, `exec` | ✅ | [lib-node-sqlite.ts](conformance/lib-node-sqlite.ts) | `open: false` defers to `open()` |
| `prepare(sql, options)`; `StatementSync#run` (`{ changes, lastInsertRowid }`) / `get` / `all` / `iterate` (`for…of`, `next()`) | ✅ | [lib-node-sqlite.ts](conformance/lib-node-sqlite.ts) | Rows are objects keyed by column name; `get()` without a row is `undefined` |
| Parameters: anonymous `?`, named `:x` / `$x` / `@x`, bare names (`{ x }`); values `null`, number (REAL), bigint (INTEGER), string, boolean (1 / 0), `Uint8Array` / Buffer | ✅ | [lib-node-sqlite.ts](conformance/lib-node-sqlite.ts) | Results: INTEGER → number (bigint with `readBigInts`), REAL → number, TEXT → string, BLOB → `Uint8Array`, NULL → `null` |
| Options `readOnly`, `enableForeignKeyConstraints` (on by default), `enableDoubleQuotedStringLiterals`, `timeout`, `readBigInts`, `returnArrays`, `allowBareNamedParameters`, `allowUnknownNamedParameters`, `defensive`, `limits` | ✅ | [lib-node-sqlite-options.ts](conformance/lib-node-sqlite-options.ts) | `db.limits.x = n` sets a limit; `Infinity` restores the maximum |
| `columns()`, `sourceSQL`, `expandedSQL`, `setReadBigInts` / `setReturnArrays` / `setAllowBareNamedParameters` / `setAllowUnknownNamedParameters`, `enableDefensive` | ✅ | [lib-node-sqlite-options.ts](conformance/lib-node-sqlite-options.ts) | |
| `createTagStore()` (`` sql.get`… ${x}` `` / `all` / `run` / `iterate`, `size`, `capacity`, `clear`) | ✅ | [lib-node-sqlite-options.ts](conformance/lib-node-sqlite-options.ts) | One cached statement per template, least recently used out first |
| `function(name, options, fn)` (`deterministic`, `directOnly`, `varargs`, `useBigIntArguments`), `aggregate(name, { start, step, result, inverse })` (window functions) | ✅ | [lib-node-sqlite-functions.ts](conformance/lib-node-sqlite-functions.ts) | A throw inside the callback is rethrown by the statement |
| `setAuthorizer(callback)`, `constants` (`SQLITE_OK` / `DENY` / `IGNORE`, action codes, `SQLITE_CHANGESET_*`) | ✅ | [lib-node-sqlite-functions.ts](conformance/lib-node-sqlite-functions.ts) | |
| Errors: SQLite's message with `code: 'ERR_SQLITE_ERROR'`, `errcode` (extended result code), `errstr`; `ERR_INVALID_STATE` / `ERR_OUT_OF_RANGE` / `ERR_INVALID_ARG_VALUE` | ✅ | [lib-node-sqlite-errors.ts](conformance/lib-node-sqlite-errors.ts) | Same messages as Node 24 |
| `backup(db, path, { source, rate, progress })` | ✅ | [lib-node-sqlite-errors.ts](conformance/lib-node-sqlite-errors.ts) | Copies `rate` pages per event-loop turn; resolves with the page count |
| `loadExtension` / `enableLoadExtension` | 🚫 | — | SQLite runs as Wasm inside the program; native extensions can't load |
| `createSession` / `applyChangeset` | ❌ | — | The bundled SQLite build has no session extension: needs an emulation over the preupdate hook (hard) |
| `serialize` / `deserialize` | ❌ | — | The driver has no `sqlite3_serialize` binding; feasible through a temporary file and the backup API |
| `undefined` as a parameter value, `[Object: null prototype]` rows | 🚫 | — | `undefined` and `null` are both `nil` (binds NULL instead of throwing); rows print as plain objects |
| Finalizing a statement when it is garbage-collected | ❌ | — | Statements live until `db.close()`: re-preparing in a loop holds every copy until then; reuse statements or `createTagStore()`. Feasible: `runtime.AddCleanup` can post the finalize to the event loop |

#### `node:inspector`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| Debugger / profiler sessions (`Session`, `open`, `url`) | 🚫 | — | Speaks the inspector protocol of a JavaScript engine; a native binary has none |

#### `node:repl`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `start` / `REPLServer` | 🚫 | — | Evaluates JavaScript at runtime; needs a JavaScript engine |

#### `node:vm`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `Script` / `runInContext` / `createContext` / `compileFunction` & co. | 🚫 | — | Compiles and runs JavaScript code at runtime; needs a JavaScript engine |

#### `node:v8`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `getHeapStatistics` / `getHeapSpaceStatistics`, `serialize` / `deserialize` | ❌ | — | Feasible: `runtime.MemStats`; the structured-clone codec workers already use |
| Heap snapshots, `setFlagsFromString`, `startupSnapshot` | 🚫 | — | V8 internals; there is no V8 in a native binary |

#### `node:wasi`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `WASI` | ❌ | — | Needs a Wasm runtime: vendoring wazero (pure Go, no cgo) would provide one |

#### `node:sea`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `isSea` / `getAsset` / `getRawAsset` | ❌ | — | Every TypeNative binary is a single executable (`isSea()` would be `true`); assets would be files embedded with `go:embed` |

#### `node:trace_events`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `createTracing` / `getEnabledCategories` | 🚫 | — | V8 / Node trace categories; no native equivalent |

#### `node:module`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `builtinModules` / `isBuiltin` / `createRequire(…)('literal')` / `findPackageJSON` | ❌ | — | Feasible: static lists, and `require` of a literal specifier resolved at compile time like an import |
| `register` / `registerHooks` (loader hooks), `require` of computed specifiers | 🚫 | — | Hooks into a JavaScript loader; imports are resolved at compile time |

#### `node:test/reporters`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `tap` / `spec` / `dot` / `junit` | ❌ | — | `tap` and `spec` already run in-process (see [test](#nodetest)); exporting them and adding `dot` / `junit` is feasible |
| `lcov` | ❌ | — | Needs coverage (see [test](#nodetest)) |

#### `node:domain`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `create` / `Domain` | 🚫 | — | Deprecated upstream |

### Go bridges (`go:*`)

Status: ✅ probed, ⚠️ typed (declared and bridged), no probe yet, ❌ excluded.

<!-- go-bridges:start -->
| Module | Status | Probe | Notes |
| ------ | :----: | ----- | ----- |
| `go:archive/tar` | ✅ | [lib-go-compress-extra.ts](conformance/lib-go-compress-extra.ts) | tar archive read/write |
| `go:archive/zip` | ✅ | [lib-go-archive.ts](conformance/lib-go-archive.ts) | ZIP archive read/write |
| `go:bufio` | ✅ | [lib-go-bufio.ts](conformance/lib-go-bufio.ts) | Buffered I/O |
| `go:bytes` | ✅ | [lib-go-bytes.ts](conformance/lib-go-bytes.ts) | Byte-slice utilities |
| `go:cmp` | ✅ | [lib-go-slices.ts](conformance/lib-go-slices.ts) | Ordered comparison primitives |
| `go:compress/bzip2` | ✅ | [lib-go-compress-extra.ts](conformance/lib-go-compress-extra.ts) | bzip2 decompression (read-only) |
| `go:compress/flate` | ✅ | [lib-go-compress-extra.ts](conformance/lib-go-compress-extra.ts) | DEFLATE compression |
| `go:compress/gzip` | ✅ | [lib-go-compress-gzip.ts](conformance/lib-go-compress-gzip.ts) | gzip read/write |
| `go:compress/lzw` | ✅ | [lib-go-compress-extra.ts](conformance/lib-go-compress-extra.ts) | LZW compression (GIF/PDF/TIFF) |
| `go:compress/zlib` | ✅ | [lib-go-compress-extra.ts](conformance/lib-go-compress-extra.ts) | zlib read/write |
| `go:container/heap` | ✅ | [lib-go-container-heap.ts](conformance/lib-go-container-heap.ts) | A TS class implementing `heap.Interface` (see Go interfaces below) |
| `go:container/list` | ✅ | [lib-go-containers.ts](conformance/lib-go-containers.ts) | Doubly linked list |
| `go:container/ring` | ✅ | [lib-go-containers.ts](conformance/lib-go-containers.ts) | Circular list |
| `go:context` | ✅ | [lib-go-sync.ts](conformance/lib-go-sync.ts) | Cancellation and deadlines |
| `go:crypto` | ✅ | [lib-go-crypto-extra.ts](conformance/lib-go-crypto-extra.ts) | Crypto constants and algorithm selection |
| `go:crypto/aes` | ✅ | [lib-go-crypto-aes.ts](conformance/lib-go-crypto-aes.ts) | AES encryption |
| `go:crypto/cipher` | ✅ | [lib-go-crypto-aes.ts](conformance/lib-go-crypto-aes.ts) | Block cipher modes (GCM, CBC, CTR) |
| `go:crypto/des` | ✅ | [lib-go-crypto-extra.ts](conformance/lib-go-crypto-extra.ts) | DES / triple DES (deprecated) |
| `go:crypto/dsa` | ✅ | [lib-go-crypto-more.ts](conformance/lib-go-crypto-more.ts) | DSA signatures (deprecated) |
| `go:crypto/ecdh` | ✅ | [lib-go-crypto-keys.ts](conformance/lib-go-crypto-keys.ts) | ECDH key exchange |
| `go:crypto/ecdsa` | ✅ | [lib-go-crypto-keys.ts](conformance/lib-go-crypto-keys.ts) | ECDSA signatures |
| `go:crypto/ed25519` | ✅ | [lib-go-ed25519.ts](conformance/lib-go-ed25519.ts) | Ed25519 signatures |
| `go:crypto/elliptic` | ✅ | [lib-go-crypto-keys.ts](conformance/lib-go-crypto-keys.ts) | Elliptic curves (legacy; use ecdh/ecdsa) |
| `go:crypto/fips140` | ✅ | [lib-go-crypto-extra.ts](conformance/lib-go-crypto-extra.ts) | FIPS 140-3 mode controls |
| `go:crypto/hkdf` | ✅ | [lib-go-crypto-extra.ts](conformance/lib-go-crypto-extra.ts) | HKDF key derivation |
| `go:crypto/hmac` | ✅ | [lib-go-crypto-hash.ts](conformance/lib-go-crypto-hash.ts) | HMAC keyed hashing |
| `go:crypto/hpke` | ✅ | [lib-go-crypto-more.ts](conformance/lib-go-crypto-more.ts) | HPKE encryption (RFC 9180) |
| `go:crypto/md5` | ✅ | [lib-go-crypto-hash.ts](conformance/lib-go-crypto-hash.ts) | MD5 hash |
| `go:crypto/mlkem` | ✅ | [lib-go-crypto-keys.ts](conformance/lib-go-crypto-keys.ts) | ML-KEM post-quantum key encapsulation |
| `go:crypto/mlkem/mlkemtest` | ✅ | [lib-go-crypto-more.ts](conformance/lib-go-crypto-more.ts) | Deterministic ML-KEM encapsulation |
| `go:crypto/pbkdf2` | ✅ | [lib-go-crypto-extra.ts](conformance/lib-go-crypto-extra.ts) | PBKDF2 key derivation |
| `go:crypto/rand` | ✅ | [lib-go-crypto-aes.ts](conformance/lib-go-crypto-aes.ts) | Cryptographically secure random bytes |
| `go:crypto/rc4` | ✅ | [lib-go-crypto-extra.ts](conformance/lib-go-crypto-extra.ts) | RC4 stream cipher (deprecated) |
| `go:crypto/rsa` | ✅ | [lib-go-rsa.ts](conformance/lib-go-rsa.ts) | RSA signatures / encryption |
| `go:crypto/sha1` | ✅ | [lib-go-crypto-hash.ts](conformance/lib-go-crypto-hash.ts) | SHA-1 hash |
| `go:crypto/sha256` | ✅ | [lib-go-hash.ts](conformance/lib-go-hash.ts) | SHA-224 / SHA-256 hashes |
| `go:crypto/sha3` | ✅ | [lib-go-crypto-extra.ts](conformance/lib-go-crypto-extra.ts) | SHA-3 / SHAKE hashes |
| `go:crypto/sha512` | ✅ | [lib-go-crypto-hash.ts](conformance/lib-go-crypto-hash.ts) | SHA-384 / SHA-512 family hashes |
| `go:crypto/subtle` | ✅ | [lib-go-crypto-aes.ts](conformance/lib-go-crypto-aes.ts) | Constant-time comparison primitives |
| `go:crypto/tls` | ✅ | [lib-go-crypto-keys.ts](conformance/lib-go-crypto-keys.ts) | TLS client/server; loopback probe is a later phase |
| `go:crypto/x509` | ✅ | [lib-go-crypto-keys.ts](conformance/lib-go-crypto-keys.ts) | X.509 certificates and revocation |
| `go:crypto/x509/pkix` | ✅ | [lib-go-crypto-keys.ts](conformance/lib-go-crypto-keys.ts) | X.509 ASN.1/PKIX structures |
| `go:database/sql` | ✅ | [lib-go-sql.ts](conformance/lib-go-sql.ts) | No std driver: registry and errors probed |
| `go:database/sql/driver` | ✅ | [lib-go-sql.ts](conformance/lib-go-sql.ts) | Driver interfaces and value converters |
| `go:debug/buildinfo` | ✅ | [lib-go-runtime-extra.ts](conformance/lib-go-runtime-extra.ts) | Build info from executables |
| `go:debug/dwarf` | ⚠️ | — | DWARF debug info parsing |
| `go:debug/elf` | ⚠️ | — | ELF object files |
| `go:debug/gosym` | ⚠️ | — | Go symbol tables |
| `go:debug/macho` | ⚠️ | — | Mach-O object files |
| `go:debug/pe` | ⚠️ | — | PE (Windows) object files |
| `go:debug/plan9obj` | ⚠️ | — | Plan 9 object files |
| `go:encoding` | ✅ | [lib-go-encoding.ts](conformance/lib-go-encoding.ts) | Shared encoding interfaces |
| `go:encoding/ascii85` | ✅ | [lib-go-encoding-more.ts](conformance/lib-go-encoding-more.ts) | ascii85 encoding |
| `go:encoding/asn1` | ✅ | [lib-go-encoding-more.ts](conformance/lib-go-encoding-more.ts) | ASN.1 DER encoding |
| `go:encoding/base32` | ✅ | [lib-go-encoding-more.ts](conformance/lib-go-encoding-more.ts) | base32 encoding |
| `go:encoding/base64` | ✅ | [lib-go-encoding.ts](conformance/lib-go-encoding.ts) | base64 encoding |
| `go:encoding/binary` | ✅ | [lib-go-encoding-extra.ts](conformance/lib-go-encoding-extra.ts) | Binary packing / varints |
| `go:encoding/csv` | ✅ | [lib-go-csv.ts](conformance/lib-go-csv.ts) | CSV read/write |
| `go:encoding/gob` | ✅ | [lib-go-gob.ts](conformance/lib-go-gob.ts) | Go binary serialization |
| `go:encoding/hex` | ✅ | [lib-go-encoding.ts](conformance/lib-go-encoding.ts) | hex encoding |
| `go:encoding/json` | ✅ | [lib-go-encoding-more.ts](conformance/lib-go-encoding-more.ts) | JSON encode/decode |
| `go:encoding/pem` | ✅ | [lib-go-encoding-extra.ts](conformance/lib-go-encoding-extra.ts) | PEM encoding |
| `go:encoding/xml` | ✅ | [lib-go-encoding-extra.ts](conformance/lib-go-encoding-extra.ts) | XML read/write |
| `go:errors` | ✅ | [lib-go-errors.ts](conformance/lib-go-errors.ts) | Error creation / wrapping / inspection |
| `go:expvar` | ✅ | [lib-go-runtime.ts](conformance/lib-go-runtime.ts) | Public process variables |
| `go:flag` | ✅ | [lib-go-exec.ts](conformance/lib-go-exec.ts) | Command-line flag parsing |
| `go:fmt` | ✅ | [lib-go-fmt.ts](conformance/lib-go-fmt.ts) | Formatted I/O; integer verbs take TS numbers |
| `go:go/ast` | ✅ | [lib-go-gotools-extra.ts](conformance/lib-go-gotools-extra.ts) | Go syntax tree |
| `go:go/build` | ✅ | [lib-go-gotypes.ts](conformance/lib-go-gotypes.ts) | Go package build metadata |
| `go:go/build/constraint` | ✅ | [lib-go-gotools-extra.ts](conformance/lib-go-gotools-extra.ts) | Build-tag constraint parsing |
| `go:go/constant` | ✅ | [lib-go-gotools-extra.ts](conformance/lib-go-gotools-extra.ts) | Untyped constant values |
| `go:go/doc` | ✅ | [lib-go-gotypes.ts](conformance/lib-go-gotypes.ts) | Go doc extraction |
| `go:go/doc/comment` | ✅ | [lib-go-gotools-extra.ts](conformance/lib-go-gotools-extra.ts) | Doc comment parse/print |
| `go:go/format` | ✅ | [lib-go-gotools.ts](conformance/lib-go-gotools.ts) | Go source formatting |
| `go:go/importer` | ✅ | [lib-go-gotypes.ts](conformance/lib-go-gotypes.ts) | Export-data type importer |
| `go:go/parser` | ✅ | [lib-go-gotools-extra.ts](conformance/lib-go-gotools-extra.ts) | Go source parser |
| `go:go/printer` | ✅ | [lib-go-gotools-extra.ts](conformance/lib-go-gotools-extra.ts) | Go AST printer |
| `go:go/scanner` | ✅ | [lib-go-gotools-extra.ts](conformance/lib-go-gotools-extra.ts) | Go tokenizer |
| `go:go/token` | ✅ | [lib-go-gotools.ts](conformance/lib-go-gotools.ts) | Go tokens / positions |
| `go:go/types` | ✅ | [lib-go-gotypes.ts](conformance/lib-go-gotypes.ts) | Go type checker |
| `go:go/version` | ✅ | [lib-go-gotools.ts](conformance/lib-go-gotools.ts) | Go version comparison |
| `go:hash` | ✅ | [lib-go-hash.ts](conformance/lib-go-hash.ts) | Hash function interface |
| `go:hash/adler32` | ✅ | [lib-go-hash-extra.ts](conformance/lib-go-hash-extra.ts) | Adler-32 checksum |
| `go:hash/crc32` | ✅ | [lib-go-hash.ts](conformance/lib-go-hash.ts) | CRC-32 checksum |
| `go:hash/crc64` | ✅ | [lib-go-hash-extra.ts](conformance/lib-go-hash-extra.ts) | CRC-64 checksum |
| `go:hash/fnv` | ✅ | [lib-go-hash.ts](conformance/lib-go-hash.ts) | FNV-1 / FNV-1a hash |
| `go:hash/maphash` | ✅ | [lib-go-hash-extra.ts](conformance/lib-go-hash-extra.ts) | Seeded string hashing |
| `go:html` | ✅ | [lib-go-url.ts](conformance/lib-go-url.ts) | HTML escaping |
| `go:html/template` | ✅ | [lib-go-text-extra.ts](conformance/lib-go-text-extra.ts) | HTML templating (auto-escaped) |
| `go:image` | ✅ | [lib-go-image.ts](conformance/lib-go-image.ts) | 2D image interface |
| `go:image/color` | ✅ | [lib-go-image-extra.ts](conformance/lib-go-image-extra.ts) | Color types |
| `go:image/color/palette` | ✅ | [lib-go-image-extra.ts](conformance/lib-go-image-extra.ts) | Standard color palettes |
| `go:image/draw` | ✅ | [lib-go-image-extra.ts](conformance/lib-go-image-extra.ts) | Image compositing |
| `go:image/gif` | ✅ | [lib-go-image-extra.ts](conformance/lib-go-image-extra.ts) | GIF decode/encode |
| `go:image/jpeg` | ✅ | [lib-go-image-extra.ts](conformance/lib-go-image-extra.ts) | JPEG decode/encode |
| `go:image/png` | ✅ | [lib-go-image.ts](conformance/lib-go-image.ts) | PNG decode/encode |
| `go:index/suffixarray` | ✅ | [lib-go-text.ts](conformance/lib-go-text.ts) | Suffix-array substring search |
| `go:io` | ✅ | [lib-go-compress-gzip.ts](conformance/lib-go-compress-gzip.ts) | Core I/O interfaces (Reader/Writer) |
| `go:io/fs` | ✅ | [lib-go-path-fs.ts](conformance/lib-go-path-fs.ts) | Filesystem abstraction |
| `go:io/ioutil` | ✅ | [lib-go-path-fs.ts](conformance/lib-go-path-fs.ts) | Deprecated I/O helpers (Go 1.16) |
| `go:iter` | ✅ | [lib-go-collections.ts](conformance/lib-go-collections.ts) | Range-over-func iterators via `for…of`; `Pull` not bridged |
| `go:log` | ✅ | [lib-go-log.ts](conformance/lib-go-log.ts) | Logging to stderr |
| `go:log/slog` | ✅ | [lib-go-log.ts](conformance/lib-go-log.ts) | Structured logging |
| `go:log/syslog` | ⚠️ | — | Unix syslog; no portable probe |
| `go:maps` | ✅ | [lib-go-collections.ts](conformance/lib-go-collections.ts) | Generic map helpers |
| `go:math` | ✅ | [lib-go-math.ts](conformance/lib-go-math.ts) | Math functions |
| `go:math/big` | ✅ | [lib-go-big.ts](conformance/lib-go-big.ts) | Arbitrary-precision arithmetic |
| `go:math/bits` | ✅ | [lib-go-math-extra.ts](conformance/lib-go-math-extra.ts) | Bit operations |
| `go:math/cmplx` | ⚠️ | — | `complex128` has no TS mapping |
| `go:math/rand` | ✅ | [lib-go-math-extra.ts](conformance/lib-go-math-extra.ts) | Pseudo-random numbers |
| `go:math/rand/v2` | ✅ | [lib-go-math-extra.ts](conformance/lib-go-math-extra.ts) | Pseudo-random numbers (v2 API) |
| `go:mime` | ✅ | [lib-go-encoding-extra.ts](conformance/lib-go-encoding-extra.ts) | MIME media types |
| `go:mime/multipart` | ✅ | [lib-go-misc.ts](conformance/lib-go-misc.ts) | Multipart forms |
| `go:mime/quotedprintable` | ✅ | [lib-go-encoding-more.ts](conformance/lib-go-encoding-more.ts) | Quoted-printable encoding |
| `go:net` | ✅ | [lib-go-net.ts](conformance/lib-go-net.ts) | Sockets (loopback TCP), addresses |
| `go:net/http` | ✅ | [lib-go-http.ts](conformance/lib-go-http.ts) | HTTP client/server (loopback) |
| `go:net/http/cgi` | ✅ | [lib-go-http-extra.ts](conformance/lib-go-http-extra.ts) | CGI request parsing |
| `go:net/http/cookiejar` | ✅ | [lib-go-net.ts](conformance/lib-go-net.ts) | Cookie jars (loopback) |
| `go:net/http/fcgi` | ⚠️ | — | FastCGI handler; needs a FastCGI web server |
| `go:net/http/httptest` | ✅ | [lib-go-http.ts](conformance/lib-go-http.ts) | HTTP test servers (loopback) |
| `go:net/http/httptrace` | ✅ | [lib-go-net.ts](conformance/lib-go-net.ts) | HTTP tracing hooks |
| `go:net/http/httputil` | ✅ | [lib-go-net.ts](conformance/lib-go-net.ts) | HTTP utilities (loopback) |
| `go:net/http/pprof` | ✅ | [lib-go-http-extra.ts](conformance/lib-go-http-extra.ts) | pprof HTTP handlers |
| `go:net/mail` | ✅ | [lib-go-encoding-extra.ts](conformance/lib-go-encoding-extra.ts) | Mail address parsing |
| `go:net/netip` | ✅ | [lib-go-encoding-extra.ts](conformance/lib-go-encoding-extra.ts) | IP address types |
| `go:net/rpc` | ⚠️ | — | Needs Go method sets on registered receivers |
| `go:net/rpc/jsonrpc` | ⚠️ | — | Needs Go method sets on registered receivers |
| `go:net/smtp` | ⚠️ | — | SMTP client; needs a server |
| `go:net/textproto` | ✅ | [lib-go-net.ts](conformance/lib-go-net.ts) | Text protocol I/O |
| `go:net/url` | ✅ | [lib-go-url.ts](conformance/lib-go-url.ts) | URL parsing |
| `go:os` | ✅ | [lib-go-os.ts](conformance/lib-go-os.ts) | OS files and processes |
| `go:os/exec` | ✅ | [lib-go-exec.ts](conformance/lib-go-exec.ts) | External commands |
| `go:os/signal` | ✅ | [lib-go-misc.ts](conformance/lib-go-misc.ts) | Signal notification (`Notify` + `Stop`) |
| `go:os/user` | ✅ | [lib-go-runtime-extra.ts](conformance/lib-go-runtime-extra.ts) | User lookup |
| `go:path` | ✅ | [lib-go-path-fs.ts](conformance/lib-go-path-fs.ts) | Slash-separated paths |
| `go:path/filepath` | ✅ | [lib-go-os.ts](conformance/lib-go-os.ts) | File paths |
| `go:reflect` | ✅ | [lib-go-text-extra.ts](conformance/lib-go-text-extra.ts) | Runtime reflection |
| `go:regexp` | ✅ | [lib-go-regexp.ts](conformance/lib-go-regexp.ts) | Regular expressions |
| `go:regexp/syntax` | ✅ | [lib-go-text-extra.ts](conformance/lib-go-text-extra.ts) | Regexp parse trees |
| `go:runtime` | ✅ | [lib-go-runtime.ts](conformance/lib-go-runtime.ts) | Runtime introspection |
| `go:runtime/debug` | ✅ | [lib-go-runtime.ts](conformance/lib-go-runtime.ts) | Stack traces and GC stats |
| `go:runtime/metrics` | ✅ | [lib-go-runtime-extra.ts](conformance/lib-go-runtime-extra.ts) | Runtime metrics sampling |
| `go:runtime/pprof` | ✅ | [lib-go-runtime-extra.ts](conformance/lib-go-runtime-extra.ts) | Profiling data |
| `go:runtime/trace` | ✅ | [lib-go-runtime-extra.ts](conformance/lib-go-runtime-extra.ts) | Execution tracing |
| `go:slices` | ✅ | [lib-go-slices.ts](conformance/lib-go-slices.ts) | Generic slice helpers |
| `go:sort` | ✅ | [lib-go-sort.ts](conformance/lib-go-sort.ts) | Sorting |
| `go:strconv` | ✅ | [lib-go-strconv.ts](conformance/lib-go-strconv.ts) | String conversions |
| `go:strings` | ✅ | [lib-go-strings.ts](conformance/lib-go-strings.ts) | String utilities |
| `go:structs` | ✅ | [lib-go-lowlevel.ts](conformance/lib-go-lowlevel.ts) | `HostLayout` marker |
| `go:sync` | ✅ | [lib-go-sync.ts](conformance/lib-go-sync.ts) | Mutexes and wait groups |
| `go:sync/atomic` | ✅ | [lib-go-sync.ts](conformance/lib-go-sync.ts) | Atomic operations |
| `go:syscall` | ✅ | [lib-go-lowlevel.ts](conformance/lib-go-lowlevel.ts) | Portable subset probed; per-arch constants dropped |
| `go:testing` | ✅ | [lib-go-testing.ts](conformance/lib-go-testing.ts) | Helpers usable outside `go test` |
| `go:testing/cryptotest` | ⚠️ | — | Needs a `*testing.T` (no `go test` harness) |
| `go:testing/fstest` | ✅ | [lib-go-testing.ts](conformance/lib-go-testing.ts) | `TestFS` over any `fs.FS` |
| `go:testing/iotest` | ✅ | [lib-go-testing.ts](conformance/lib-go-testing.ts) | Reader/writer test wrappers |
| `go:testing/quick` | ✅ | [lib-go-testing.ts](conformance/lib-go-testing.ts) | Property checks with TS callbacks |
| `go:testing/slogtest` | ⚠️ | — | Needs a `*testing.T` (no `go test` harness) |
| `go:testing/synctest` | ⚠️ | — | Needs a `*testing.T` (no `go test` harness) |
| `go:text/scanner` | ✅ | [lib-go-text.ts](conformance/lib-go-text.ts) | Text scanner |
| `go:text/tabwriter` | ✅ | [lib-go-text.ts](conformance/lib-go-text.ts) | Aligned text columns |
| `go:text/template` | ✅ | [lib-go-template.ts](conformance/lib-go-template.ts) | Text templating |
| `go:text/template/parse` | ✅ | [lib-go-text-extra.ts](conformance/lib-go-text-extra.ts) | Template parse trees |
| `go:time` | ✅ | [lib-go-time.ts](conformance/lib-go-time.ts) | Time and durations |
| `go:time/tzdata` | ✅ | [lib-go-runtime-extra.ts](conformance/lib-go-runtime-extra.ts) | Embedded timezone database (side-effect import) |
| `go:unicode` | ✅ | [lib-go-unicode.ts](conformance/lib-go-unicode.ts) | Unicode tables |
| `go:unicode/utf16` | ✅ | [lib-go-encoding-more.ts](conformance/lib-go-encoding-more.ts) | UTF-16 encoding |
| `go:unicode/utf8` | ✅ | [lib-go-unicode.ts](conformance/lib-go-unicode.ts) | UTF-8 encoding |
| `go:unique` | ✅ | [lib-go-collections.ts](conformance/lib-go-collections.ts) | Canonical values |
| `go:weak` | ✅ | [lib-go-lowlevel.ts](conformance/lib-go-lowlevel.ts) | Weak pointers |
| `go:plugin` | ❌ | — | cgo, `-buildmode=plugin` |
| `go:unsafe` | ❌ | — | raw pointers |
| `go:runtime/race` | ❌ | — | needs `-race` |
| `go:runtime/coverage` | ❌ | — | needs `-cover` |
| `go:runtime/cgo` | ❌ | — | needs cgo |
| `go:embed` | ❌ | — | needs a `//go:embed` directive; a later phase |
<!-- go-bridges:end -->

#### Go bridge semantics

| Rule | Meaning |
| ---- | ------- |
| Number conversion | All Go ints/floats map to TS `number`; args convert via `T(x)`, results read back via `float64(x)`. `int64`/`uint64` beyond 2^53 lose precision. |
| Throw on error | `(T, error)` results throw a `GoError` on failure; `error`-only calls throw as statements and yield the error value in value position ([lib-go-bridge-smoke.ts](conformance/lib-go-bridge-smoke.ts)). |
| Tuples | Multi-value results pack into a slice (TS tuple); `const [a, b] = f()` types each element (ints read as numbers). |
| Structs | `new pkg.T({...})` builds a composite literal (pointer when any method needs it); fields read/write directly, converting numbers both ways (`h.Size += 1`). Embedded structs promote their fields. |
| Named numerics | Typed constants (`time.Second`, `reflect.String`) stay typed in Go; arithmetic and `===` coerce the `number` side (`time.Second * 2`). Results read as numbers: `token.Token(n)` restores the methods. |
| Callbacks | Func-typed params and struct fields become Go closures with the exact Go signature (int params read as numbers, returns convert to the result type); sync callbacks (sort, slices, strings, ...) run inline. |
| Generics | Type args are inferred from the arguments, including through constraints (`maps.Keys(m)` with `Map ~map[K]V`); unresolved ones become `any`. |
| printf verbs | With a literal format, numbers passed to `%d %x %o %b %c %U` convert to `int64`; scan into number refs with `%v`. |
| nil | `null` passes as `nil`; `x === null` on nil-able Go values (slices, maps, interfaces, pointers) is a real nil check. |
| Channels | `chan<T>(size?)` / `GoChan<T>` with `send`, `recv`, `close`; `for…of` ranges channels, `iter.Seq` and `iter.Seq2` (`for (const [k, v] of seq2)`) ([lib-go-builtin.ts](conformance/lib-go-builtin.ts)). |
| Out-params | `ref<T>(init?)` makes a pointer cell; `.value` dereferences it ([lib-go-builtin.ts](conformance/lib-go-builtin.ts)). |
| Byte slices | `[]byte` is `Uint8Array` (zero-copy); `number[]` converts per call (mutations of the copy are lost). |
| Side-effect imports | `import 'go:time/tzdata'` emits a blank `import _`. |
| Go interfaces | A TS class instance passed where Go expects an interface (`heap.Interface`, `sort.Interface`) is wrapped in a generated adapter with the exact Go method signatures (`Len() int` calls the class's `Len(): number`); the class needs every method, inherited ones count. Values typed as the interface itself are not adapted. |

### npm packages

| Pattern                   | Status | Probe                                                    | Notes                                                                                             |
| ------------------------- | :----: | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `import { x } from 'pkg'` |   ✅    | [syntax-import-npm.ts](conformance/syntax-import-npm.ts) | Mapped to Go module imports (fixture dep in [conformance/package.json](conformance/package.json)) |
| Packages published as plain JavaScript / CommonJS (tried: `ms`, `escape-html`, `tiny-invariant`) | ❌ | — | Without TypeScript sources there are no types to compile from: untyped packages stop at the type check (TS7016), and typed ones whose code is CommonJS (`module.exports`, union-typed callbacks) don't lower. Packages that ship `.ts` sources work |

## Roadmap: known limitations

### Structural limitations (🚫)

These follow from compiling to a native Go binary, and won't change:

- **No JavaScript engine at runtime**, so code can't be compiled while the program runs: `eval`,
  `new Function`, `node:vm`, `node:repl`, Worker `eval: true`. Nothing can inspect an engine
  either: `node:inspector`, `node:v8` heap snapshots and flags, `node:trace_events`, and
  `node:module` loader hooks.
- **Classes are static Go structs** with fixed fields and method sets: no prototype mutation
  (`C.prototype.m = …`, `Object.setPrototypeOf`, `util.inherits`), no `Proxy` over typed values,
  no sparse-array holes.
- **`undefined` and `null` are both Go `nil`**, so APIs that tell them apart can't (`node:sqlite`
  binding `undefined`).
- **One process per isolate**: workers, `fork` and cluster workers are separate processes, so
  `SharedArrayBuffer` / `Atomics` can't share memory.
- **No cgo**: `go:plugin`, `go:runtime/cgo`, `go:runtime/race`, `go:unsafe`, and SQLite native
  extensions (SQLite runs as Wasm translated to Go).
- **Deprecated upstream**: `node:domain`, HTTP/2 server push, `util.inherits`.

### Mechanisms that unlock several ❌ rows

- **Per-OS helpers.** Each binary is built for one OS (`--target`), and the transpiler already
  picks `@windows` / `@other` variants of a runtime helper (`os.totalmem`, terminal size and raw
  mode, `child_process` `detached`, dgram socket options, errno numbers). With Go's `syscall`
  package, this also covers tty `ReadStream` / `WriteStream`.
- **Source positions.** The generated Go carries `//line` directives, so `runtime.Callers`
  reports `.ts` files and lines: `err.stack`, `util.getCallSites`, node:test `location`.
- **Second entry points.** Compiling another `.ts` file into the same binary, and selecting it
  with an environment variable as workers already do (`TN_WORKER_ADDR`), would cover
  `new Worker('./w.ts')`, `fork('./child.ts')` and node:test `run({ files })`.
- **Go 1.24+ runtime features.** `weak` and `runtime.AddCleanup` would cover `WeakRef`,
  `FinalizationRegistry`, and freeing SQLite statements when they are garbage-collected.
- **Copying from GOROOT's vendor tree**, the way `String.prototype.normalize` copies `x/text`.
  `golang.org/x/net/dns/dnsmessage` would cover the remaining `node:dns` record types and TTLs.

### Planned order

1. **Correctness.** Done: class method return inference, constructor initialization order,
   `instanceof` on built-ins and subclasses, static and accessor inheritance, private accessors
   and `static #x`, labeled blocks, exhaustive `switch`, enum reverse mapping, bigint bitwise
   operators, Date arithmetic, async methods, object-literal setters, declaration merging, and
   computed keys in `Object.hasOwn` / `defineProperty`. Remaining:
   - `any[]` arrays don't share `push` through parameters
   - polymorphic `this` chains and `inst[key]` (also in step 3)
2. **Everyday built-ins.** Done: `Date` (parsing, multi-field constructors, setters, Node's
   formats), `JSON.stringify` options and the `JSON.parse` reviver, `err.stack`,
   `AggregateError`, `bind` / `fn.name` / `fn.length`, `Promise.withResolvers` / `try`,
   `Object.is` / `groupBy`, `Array.of`, and the `Number` / `Math` / `String` / `BigInt` /
   `Symbol` additions. Remaining:
   - key order of `JSON.parse` objects
   - `Array.fromAsync`
   - `Uint8Array` base64 / hex, `BigInt64Array`
   - `localeCompare` with locales (needs `Intl`)
3. **Language depth.** Done: polymorphic `this`, `inst[key]` on class instances,
   `WeakRef` / `FinalizationRegistry`, iterator helpers and generator `next()`. Remaining:
   - mixins
   - field and accessor decorators
   - generator `next(value)` / `return()` / `throw()`
4. **Node gaps.** Done: `process.stdout.columns` / `rows`, `setRawMode`, `umask`,
   `readline.emitKeypressEvents`, `child_process` `detached`, dgram multicast and socket
   options, errno numbers per OS. Remaining:
   - second entry points
   - `node:dns` records
   - `async_hooks.createHook`
   - SQLite finalization and `serialize`
   - node:test snapshots, flags and reporters
   - `node:module` / `node:sea` / `node:v8` basics
   - the smaller `node:crypto` items
   - stream backpressure and BYOB readers
   - http trailers
   - TLS PFX and root certificates
   - probes for the ⚠️ Go bridges
5. **New surfaces:**
   - `Intl`
   - `Temporal`
   - `WebSocket` and the other web globals
   - `go:embed`
   - `WebAssembly` / `node:wasi` (on vendored wazero)
   - zstd
   - CommonJS npm packages

Every item needs:
- a declaration in [types/](types/) (without one, user code fails the type check);
- a `conformance/` probe;
- its row in this file flipped to ✅.
