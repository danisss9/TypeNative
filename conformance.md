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
| Object shorthand                        |   ✅    | [syntax-destructuring.ts](conformance/syntax-destructuring.ts)                   | Parenthesized initializers; elision and element/property reads           |
| Object spread                           |   ✅    | [syntax-object-spread.ts](conformance/syntax-object-spread.ts)                   | Spread sources copied field-by-field into the new struct                 |
| Array spread                            |   ✅    | [syntax-array-spread.ts](conformance/syntax-array-spread.ts)                     | `[...arr]`, `fn(...args)`                                                |
| `delete` operator                       |   ✅    | [syntax-delete.ts](conformance/syntax-delete.ts)                                 | `delete o.key` on records                                                |
| Computed keys                           |   ✅    | [syntax-computed-keys.ts](conformance/syntax-computed-keys.ts)                   | Computed keys become map entries; `o.name` reads lower to `.Get("name")` |
| Records / dictionaries                  |   ✅    | [syntax-in-operator.ts](conformance/syntax-in-operator.ts)                       | `Record<K, V>` and objects indexed by key → Go maps; so are literals with keys that aren't identifiers (`{ 'Content-Type': … }`, [lib-node-http-server.ts](conformance/lib-node-http-server.ts)) |
| Tuples                                  |   ✅    | [syntax-tuples.ts](conformance/syntax-tuples.ts)                                 | `[string, number]` fixed-length arrays                                   |
| Top-level / module-scope variables      |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)               | Functions see main-file top-level variables                              |
| Numeric separators                      |   ✅    | [syntax-numeric-separators.ts](conformance/syntax-numeric-separators.ts)         | `1_000_000`                                                              |
| Hex / octal / binary literals           |   ✅    | [syntax-numeric-literals.ts](conformance/syntax-numeric-literals.ts)             | `0xFF`, `0o17`, `0b1010`, `1e3`                                          |
| `var` declarations (hoisting)           |   ✅    | [syntax-var.ts](conformance/syntax-var.ts)                                       | Function- and module-level `var`                                         |
| `using` / `await using` declarations    |   ✅    | [syntax-using.ts](conformance/syntax-using.ts)                                   | Disposed in reverse order when the block ends (`defer`); `[Symbol.dispose]` methods |

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
| Optional call (`fn?.()`)     |   ✅    | [syntax-optional-call.ts](conformance/syntax-optional-call.ts)               | Nil check on the function value; result is nullable                          |
| Comma operator               |   ✅    | [syntax-comma-operator.ts](conformance/syntax-comma-operator.ts)             | In `for` headers (`i = 0, j = 10` / `i++, j--`)                              |
| `void` operator              |   ✅    | [syntax-void-operator.ts](conformance/syntax-void-operator.ts)               | Evaluates, then `nil`                                                        |
| `new.target`                 |   ✅    | [syntax-new-target.ts](conformance/syntax-new-target.ts)                     | Constructors pass the target class name through `super()` chains             |

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
| Recursive arrow functions                     |   ✅    | [syntax-recursive-arrow.ts](conformance/syntax-recursive-arrow.ts)           | `const f = () => … f() …` → declared, then assigned                                 |
| Generators (`function*` / `yield` / `yield*`) |   ✅    | [syntax-generators.ts](conformance/syntax-generators.ts)                     | `function*` runs in a goroutine sending yields over a channel; `for...of` ranges it |
| Async generators (`async function*`)          |   ✅    | [syntax-async-generators.ts](conformance/syntax-async-generators.ts)         | Goroutine + channel, consumed with `for await`                                      |
| Custom iterators (`Symbol.iterator`)          |   ✅    | [syntax-custom-iterators.ts](conformance/syntax-custom-iterators.ts)         | `*[Symbol.iterator]()` → a `Symbol_iterator()` channel method                       |
| `as const` assertions                         |   ✅    | [syntax-as-const.ts](conformance/syntax-as-const.ts)                         | Erased during transpilation                                                         |
| Function overloads                            |   ✅    | [syntax-function-overloads.ts](conformance/syntax-function-overloads.ts)     | Signatures are erased; the implementation is emitted                                |
| `this` parameter (`function f(this: T)`)      |   ✅    | [syntax-this-parameter.ts](conformance/syntax-this-parameter.ts)             | Erased                                                                              |
| `arguments` object                            |   ✅    | [syntax-arguments.ts](conformance/syntax-arguments.ts)                       | Functions reading it take extra arguments variadically (`[]interface{}`)            |

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
| Access modifiers (`private` / `protected` / `public` on members) |   ✅    | [syntax-access-modifiers.ts](conformance/syntax-access-modifiers.ts)                     | `private` / `protected` / `public` are erased                                           |
| Abstract classes                                                 |   ✅    | [syntax-class-abstract.ts](conformance/syntax-class-abstract.ts)                         | Abstract members skipped; concrete methods copied onto subclasses                       |
| Static initialization blocks (`static {}`)                       |   ✅    | [syntax-static-blocks.ts](conformance/syntax-static-blocks.ts)                           | Go `func init()`                                                                        |
| Class expressions (`const C = class {}`)                         |   ✅    | [syntax-class-expressions.ts](conformance/syntax-class-expressions.ts)                   | `const C = class {…}` becomes a class named after the variable                          |
| Interfaces                                                       |   ✅    | [syntax-class-implements.ts](conformance/syntax-class-implements.ts)                     | Transpiled to Go interfaces                                                             |
| Optional properties                                              |   ✅    | [syntax-optional-chaining.ts](conformance/syntax-optional-chaining.ts)                   | `prop?: Type` in interfaces/types                                                       |
| Type-aware method dispatch                                       |   ✅    | [semantics-method-dispatch.ts](conformance/semantics-method-dispatch.ts)                 | Class `.push()` / `.length` not confused with array builtins                            |
| Index signatures (`[key: string]: T`)                            |   ✅    | [syntax-index-signatures.ts](conformance/syntax-index-signatures.ts)                     | `{ [k: K]: V }` is `Record<K, V>` (an ordered Go map)                                   |

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

## Type-system features

| Feature                                                   | Status | Probe                                                                | Notes                                                                           |
| --------------------------------------------------------- | :----: | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Type aliases                                              |   ✅    | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts)         | `type P = { x: number }` → Go struct; alias-of-alias                            |
| Union types                                               |   ✅    | [syntax-union-types.ts](conformance/syntax-union-types.ts)           | Narrowed via `typeof` checks                                                    |
| Type guards (`is`)                                        |   ✅    | [syntax-type-guards.ts](conformance/syntax-type-guards.ts)           | `p is T` → Go `bool`; `in` checks struct fields at runtime                      |
| `as` assertions                                           |   ✅    | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts)         | `x as T`, incl. angle-bracket syntax                                            |
| Self-host contextual typing                               |   ✅    | [syntax-selfhost-context.ts](conformance/syntax-selfhost-context.ts) | Object/array literals typed from context, `Record` literals, `in`, `any` params |
| Decorators (`@`)                                          |   ✅    | [syntax-decorators.ts](conformance/syntax-decorators.ts)             | Standard method & class decorators, applied in source order; `this` is the receiver |
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
| Functions stored in Records               |   ✅    | [semantics-record-functions.ts](conformance/semantics-record-functions.ts)         | `rec.fn()` → `rec.Get("fn")()`, also for names like `get` / `sort`                                          |

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
| `console.table`                    |   ❌    | —                                                      | Not implemented                                        |

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

### `JSON`

| API              | Status | Probe                                                      | Notes                                                   |
| ---------------- | :----: | ---------------------------------------------------------- | -------------------------------------                   |
| `JSON.parse`     |   ✅    | [lib-json-parse.ts](conformance/lib-json-parse.ts)         | Mapped to `encoding/json` `Unmarshal`; assigned to an interface type, the result converts into its struct |
| `JSON.stringify` |   ✅    | [lib-json-stringify.ts](conformance/lib-json-stringify.ts) | Reflection serializer includes unexported struct fields |

### `Object`

| API                                                        | Status | Probe                                                      | Notes                                                               |
| ---------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `Object.keys` / `values` / `entries`                       |   ✅    | [lib-object-helpers.ts](conformance/lib-object-helpers.ts) | Map key/value iteration helpers; typed results for maps and records |
| `Object.assign`                                            |   ✅    | [lib-object-assign.ts](conformance/lib-object-assign.ts)   | Sources (structs, maps, dynamic objects) copied into an ordered map |
| `Object.freeze` / `seal` / `isFrozen`                      |   ✅    | [lib-object-freeze.ts](conformance/lib-object-freeze.ts)   | Integrity level tracked by identity; writes rejected by `Readonly<T>` types |
| `Object.fromEntries`                                       |   ✅    | [lib-object-from-entries.ts](conformance/lib-object-from-entries.ts) | `TnFromEntries` → dynamic object                                    |
| `Object.hasOwn` / `defineProperty` / `getOwnPropertyNames` |   ✅    | [lib-object-own.ts](conformance/lib-object-own.ts)         | Maps, dynamic objects and typed objects (literal keys); `{ value }` descriptors |

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
| `localeCompare`                                           |   ✅    | [lib-string-compare.ts](conformance/lib-string-compare.ts)             | `strings.Compare` → -1/0/1                                             |
| `match` / `matchAll` / `search`                           |   ✅    | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts)     | Via `regexp` package (`String.match` with groups)                      |
| `at` (negative indices)                                   |   ✅    | [lib-array-at.ts](conformance/lib-array-at.ts)                         | Supports negative indices                                              |
| Unicode length / iteration                                |   ✅    | [lib-string-unicode.ts](conformance/lib-string-unicode.ts)             | `.length` counts runes; `[...str]` spreads runes                       |
| `String.raw`                                              |   ✅    | [lib-string-raw.ts](conformance/lib-string-raw.ts)                     | Raw template text with values interpolated                             |
| `normalize`                                               |   ✅    | [lib-string-normalize.ts](conformance/lib-string-normalize.ts)         | `golang.org/x/text/unicode/norm`, copied from GOROOT's vendor tree (offline) |

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
| `Number.EPSILON` / `isFinite` / `toPrecision`     |   ✅    | [lib-number-misc.ts](conformance/lib-number-misc.ts)     | `toPrecision` → `strconv.FormatFloat(x, 'g', n, 64)`     |
| `String()` / `Boolean()` conversions              |   ✅    | [lib-conversions.ts](conformance/lib-conversions.ts)     | JS formatting / truthiness                               |

### `Date`

| API                                              | Status | Probe                                          | Notes                                                                            |
| ------------------------------------------------ | :----: | ---------------------------------------------- | -----------------------------                                                    |
| `new Date()` / `getTime` / `toISOString`         |   ✅    | [lib-date.ts](conformance/lib-date.ts)         | `new Date(ms)` → `time.UnixMilli`; `getTime`/`toISOString` mapped to `time.Time` |
| `Date.now()`                                     |   ✅    | [lib-date-now.ts](conformance/lib-date-now.ts) | `time.Now().UnixMilli()`                                                         |
| Component getters (`getFullYear`, `getMonth`, …) |   ✅    | [lib-date-getters.ts](conformance/lib-date-getters.ts) | Local and `getUTC*` getters, `Date.UTC`                                          |

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

### `Promise` / timers

| API                                                  | Status | Probe                                                        | Notes                                                               |
| ---------------------------------------------------- | :----: | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `Promise` constructor / `.then`                      |   ✅    | [syntax-promise-then.ts](conformance/syntax-promise-then.ts) | Channel lowering works (see [Async & timing](#async--timing))       |
| `resolve` / `reject` passed as values                |   ✅    | [lib-node-async-hooks.ts](conformance/lib-node-async-hooks.ts) | `new Promise((resolve) => setTimeout(resolve, ms))`                 |
| `Promise.all`                                        |   ✅    | [syntax-promise-all.ts](conformance/syntax-promise-all.ts)   | Channel lowering works (see [Async & timing](#async--timing))       |
| `Promise.resolve`                                    |   ✅    | [lib-promise-resolve.ts](conformance/lib-promise-resolve.ts) | Buffered channel holding the value                                  |
| `Promise.reject` / `.catch` / `.finally`             |   ✅    | [lib-promise-catch.ts](conformance/lib-promise-catch.ts)     | Rejected promises are closed channels with a reason; `await` rethrows |
| `Promise.race` / `allSettled` / `any`                |   ✅    | [lib-promise-combinators.ts](conformance/lib-promise-combinators.ts) | Goroutine per promise; first settled / all settled / first fulfilled |
| `clearTimeout`                                       |   ✅    | [lib-timers.ts](conformance/lib-timers.ts)                   | `TnClearTimeout` stops the timer                                    |
| `setInterval` / `clearInterval`                      |   ✅    | [lib-set-interval.ts](conformance/lib-set-interval.ts)       | `time.Ticker`; the process lives until cleared                      |
| `queueMicrotask`                                     |   ✅    | [lib-queue-microtask.ts](conformance/lib-queue-microtask.ts) | Runs after the current synchronous code (end of main or a timer callback) |
| `setTimeout`                                         |   ✅    | [lib-set-timeout.ts](conformance/lib-set-timeout.ts)         | Lowered to `time.AfterFunc` (see [Async & timing](#async--timing))  |

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
| `MessageChannel` / `MessagePort` / `BroadcastChannel` | ✅ | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | See [worker_threads](#nodeworker_threads) |
| `__filename` / `__dirname`                  |   ✅    | —                                                                  | The running executable (a native binary has no script file) |
| `globalThis`                                |   ✅    | [lib-global-this.ts](conformance/lib-global-this.ts)               | `globalThis.x` is the global `x`; `(globalThis as any)` is a dynamic object |

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
| `node:buffer` (+ globals `Buffer`, `Uint8Array`, `atob`, `btoa`) | ✅ | [buffer](#nodebuffer)                                 |
| `node:child_process`                        |   ✅    | [child_process](#nodechild_process)                         |
| `node:console`                              |   ✅    | [console](#nodeconsole)                                     |
| `node:constants`                            |   ✅    | [constants](#nodeconstants--nodesys)                        |
| `node:crypto` (+ global `crypto`)           |   ✅    | [crypto](#nodecrypto)                                       |
| `node:dgram`                                |   ✅    | [dgram](#nodedgram)                                         |
| `node:diagnostics_channel`                  |   ✅    | [diagnostics_channel](#nodediagnostics_channel)             |
| `node:dns` / `node:dns/promises`            |   ✅    | [dns](#nodedns)                                             |
| `node:events` (+ `EventTarget`, `AbortController`) | ✅ | [events](#nodeevents)                                      |
| `node:fs` / `node:fs/promises`              |   ✅    | [fs](#nodefs)                                               |
| `node:http` / `node:https`                  |   ✅    | [http / https](#nodehttp--nodehttps)                        |
| `node:net`                                  |   ✅    | [net](#nodenet)                                             |
| `node:os`                                   |   ✅    | [os](#nodeos)                                               |
| `node:path` / `path/posix` / `path/win32`   |   ✅    | [path](#nodepath)                                           |
| `node:perf_hooks` (+ global `performance`)  |   ✅    | [perf_hooks](#nodeperf_hooks)                               |
| `node:process` (+ global `process`)         |   ✅    | [process](#nodeprocess)                                     |
| `node:punycode`                             |   ✅    | [punycode](#nodepunycode)                                   |
| `node:querystring`                          |   ✅    | [querystring](#nodequerystring)                             |
| `node:readline` / `node:readline/promises`  |   ✅    | [readline](#nodereadline)                                   |
| `node:stream` / `stream/promises` / `stream/consumers` | ✅ | [stream](#nodestream)                                     |
| `node:string_decoder`                       |   ✅    | [string_decoder](#nodestring_decoder)                       |
| `node:sys`                                  |   ✅    | [constants / sys](#nodeconstants--nodesys)                  |
| `node:test`                                 |   ✅    | [test](#nodetest)                                           |
| `node:timers` / `node:timers/promises`      |   ✅    | [timers](#nodetimers)                                       |
| `node:tls`                                  |   ✅    | [tls](#nodetls)                                             |
| `node:tty`                                  |   ✅    | [tty](#nodetty)                                             |
| `node:url` (+ globals `URL`, `URLSearchParams`) | ✅  | [url](#nodeurl)                                             |
| `node:util` / `node:util/types`             |   ✅    | [util](#nodeutil)                                           |
| `node:worker_threads` (+ globals `MessageChannel`, `MessagePort`, `BroadcastChannel`) | ✅ | [worker_threads](#nodeworker_threads) |
| `node:zlib`                                 |   ✅    | [zlib](#nodezlib)                                           |
| Global `fetch` (+ `Headers`, `Request`, `Response`) | ✅ | [fetch](#fetch)                                            |

#### `node:path`

| API                                                                 | Status | Probe                                                                    | Notes                                                                 |
| ------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `join` / `dirname` / `basename` / `extname` / `resolve`             |   ✅    | [lib-node-path.ts](conformance/lib-node-path.ts)                         | Ports of Node's algorithms (not Go's `filepath`): same results as Node |
| `normalize` / `relative` / `isAbsolute` / `parse` / `format` / `sep` / `delimiter` | ✅ | [lib-node-path-more.ts](conformance/lib-node-path-more.ts) | Trailing separators, `.bashrc`-style extensions, `''` for same paths   |
| `path.posix` / `path.win32` / `node:path/posix` / `toNamespacedPath` |   ✅    | [lib-node-path-posix-win32.ts](conformance/lib-node-path-posix-win32.ts) | Both flavours on every OS (drive letters, UNC roots); `path` is the platform's |
| `matchesGlob`                                                       |   ❌    | —                                                                        | Not implemented                                                       |

#### `node:buffer`

| API                                                                                     | Status | Probe                                                                          | Notes                                                                                  |
| --------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `Buffer.from` / `alloc` / `concat` / `byteLength` / `isBuffer` / `compare`; `buf[i]`, `length` | ✅ | [lib-node-buffer.ts](conformance/lib-node-buffer.ts)                          | Buffers are Go `[]byte`; `subarray` / `slice` share memory; writes wrap modulo 256      |
| `toString` / `equals` / `indexOf` / `includes` / `fill` / `write` / `copy`              |   ✅    | [lib-node-buffer.ts](conformance/lib-node-buffer.ts)                           | `` `${buf}` `` decodes UTF-8; `console.log(buf)` prints `<Buffer 68 69>`                |
| Encodings (utf8, hex, base64, base64url, latin1, ascii, utf16le); `atob` / `btoa`        |   ✅    | [lib-node-buffer-encodings.ts](conformance/lib-node-buffer-encodings.ts)       | Invalid UTF-8 bytes decode to U+FFFD, as in Node                                        |
| `TextEncoder` / `TextDecoder`, minimal `Uint8Array`                                     |   ✅    | [lib-node-buffer-encodings.ts](conformance/lib-node-buffer-encodings.ts)       | `Uint8Array` is `[]byte` too: `length`, indexing, `subarray`, `slice`, `set`            |
| `read*` / `write*` (U)Int8/16/32 LE/BE, Float, Double                                    |   ✅    | [lib-node-buffer-binary.ts](conformance/lib-node-buffer-binary.ts)             | Out-of-range offsets throw `ERR_OUT_OF_RANGE`                                           |
| BigInt64 reads / writes, `swap16/32/64`, other typed arrays                             |   ❌    | —                                                                              | Not implemented                                                                        |

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
| `watch` / `watchFile`                                                                   |   ❌    | —                                                                      | Go's standard library has no file-system notifications                                    |

#### `node:os`

| API                                                                                          | Status | Probe                                        | Notes                                                                   |
| -------------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | ----------------------------------------------------------------------- |
| `platform` / `arch` / `type` / `machine` / `EOL` / `devNull` / `endianness`                  |   ✅    | [lib-node-os.ts](conformance/lib-node-os.ts) | Node's names (`win32`, `x64`, `Windows_NT`, `x86_64`)                    |
| `hostname` / `homedir` / `tmpdir` / `userInfo` / `cpus` / `availableParallelism` / `networkInterfaces` / `constants.signals` | ✅ | [lib-node-os.ts](conformance/lib-node-os.ts) | `cpus()` has one entry per logical CPU (model / speed / times are zero) |
| `totalmem` / `freemem` / `uptime` / `loadavg` / `release` / `version`                         |   ❌    | —                                            | Not portable in Go's standard library                                   |

#### `node:process`

| API                                                                                                  | Status | Probe                                                          | Notes                                                                       |
| ---------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `argv` / `argv0` / `execPath` / `execArgv` / `pid` / `ppid` / `arch` / `version` / `versions`         |   ✅    | [lib-node-process.ts](conformance/lib-node-process.ts)         | `argv` has Node's shape: `[execPath, script, ...args]`; `version` is `v24.0.0`; `versions.go` is Go's |
| `hrtime` / `hrtime.bigint` / `uptime` / `memoryUsage` / `chdir` / `cwd` / `stdout.write` / `nextTick` / `exitCode` | ✅ | [lib-node-process.ts](conformance/lib-node-process.ts) | `exitCode` is applied when the event loop drains                            |
| `process.env` reads, writes, `delete`, `in`, `Object.keys(process.env)`; `import { env } from 'node:process'` | ✅ | [lib-node-process-env.ts](conformance/lib-node-process-env.ts) | `os.Setenv` / `os.Unsetenv`; missing variables read as `""`                  |
| `process.on('exit' \| 'SIGINT' \| 'SIGTERM' \| 'SIGHUP')` / `once` / `off` / `emit`                   |   ✅    | [lib-node-process-events.ts](conformance/lib-node-process-events.ts) | `'exit'` runs after the event loop with the exit code; signals arrive on the loop |
| `process.stdin` / `stdout` / `stderr` as streams                                                     |   ✅    | [lib-node-child-process-async.ts](conformance/lib-node-child-process-async.ts) | `stdin` keeps the process alive only while flowing                           |
| `kill` / `emitWarning` / `getuid` / `getgid`                                                         |   ✅    | —                                                              | Implemented, not probed                                                     |
| `on('uncaughtException')` / `on('beforeExit')` / `cpuUsage` / `umask` / `stdout.columns`              |   ❌    | —                                                              | Not implemented                                                             |

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
| `parseArgs` / `inherits` / `inspect.custom` / `getSystemErrorName`                     |   ❌    | —                                                                | Not implemented                                                                           |

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
| Legacy `url.parse` / `url.resolve`                                                           |   ❌    | —                                                                      | Deprecated upstream; not implemented                                                       |

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
| `scrypt` / async `pbkdf2` / `randomBytes(n, cb)` / keys / `sign` / `verify` / `webcrypto.subtle` | ❌ | — | Not implemented (`scrypt` has no Go standard-library implementation)       |

#### `node:zlib`

| API                                                                                                  | Status | Probe                                                      | Notes                                                    |
| ---------------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------- | -------------------------------------------------------- |
| `gzipSync` / `gunzipSync` / `deflateSync` / `inflateSync` / `deflateRawSync` / `inflateRawSync` / `unzipSync` / `crc32` / `constants` | ✅ | [lib-node-zlib.ts](conformance/lib-node-zlib.ts) | `{ level }`; invalid input throws `Z_DATA_ERROR` |
| `createGzip` / `createGunzip` / `createDeflate` / `createInflate` / `createDeflateRaw` / `createInflateRaw` / `createUnzip` | ✅ | [lib-node-zlib-streams.ts](conformance/lib-node-zlib-streams.ts) | Transforms that (de)compress when the input ends |
| Brotli (`brotliCompressSync` & co.) and callback forms                                                |   ❌    | —                                                          | Go's standard library has no Brotli codec                 |

#### `node:timers`

| API                                                                              | Status | Probe                                                              | Notes                                                                      |
| -------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `setTimeout` / `setInterval` / `setImmediate` (+ extra arguments) / `clear*`; global `setImmediate` | ✅ | [lib-node-timers.ts](conformance/lib-node-timers.ts) | Callbacks run on the event loop                                             |
| `node:timers/promises` (`setTimeout`, `setImmediate`, `setInterval`, `scheduler`) |   ✅    | [lib-node-timers-promises.ts](conformance/lib-node-timers-promises.ts) | `{ signal }` aborts; `setInterval` is an async iterator                      |
| `Timeout#ref` / `unref` / `refresh`                                              |   ❌    | —                                                                  | Timers are Go timers without those methods                                 |

#### `node:perf_hooks`

| API                                                                                    | Status | Probe                                                      | Notes                                       |
| -------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------- |
| `performance.now` / `timeOrigin` / `mark` / `measure` / `getEntries*` / `clearMarks`; global `performance` | ✅ | [lib-node-perf-hooks.ts](conformance/lib-node-perf-hooks.ts) | Monotonic milliseconds since process start |
| `PerformanceObserver` / `monitorEventLoopDelay` / `timerify`                            |   ❌    | —                                                          | Not implemented                             |

#### `node:tty`

| API          | Status | Probe                                                      | Notes                                    |
| ------------ | :----: | ---------------------------------------------------------- | ---------------------------------------- |
| `isatty(fd)` |   ✅    | [lib-node-perf-hooks.ts](conformance/lib-node-perf-hooks.ts) | Character-device check on fds 0–2        |
| `ReadStream` / `WriteStream` (`columns`, `setRawMode`) | ❌ | — | Terminal sizes need non-portable syscalls |

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
| `captureRejections` / `errorMonitor` / symbol event names                                            |   ❌    | —                                                              | Not implemented                                                            |

#### `node:stream`

| API                                                                                                   | Status | Probe                                                                | Notes                                                                                        |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Readable` (`push`, `read`, `pause` / `resume`, `setEncoding`, `destroy`), `Readable.from`, `for await` | ✅    | [lib-node-stream-readable.ts](conformance/lib-node-stream-readable.ts) | Arrays, strings, Buffers and async generators as sources                                      |
| `Writable` (`write` / `end` / callbacks, `final`, `'finish'`, write after end)                         |   ✅    | [lib-node-stream-writable.ts](conformance/lib-node-stream-writable.ts) | Strings become Buffers unless `decodeStrings: false` or `objectMode`                          |
| `Transform` / `PassThrough` / `Duplex`, `pipe` chains, subclasses overriding `_transform` & co.        |   ✅    | [lib-node-stream-transform.ts](conformance/lib-node-stream-transform.ts) | Option methods (`transform`, `flush`, `write`, `final`, `read`) and `_`-overrides both work; `this` inside option methods is not the stream (use the callback) |
| `pipeline` / `finished` / `stream/promises` / `stream/consumers` (`text`, `json`, `buffer`)           |   ✅    | [lib-node-stream-pipeline.ts](conformance/lib-node-stream-pipeline.ts) | Errors destroy the pipeline and reach the callback / rejection                               |
| Backpressure (`highWaterMark` beyond `write()`'s return value), `stream/web`, `compose`, `Readable.toWeb` | ❌  | —                                                                    | Not implemented                                                                              |

#### `node:readline`

| API                                                                                     | Status | Probe                                                                    | Notes                                                                   |
| --------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `createInterface` (`'line'` / `'close'`, `question(q, cb)`, `prompt`, `close`, `for await`) |   ✅    | [lib-node-readline.ts](conformance/lib-node-readline.ts)                 | Any readable stream as input (`process.stdin` included)                  |
| `node:readline/promises` (`await rl.question(q)`)                                        |   ✅    | [lib-node-readline-promises.ts](conformance/lib-node-readline-promises.ts) |                                                                         |
| `question(prompt)` (synchronous)                                                        |   ✅    | [lib-node-readline-question.ts](conformance/lib-node-readline-question.ts) | TypeNative extension (not in Node): used by the self-hosted compiler     |
| Terminal features (`cursorTo`, `emitKeypressEvents`, history, completer)                |   ❌    | —                                                                        | Not implemented                                                         |

#### `node:child_process`

| API                                                                                              | Status | Probe                                                                      | Notes                                                                                     |
| ------------------------------------------------------------------------------------------------ | :----: | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `execSync` / `execFileSync` / `spawnSync` (`encoding`, `input`, `cwd`, `env`, `shell`, `stdio: 'inherit'`) | ✅ | [lib-node-child-process-sync.ts](conformance/lib-node-child-process-sync.ts) | Buffers unless an encoding is given (as in Node); a non-zero exit throws with `status` / `stdout` / `stderr` |
| `exec` / `execFile` (callbacks), `spawn` → `ChildProcess` (stdio streams, `'exit'` / `'close'`, `kill`); `promisify(exec)` | ✅ | [lib-node-child-process-async.ts](conformance/lib-node-child-process-async.ts) | `'close'` follows the end of the stdio streams being read; exit codes on `err.code`     |
| `fork` / IPC / `detached`, `stdio` arrays beyond stdout                                          |   ❌    | —                                                                          | Not implemented                                                                           |

#### `node:diagnostics_channel`

| API                                                                                  | Status | Probe                                                                        | Notes                         |
| ------------------------------------------------------------------------------------ | :----: | ---------------------------------------------------------------------------- | ----------------------------- |
| `channel` / `publish` / `subscribe` / `unsubscribe` / `hasSubscribers`               |   ✅    | [lib-node-diagnostics-channel.ts](conformance/lib-node-diagnostics-channel.ts) | Synchronous; shared by name   |
| `tracingChannel`                                                                     |   ❌    | —                                                                            | Not implemented               |

#### `node:net`

| API                                                                                                   | Status | Probe                                        | Notes                                                                                     |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `createServer` / `Server` (`listen` forms incl. `{ port, host }` and Unix paths, `address()`, `close(cb)`, `getConnections`, `maxConnections`, `ref` / `unref`; `'listening'` / `'connection'` / `'close'` / `'error'`) | ✅ | [lib-node-net.ts](conformance/lib-node-net.ts) | A listening server keeps the process alive; `close()` emits `'close'` once its connections end |
| `connect` / `createConnection` / `Socket` (a duplex stream: `write` / `end` / `'data'` / `'end'`, `setEncoding`, `remoteAddress` / `remotePort` / `localPort`, `setTimeout` + `'timeout'`, `setNoDelay`, `setKeepAlive`, `destroy`, `'close'(hadError)`) | ✅ | [lib-node-net.ts](conformance/lib-node-net.ts) | One goroutine reads the `net.Conn`; `allowHalfOpen: false` ends the socket after `'end'`, as in Node |
| Node's errors (`connect ECONNREFUSED 127.0.0.1:80`, `EADDRINUSE`, `ECONNRESET`; `code` / `errno` / `syscall` / `address` / `port`) | ✅ | [lib-node-net.ts](conformance/lib-node-net.ts) |                                                                                           |
| `isIP` / `isIPv4` / `isIPv6`                                                                           |   ✅    | [lib-node-net.ts](conformance/lib-node-net.ts) |                                                                                         |
| `BlockList` / `SocketAddress` / `net.Stream` / `autoSelectFamily` / IPC handle passing                 |   ❌    | —                                            | Not implemented                                                                           |

#### `node:dns`

| API                                                                                    | Status | Probe                                        | Notes                                                                 |
| -------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | --------------------------------------------------------------------- |
| `lookup` (`family`, `all`) and `dns/promises` / `dns.promises` `lookup`                 |   ✅    | [lib-node-dns.ts](conformance/lib-node-dns.ts) | Go's resolver; `getaddrinfo ENOTFOUND host` errors with `hostname`   |
| `resolve` (rrtype) / `resolve4` / `resolve6` / `resolveCname` / `resolveMx` / `resolveTxt` / `resolveNs` / `resolveSrv` / `reverse` (callback and promise forms), `getServers` | ✅ | — | Implemented, not probed (needs a network); `getServers` reads `/etc/resolv.conf` |
| `Resolver` class / `setServers` / `lookupService` / `resolveAny` / `ttl` option         |   ❌    | —                                            | Go's resolver has no per-query server selection                       |

#### `node:http` / `node:https`

| API                                                                                                   | Status | Probe                                                          | Notes                                                                                        |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `createServer((req, res) => …)` / `'request'`; `IncomingMessage` (a Readable: `method`, `url`, `headers`, `headersDistinct`, `rawHeaders`, `httpVersion`, `socket.remoteAddress`) | ✅ | [lib-node-http-server.ts](conformance/lib-node-http-server.ts) | Go's `net/http` serves the connections; bodies stream into the request                       |
| `ServerResponse` (a Writable: `statusCode`, `setHeader` / `getHeader` / `getHeaders` / `hasHeader` / `removeHeader` / `appendHeader`, `writeHead`, `write`, `end`, `headersSent`, `'finish'`) | ✅ | [lib-node-http-server.ts](conformance/lib-node-http-server.ts) | `end(data)` without earlier writes sends a `Content-Length`; `write()` streams a chunked body |
| `request` / `get` (URL strings, `URL` objects, options: `hostname` / `port` / `path` / `method` / `headers` / `auth` / `timeout` / `signal` / `socketPath`); `ClientRequest` (`setHeader`, `write`, `end`, `destroy`, `'response'`, `'error'`, `'timeout'`) | ✅ | [lib-node-http-client.ts](conformance/lib-node-http-client.ts) | No redirects are followed and bodies are not decompressed, as in Node; `destroy()` before a response fails with `socket hang up` |
| `STATUS_CODES` / `METHODS` / `maxHeaderSize` / `Agent` / `globalAgent`                                |   ✅    | [lib-node-http-server.ts](conformance/lib-node-http-server.ts) | `Agent` options are accepted; Go's transport pools connections                               |
| `https.createServer({ key, cert })` / `https.request` / `https.get` (`ca`, `rejectUnauthorized`, `servername`, client `key` / `cert`) | ✅ | [lib-node-https.ts](conformance/lib-node-https.ts) | Certificate checks as in [node:tls](#nodetls)                                               |
| `headers` values                                                                                      |   ✅    | [lib-node-http-client.ts](conformance/lib-node-http-client.ts) | Repeated headers are joined with `, ` (`; ` for `cookie`) — including `set-cookie`, which Node keeps as an array: use `headersDistinct['set-cookie']` |
| `statusMessage` on responses we send, `'upgrade'` / `'connect'` / `'checkContinue'`, `Agent` socket pooling control, trailers we send |   ❌    | —                              | Go's `ResponseWriter` sends its standard reason phrases; no protocol upgrades               |
| `node:http2`                                                                                          |   ❌    | —                                                              | Not implemented                                                                              |

#### `node:tls`

| API                                                                                                   | Status | Probe                                        | Notes                                                                                       |
| ----------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `createServer({ key, cert, ca, requestCert, ALPNProtocols, minVersion, maxVersion }, cb)` / `'secureConnection'` | ✅ | [lib-node-tls.ts](conformance/lib-node-tls.ts) | Handshakes run on the accept goroutine                                                    |
| `connect` (`host`, `port`, `ca`, `servername`, `rejectUnauthorized`, client `key` / `cert`) / `'secureConnect'`; `TLSSocket` (`authorized`, `authorizationError`, `encrypted`, `alpnProtocol`, `getPeerCertificate`, `getProtocol`, `getCipher`) | ✅ | [lib-node-tls.ts](conformance/lib-node-tls.ts) | Node's verification codes: `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID` |
| `createSecureContext` / `getCiphers` / `DEFAULT_MIN_VERSION` / `DEFAULT_MAX_VERSION`                   |   ✅    | —                                            | Implemented, not probed; cipher names are Go's                                              |
| PFX / passphrase-protected keys, `checkServerIdentity`, session resumption, `renegotiate`, `rootCertificates` |   ❌    | —                                     | Not implemented                                                                             |

#### `node:dgram`

| API                                                                                       | Status | Probe                                          | Notes                                         |
| ----------------------------------------------------------------------------------------- | :----: | ---------------------------------------------- | --------------------------------------------- |
| `createSocket('udp4' \| 'udp6' \| { type })`, `bind`, `send` (offset / length forms, callback), `'message'(msg, rinfo)`, `address`, `close`, `connect` / `disconnect` / `remoteAddress`, `ref` / `unref` | ✅ | [lib-node-dgram.ts](conformance/lib-node-dgram.ts) | `send` binds an unbound socket first, as in Node |
| Multicast membership, `setBroadcast` / `setTTL` effects                                   |   ❌    | —                                              | Accepted without effect                       |

#### `fetch`

| API                                                                                                   | Status | Probe                                            | Notes                                                                                      |
| ----------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `fetch(url \| Request, { method, headers, body, redirect, signal })`; `Response` (`status`, `ok`, `statusText`, `headers`, `url`, `redirected`, `text()` / `json()` / `bytes()` / `arrayBuffer()`, `clone()`, `Response.json` / `error` / `redirect`) | ✅ | [lib-node-fetch.ts](conformance/lib-node-fetch.ts) | Follows redirects (`manual` / `error` too); gzip bodies are decompressed; failures reject with `TypeError('fetch failed')` whose `cause` is the system error; aborts reject with `AbortError` |
| `Headers` (`get` / `set` / `append` / `has` / `delete` / `forEach` / `entries` / `getSetCookie`, `for...of`) / `Request` |   ✅    | [lib-node-fetch.ts](conformance/lib-node-fetch.ts) | Names are lower-cased and iterated in sorted order                                         |
| Streaming bodies (`response.body` as a `ReadableStream`), `FormData`, `Blob`, the fetch bad-port list |   ❌    | —                                                | Web streams are not implemented                                                            |

#### `node:async_hooks`

| API                                                                                                  | Status | Probe                                                      | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AsyncLocalStorage` (`run`, `getStore`, `enterWith`, `exit`, `disable`, static `bind` / `snapshot`)    |   ✅    | [lib-node-async-hooks.ts](conformance/lib-node-async-hooks.ts) | The store follows timers, `setImmediate`, `nextTick`, microtasks, promise callbacks, `await`, async function bodies, fs / dns callbacks; streams, sockets and servers emit in the context they were created / listened in |
| `AsyncResource` (`runInAsyncScope`, `bind`, `asyncId`, static `bind`)                                 |   ✅    | [lib-node-async-hooks.ts](conformance/lib-node-async-hooks.ts) | Captures the context it is created in                                                                   |
| `createHook` callbacks (`init` / `before` / `after` / `destroy`), real `executionAsyncId` / `triggerAsyncId` |   ❌    | —                                                  | `createHook` is accepted but never calls back; ids are always `1` / `0`                                 |

#### `node:test`

| API                                                                                                  | Status | Probe                                                   | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `test` / `it` / `describe` / `suite` (+ `.skip` / `.todo` / `.only`; `skip` / `todo` / `timeout` options); sync, async and `done`-callback tests | ✅ | [lib-node-test.ts](conformance/lib-node-test.ts) | Tests run one after another once the main module has finished, as in Node |
| `before` / `after` / `beforeEach` / `afterEach` (file and suite level, `t.before` & co.)              |   ✅    | [lib-node-test.ts](conformance/lib-node-test.ts)        | Node's order: outer `beforeEach` first, inner `afterEach` first                                          |
| `TestContext`: `t.test` subtests, `t.skip`, `t.todo`, `t.diagnostic`, `t.plan`, `t.name`, `t.fullName`, `t.signal`, `t.mock` |   ✅    | [lib-node-test.ts](conformance/lib-node-test.ts) |                                                                                       |
| Reporting: TAP (Node's default when stdout is not a terminal) / spec (on a terminal); `tests` / `suites` / `pass` / `fail` / `cancelled` / `skipped` / `todo` counters; exit code 1 on failure | ✅ | [lib-node-test-fail.ts](conformance/lib-node-test-fail.ts) | Same layout as Node, without `location` / `stack` (a native binary has no source positions); timeouts count as cancelled |
| `mock.fn(original?, implementation?)`; `fn.mock.calls` / `callCount()` / `mockImplementation(Once)` / `resetCalls()` / `restore()` |   ✅    | [lib-node-test.ts](conformance/lib-node-test.ts) | The mock has the original's Go function type                                                          |
| `t.assert`, `mock.method` / `mock.getter` / `mock.timers`, snapshots, coverage, `--test` / `--test-reporter` / `--test-only` flags, `run()` |   ❌    | —                                   | Not implemented (`only` runs everything, like Node without `--test-only`)                               |

#### `node:worker_threads`

| API                                                                                                  | Status | Probe                                                              | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Worker` (`workerData`, `argv`, `env` / `SHARE_ENV`; `postMessage`, `'online'` / `'message'` / `'error'` / `'exit'`, `terminate()`, `threadId`, `ref` / `unref`); `isMainThread`, `parentPort`, `workerData`, `threadId` | ✅ | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | A worker re-runs the current program as a child process (an isolate of its own, as in Node) linked over loopback TCP; branch on `isMainThread` |
| Messages: structured clone of JSON-like values, Buffers (arriving as `Uint8Array`s), `Map`, `Set`, `Date`, `bigint`, errors |   ✅    | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | Functions throw `DataCloneError`                                                                    |
| Uncaught exceptions in a worker / `terminate()`                                                        |   ✅    | [lib-node-worker-errors.ts](conformance/lib-node-worker-errors.ts) | `'error'` with the message, then exit code `1`                                                          |
| `MessageChannel` / `MessagePort` (`postMessage`, `on('message')`, `onmessage`, `start`, `close`, `ref` / `unref`), `receiveMessageOnPort`, `BroadcastChannel`, `get/setEnvironmentData` | ✅ | [lib-node-worker-threads.ts](conformance/lib-node-worker-threads.ts) | Channels and broadcast channels work within one process (ports can't be transferred to workers)     |
| Workers for another file / `eval: true`, transferring ports, `SharedArrayBuffer` / `Atomics`, `resourceLimits`, worker `stdout: true` streams |   ❌    | —                                     | One binary holds one program; memory is not shared between processes                                  |

#### Not supported yet

| Module                                                                               | Status | Probe | Notes                                                                                      |
| ------------------------------------------------------------------------------------ | :----: | ----- | ------------------------------------------------------------------------------------------ |
| `node:http2`                                                                         |   ❌    | —     | Not implemented (see [http / https](#nodehttp--nodehttps))                                  |
| `node:cluster`                                                                       |   ❌    | —     | Not implemented                                                                            |
| `node:inspector` / `node:repl` / `node:vm` / `node:v8` / `node:wasi` / `node:sea` / `node:trace_events` / `node:module` | ❌ | — | Need a JavaScript engine at runtime; no native equivalent                                  |
| `node:test/reporters`                                                                |   ❌    | —     | Custom reporters are not implemented (see [test](#nodetest))                               |
| `node:sqlite`                                                                        |   ❌    | —     | Needs a non-standard-library SQLite driver                                                 |
| `node:domain`                                                                        |   ❌    | —     | Deprecated upstream                                                                        |
| `node:stream/web`                                                                    |   ❌    | —     | Web streams are not implemented                                                            |

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
| `go:container/heap` | ⚠️ | — | Needs a TS class satisfying `heap.Interface`; TS classes cannot implement Go interfaces yet |
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
| Throw on error | `(T, error)` results throw a `GoError` on failure; `error`-only calls throw as statements and yield the error value in value position. |
| Tuples | Multi-value results pack into a slice (TS tuple); `const [a, b] = f()` types each element (ints read as numbers). |
| Structs | `new pkg.T({...})` builds a composite literal (pointer when any method needs it); fields read/write directly, converting numbers both ways (`h.Size += 1`). Embedded structs promote their fields. |
| Named numerics | Typed constants (`time.Second`, `reflect.String`) stay typed in Go; arithmetic and `===` coerce the `number` side (`time.Second * 2`). Results read as numbers: `token.Token(n)` restores the methods. |
| Callbacks | Func-typed params and struct fields become Go closures with the exact Go signature (int params read as numbers, returns convert to the result type); sync callbacks (sort, slices, strings, ...) run inline. |
| Generics | Type args are inferred from the arguments, including through constraints (`maps.Keys(m)` with `Map ~map[K]V`); unresolved ones become `any`. |
| printf verbs | With a literal format, numbers passed to `%d %x %o %b %c %U` convert to `int64`; scan into number refs with `%v`. |
| nil | `null` passes as `nil`; `x === null` on nil-able Go values (slices, maps, interfaces, pointers) is a real nil check. |
| Channels | `chan<T>(size?)` / `GoChan<T>` with `send`, `recv`, `close`; `for…of` ranges channels, `iter.Seq` and `iter.Seq2` (`for (const [k, v] of seq2)`). |
| Out-params | `ref<T>(init?)` makes a pointer cell; `.value` dereferences it. |
| Byte slices | `[]byte` is `Uint8Array` (zero-copy); `number[]` converts per call (mutations of the copy are lost). |
| Side-effect imports | `import 'go:time/tzdata'` emits a blank `import _`. |

### npm packages

| Pattern                   | Status | Probe                                                    | Notes                                                                                             |
| ------------------------- | :----: | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `import { x } from 'pkg'` |   ✅    | [syntax-import-npm.ts](conformance/syntax-import-npm.ts) | Mapped to Go module imports (fixture dep in [conformance/package.json](conformance/package.json)) |
