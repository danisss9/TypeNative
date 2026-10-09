# Conformance

Every TypeScript language feature and standard-library API TypeNative aims to
support, split by area. Each ✅ row links to the [conformance/](conformance/)
probe that proves it transpiles correctly (`npm run conformance`, filter with an
optional substring: `node scripts/conformance.mjs <filter>`; `--native` runs the
self-hosted binary). Each ❌ row is a known gap with no passing probe yet.

## Basic types

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| `number` | ✅ | [syntax-arithmetic.ts](conformance/syntax-arithmetic.ts) | Transpiled to `float64` |
| `boolean` | ✅ | [syntax-variables.ts](conformance/syntax-variables.ts) | Transpiled to `bool` |
| `string` | ✅ | [syntax-variables.ts](conformance/syntax-variables.ts) | |
| `null` | ✅ | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts) | |
| `undefined` | ✅ | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts) | |
| `any` / `unknown` | ✅ | [syntax-selfhost-context.ts](conformance/syntax-selfhost-context.ts) | Dynamic values handled at runtime (JSON-like objects, arrays, primitives) |
| Nullable types (`T \| null`, `T \| undefined`) | ✅ | [syntax-null-undefined.ts](conformance/syntax-null-undefined.ts) | Transpiled to Go pointer types |
| `bigint` | ❌ | — | `2n` literals rejected (`BigIntLiteral` unsupported) |
| `symbol` | ❌ | [syntax-symbols.ts](conformance/syntax-symbols.ts) | `Symbol` is undefined in output |
| `void` / `never` | ❌ | — | No probe yet |

## Variables & destructuring

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Variable declarations (`let` / `const`) | ✅ | [syntax-variables.ts](conformance/syntax-variables.ts) | |
| Array destructuring | ❌ | [syntax-destructuring.ts](conformance/syntax-destructuring.ts) | Invalid operation in output |
| Object destructuring | ❌ | [syntax-destructuring.ts](conformance/syntax-destructuring.ts) | Invalid operation in output |
| Destructuring with defaults | ❌ | [syntax-destructuring-defaults.ts](conformance/syntax-destructuring-defaults.ts) | Panics (index out of range) |
| Destructured parameters | ✅ | [syntax-destructuring-params.ts](conformance/syntax-destructuring-params.ts) | `function f({ a, b }: T)`, `([x, y]: number[])` |
| Object shorthand | ❌ | [syntax-destructuring.ts](conformance/syntax-destructuring.ts) | Same probe fails (see above) |
| Object spread | ❌ | [syntax-object-spread.ts](conformance/syntax-object-spread.ts) | Struct field lookup fails in output |
| Array spread | ✅ | [syntax-array-spread.ts](conformance/syntax-array-spread.ts) | `[...arr]`, `fn(...args)` |
| `delete` operator | ✅ | [syntax-delete.ts](conformance/syntax-delete.ts) | `delete o.key` on records |
| Computed keys | ❌ | [syntax-computed-keys.ts](conformance/syntax-computed-keys.ts) | `o.name` lookup fails in output |
| Records / dictionaries | ✅ | [syntax-in-operator.ts](conformance/syntax-in-operator.ts) | `Record<K, V>` and objects indexed by key → Go maps |
| Tuples | ✅ | [syntax-tuples.ts](conformance/syntax-tuples.ts) | `[string, number]` fixed-length arrays |
| Top-level / module-scope variables | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Functions see main-file top-level variables |
| Numeric separators | ✅ | [syntax-numeric-separators.ts](conformance/syntax-numeric-separators.ts) | `1_000_000` |

## Operators

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Arithmetic operators | ✅ | [syntax-arithmetic.ts](conformance/syntax-arithmetic.ts) | `+`, `-`, etc.; `%`/`%=` via `math.Mod` |
| Exponent operator | ✅ | [syntax-exponent.ts](conformance/syntax-exponent.ts) | `2 ** 10` |
| Bitwise operators | ✅ | [syntax-bitwise.ts](conformance/syntax-bitwise.ts) | `&`, `\|`, `^`, `<<`, `>>` |
| Unsigned shift | ✅ | [syntax-unsigned-shift.ts](conformance/syntax-unsigned-shift.ts) | `>>>` |
| Comparison operators | ✅ | [syntax-variables.ts](conformance/syntax-variables.ts) | `==`, `!=`, `===`, `!==`, etc. |
| Logical operators | ✅ | [syntax-variables.ts](conformance/syntax-variables.ts) | `&&`, `\|\|` |
| Increment / decrement | ✅ | [syntax-increment-expression.ts](conformance/syntax-increment-expression.ts) | `++`, `--`, incl. as expressions |
| Non-null assertion (`!`) | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Stripped during transpilation |
| Ternary expressions | ✅ | [syntax-ternary.ts](conformance/syntax-ternary.ts) | `condition ? a : b` |
| Nullish coalescing | ✅ | [syntax-nullish.ts](conformance/syntax-nullish.ts) | `??` operator, incl. chains |
| Optional chaining | ✅ | [syntax-optional-chaining.ts](conformance/syntax-optional-chaining.ts) | `obj?.prop`, `arr?.[i]`, chains across calls |
| Nullish / logical assignment | ✅ | [syntax-logical-assignment.ts](conformance/syntax-logical-assignment.ts) | `??=`, `\|\|=`, `&&=` |
| `in` operator | ✅ | [syntax-in-operator.ts](conformance/syntax-in-operator.ts) | `"key" in obj` on records |
| `typeof` | ✅ | [syntax-typeof.ts](conformance/syntax-typeof.ts) | `"key" in obj`, `typeof x === "string"` |
| `instanceof` | ✅ | [syntax-instanceof.ts](conformance/syntax-instanceof.ts) | Class instance checks |
| JS truthiness | ✅ | [syntax-optional-params.ts](conformance/syntax-optional-params.ts) | `if (str)`, `!count`, `a \|\| fallback` on any type |
| Loose equality (`==`) | ❌ | [semantics-loose-equality.ts](conformance/semantics-loose-equality.ts) | `0 == false` rejected (mismatched Go types) |

## Control flow

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| If / else statements | ✅ | [syntax-if-switch.ts](conformance/syntax-if-switch.ts) | Incl. unbraced bodies and else-if chains |
| Switch statements | ✅ | [syntax-switch.ts](conformance/syntax-switch.ts) | Case and default statements |
| Switch fallthrough | ✅ | [syntax-switch-fallthrough.ts](conformance/syntax-switch-fallthrough.ts) | Explicit fallthrough between cases |
| `for` loops | ✅ | [syntax-loops.ts](conformance/syntax-loops.ts) | Standard `for` loops, incl. unbraced bodies |
| `continue` | ✅ | [syntax-loops.ts](conformance/syntax-loops.ts) | `continue` in all loop kinds |
| `for...of` loops | ✅ | [syntax-loops.ts](conformance/syntax-loops.ts) | Arrays, Maps, Sets, strings, tuples; `Object.entries()` unwrapping |
| `for...in` loops | ❌ | [syntax-for-in.ts](conformance/syntax-for-in.ts) | Unused variable in output |
| `while` loops | ✅ | [syntax-loops.ts](conformance/syntax-loops.ts) | Transpiled to Go's `for` loops; assignment in condition |
| `do...while` loops | ✅ | [syntax-do-while.ts](conformance/syntax-do-while.ts) | Implemented with conditional break |
| Labeled loops | ❌ | [syntax-labeled-loops.ts](conformance/syntax-labeled-loops.ts) | `LabeledStatement` unsupported |
| `try` / `catch` / `finally` | ✅ | [syntax-try-catch-finally.ts](conformance/syntax-try-catch-finally.ts) | `throw` → `panic`; catch/finally via `defer`/`recover` |
| Custom error classes | ❌ | [syntax-custom-errors.ts](conformance/syntax-custom-errors.ts) | Constructor arg count mismatch in output |
| `Error.message` | ❌ | [syntax-error-message.ts](conformance/syntax-error-message.ts) | `.message` undefined on caught value |
| Narrowing | ✅ | [syntax-typeof.ts](conformance/syntax-typeof.ts) | `T \| undefined` narrowed after `if (x)`, `x !== undefined`, early returns |

## Functions

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Function declarations | ✅ | [syntax-functions.ts](conformance/syntax-functions.ts) | Transpiled to Go functions |
| Arrow functions | ✅ | [syntax-arrow-functions.ts](conformance/syntax-arrow-functions.ts) | Transpiled to anonymous functions |
| IIFEs | ✅ | [syntax-iife.ts](conformance/syntax-iife.ts) | `(() => { ... })()` and `(function name() { ... })()` |
| Closures over mutable state | ✅ | [syntax-closures.ts](conformance/syntax-closures.ts) | Functions capturing and mutating outer variables; per-iteration `let` |
| Function types | ✅ | [syntax-closures.ts](conformance/syntax-closures.ts) | `() => number`, `(x: number) => string` as type annotations |
| Default parameter values | ✅ | [syntax-default-params.ts](conformance/syntax-default-params.ts) | `function(x = defaultValue)`, incl. constructors, methods, arrows |
| Rest parameters | ✅ | [syntax-rest-params.ts](conformance/syntax-rest-params.ts) | `function(...args: T[])` → Go variadic |
| Spread in calls | ✅ | [syntax-spread-call.ts](conformance/syntax-spread-call.ts) | `f(...args)` incl. tuples |
| Optional parameters | ✅ | [syntax-optional-params.ts](conformance/syntax-optional-params.ts) | `function f(x?: string)` |
| Destructured parameters | ✅ | [syntax-destructuring-params.ts](conformance/syntax-destructuring-params.ts) | `function f({ a, b }: T)`, `([x, y]: number[])` |
| Contextual object-literal arguments | ✅ | [syntax-contextual-arguments.ts](conformance/syntax-contextual-arguments.ts) | Struct type inferred from parameter / return type |
| Recursion | ✅ | [syntax-recursion.ts](conformance/syntax-recursion.ts) | Direct self-recursion |
| Generators (`function*` / `yield`) | ❌ | [syntax-generators.ts](conformance/syntax-generators.ts) | `YieldExpression` unsupported |
| Custom iterators (`Symbol.iterator`) | ❌ | [syntax-custom-iterators.ts](conformance/syntax-custom-iterators.ts) | `ComputedPropertyName` unsupported |
| `as const` assertions | ❌ | [syntax-as-const.ts](conformance/syntax-as-const.ts) | `const` unexpected in output |

## Classes & interfaces

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Classes | ✅ | [syntax-class.ts](conformance/syntax-class.ts) | Transpiled to Go structs with constructor and receiver methods |
| Constructor parameter properties | ✅ | [syntax-class-parameter-properties.ts](conformance/syntax-class-parameter-properties.ts) | `constructor(private x: number)` |
| Class inheritance | ❌ | [syntax-class-inheritance.ts](conformance/syntax-class-inheritance.ts) | `SuperKeyword` unsupported |
| `implements` clauses | ✅ | [syntax-class-implements.ts](conformance/syntax-class-implements.ts) | `class C implements I` |
| Interface `extends` | ❌ | [syntax-interface-extends.ts](conformance/syntax-interface-extends.ts) | Unknown field in struct literal |
| Static members | ❌ | [syntax-class-static.ts](conformance/syntax-class-static.ts) | Type mismatch in output |
| Getters / setters (classes) | ❌ | [syntax-class-getters.ts](conformance/syntax-class-getters.ts) | Field undefined in output |
| Getters (object literals) | ❌ | [syntax-object-getters.ts](conformance/syntax-object-getters.ts) | Getter undefined in output |
| Object-literal methods | ❌ | [syntax-object-methods.ts](conformance/syntax-object-methods.ts) | Method undefined in output |
| Private `#` fields | ❌ | [syntax-class-private-fields.ts](conformance/syntax-class-private-fields.ts) | `PrivateIdentifier` unsupported |
| Abstract classes | ❌ | [syntax-class-abstract.ts](conformance/syntax-class-abstract.ts) | Transpiler crash |
| Interfaces | ✅ | [syntax-class-implements.ts](conformance/syntax-class-implements.ts) | Transpiled to Go interfaces |
| Optional properties | ✅ | [syntax-optional-chaining.ts](conformance/syntax-optional-chaining.ts) | `prop?: Type` in interfaces/types |
| Type-aware method dispatch | ✅ | [semantics-method-dispatch.ts](conformance/semantics-method-dispatch.ts) | Class `.push()` / `.length` not confused with array builtins |

## Generics

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Generic functions | ❌ | [syntax-generic-functions.ts](conformance/syntax-generic-functions.ts) | Type parameter undefined in output |
| Generic classes | ✅ | [syntax-generic-classes.ts](conformance/syntax-generic-classes.ts) | Type parameters via Go generics |

## Enums

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Numeric enums | ❌ | [syntax-enum-numeric.ts](conformance/syntax-enum-numeric.ts) | Enum-to-number comparison mismatch in output |
| String enums | ✅ | [syntax-enum-string.ts](conformance/syntax-enum-string.ts) | `enum` declarations and member access |

## Type-system features

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Type aliases | ✅ | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts) | `type P = { x: number }` → Go struct; alias-of-alias |
| Union types | ✅ | [syntax-union-types.ts](conformance/syntax-union-types.ts) | Narrowed via `typeof` checks |
| Type guards (`is`) | ❌ | [syntax-type-guards.ts](conformance/syntax-type-guards.ts) | Invalid operation in output |
| `as` assertions | ✅ | [syntax-type-aliases.ts](conformance/syntax-type-aliases.ts) | `x as T`, incl. angle-bracket syntax |
| Self-host contextual typing | ✅ | [syntax-selfhost-context.ts](conformance/syntax-selfhost-context.ts) | Object/array literals typed from context, `Record` literals, `in`, `any` params |
| Decorators (`@`) | ❌ | — | No probe yet |
| Namespaces / `module` blocks | ❌ | — | No probe yet |
| `override` modifier | ❌ | — | No probe yet |
| `readonly` modifier | ❌ | — | No probe yet |
| `satisfies` operator | ❌ | — | No probe yet |
| `keyof` / mapped / conditional types | ❌ | — | No probe yet |
| `import type` / `export type` | ❌ | — | No probe yet |

## Modules & imports

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Named imports | ✅ | [syntax-import-go.ts](conformance/syntax-import-go.ts) | `import { x } from './file'` |
| Default imports | ✅ | [syntax-import-go.ts](conformance/syntax-import-go.ts) | `import x from 'pkg'` — namespace stripped in output |
| Namespace imports | ✅ | [syntax-import-go.ts](conformance/syntax-import-go.ts) | `import * as x from 'pkg'` |
| Local file imports | ✅ | [syntax-import-local.ts](conformance/syntax-import-local.ts) | Relative paths transpiled to a separate Go file (helper: [import-local-helper.ts](conformance/import-local-helper.ts)) |
| Default export | ✅ | [syntax-default-export.ts](conformance/syntax-default-export.ts) | `export default function` |
| Node.js built-in imports | ✅ | [lib-node-path.ts](conformance/lib-node-path.ts) | `import { join } from 'node:path'` mapped to Go stdlib (see [Standard library](#standard-library)) |
| Go package imports | ✅ | [syntax-import-go.ts](conformance/syntax-import-go.ts) | `import { x } from 'go:pkg'` |
| npm package imports | ✅ | [syntax-import-npm.ts](conformance/syntax-import-npm.ts) | `import { x } from 'pkg'` mapped to Go module imports |
| `import.meta.url` | ❌ | — | Not lowered (see Roadmap) |

## Async & timing

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| `async` / `await` | ❌ | [syntax-async-await.ts](conformance/syntax-async-await.ts) | Missing channel element type in output |
| `Promise` constructor / `.then` | ❌ | [syntax-promise-then.ts](conformance/syntax-promise-then.ts) | Unexpected keyword in output |
| `Promise.all` | ❌ | [syntax-promise-all.ts](conformance/syntax-promise-all.ts) | Missing channel element type in output |
| `setTimeout` | ❌ | [lib-set-timeout.ts](conformance/lib-set-timeout.ts) | Too many return values in output |

## Semantics (JS behaviour preserved)

| Feature | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| Array reference semantics | ❌ | [semantics-array-reference.ts](conformance/semantics-array-reference.ts) | Aliased arrays don't share backing store yet |
| Object reference semantics | ✅ | [semantics-object-reference.ts](conformance/semantics-object-reference.ts) | Aliased objects share state; parameter mutation |
| Object identity | ✅ | [semantics-object-identity.ts](conformance/semantics-object-identity.ts) | Equal literals are different references |
| Object key order | ✅ | [semantics-object-key-order.ts](conformance/semantics-object-key-order.ts) | Insertion order preserved |
| Map insertion order | ✅ | [semantics-map-order.ts](conformance/semantics-map-order.ts) | Iteration follows insertion order |
| Set insertion order | ✅ | [semantics-set-order.ts](conformance/semantics-set-order.ts) | Spread follows insertion order |
| Default sort is lexicographic | ✅ | [semantics-default-sort.ts](conformance/semantics-default-sort.ts) | `[10, 9, 1].sort()` → `1,10,9` |
| Float math | ✅ | [semantics-float-math.ts](conformance/semantics-float-math.ts) | `7 / 2 === 3.5`, `0.1 + 0.2 !== 0.3` |
| Integer precision | ✅ | [semantics-integer-precision.ts](conformance/semantics-integer-precision.ts) | `2 ** 53 + 1 === 2 ** 53` |
| `NaN` semantics | ✅ | [semantics-nan.ts](conformance/semantics-nan.ts) | `NaN !== NaN`, `Number.isNaN(0 / 0)` |
| String-number concatenation order | ✅ | [semantics-string-number-concat.ts](conformance/semantics-string-number-concat.ts) | `'a' + 1 + 2` vs `1 + 2 + 'a'` |
| Array truthiness | ✅ | [semantics-array-truthy.ts](conformance/semantics-array-truthy.ts) | Empty array is truthy |
| Loop closures capture per-iteration `let` | ✅ | [semantics-loop-closures.ts](conformance/semantics-loop-closures.ts) | |

## Standard library

Every standard-library API TypeNative ports, split by module. Per
[types/typenative-npm.d.ts](types/typenative-npm.d.ts) (`node:*`) and
[types/typenative-go.d.ts](types/typenative-go.d.ts) (`go:*`).

### `console`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `console.log` | ✅ | [lib-console-log.ts](conformance/lib-console-log.ts) | Mapped to `fmt.Println` |
| `console.error` | ❌ | — | No probe yet (`fmt.Fprintln(os.Stderr, ...)` intended) |
| `console.time` / `console.timeEnd` | ✅ | [lib-console-time.ts](conformance/lib-console-time.ts) | Via `time.Now` / `time.Since` |

### `Math`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `Math.floor` / `ceil` / `round` | ✅ | [lib-math.ts](conformance/lib-math.ts) | Mapped to `math.Floor`, `math.Ceil`, `math.Round` |
| `Math.abs` / `sqrt` / `pow` | ✅ | [lib-math.ts](conformance/lib-math.ts) | Mapped to corresponding `math` functions |
| `Math.min` / `Math.max` | ✅ | [lib-math-min-max.ts](conformance/lib-math-min-max.ts) | Go builtins `min` / `max` |
| `Math.max(...arr)` / spread & variadic | ✅ | [lib-math-min-max.ts](conformance/lib-math-min-max.ts) | Spread and any number of arguments via `slices.Max` / `max` |
| `Math.random` | ✅ | [lib-math-random.ts](conformance/lib-math-random.ts) | Mapped to `rand.Float64()` |
| `Math.log` / `log2` / `log10` | ❌ | — | No probe yet (`math.Log`, `math.Log2`, `math.Log10` intended) |
| `Math.sin` / `cos` / `tan` | ❌ | — | No probe yet (`math.Sin`, `math.Cos`, `math.Tan` intended) |
| `Math.trunc` / `sign` | ❌ | — | No probe yet (`math.Trunc` and inline sign check intended) |

### `JSON`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `JSON.parse` | ✅ | [lib-json-parse.ts](conformance/lib-json-parse.ts) | Mapped to `encoding/json` `Unmarshal` |
| `JSON.stringify` | ❌ | [lib-json-stringify.ts](conformance/lib-json-stringify.ts) | Panics on struct input |

### `Object`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `Object.keys` / `values` / `entries` | ✅ | [lib-object-helpers.ts](conformance/lib-object-helpers.ts) | Map key/value iteration helpers; typed results for maps and records |
| `Object.assign` | ❌ | [lib-object-assign.ts](conformance/lib-object-assign.ts) | `Object` undefined in output |

### `String`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| Template literals | ✅ | [syntax-template-literals.ts](conformance/syntax-template-literals.ts) | Backtick strings with `${expr}` interpolation |
| Tagged templates | ❌ | [syntax-tagged-templates.ts](conformance/syntax-tagged-templates.ts) | `TaggedTemplateExpression` unsupported |
| `toUpperCase` / `toLowerCase` | ✅ | [lib-string-basics.ts](conformance/lib-string-basics.ts) | Via `strings` package |
| `trim` / `trimStart` / `trimEnd` | ✅ | [lib-string-basics.ts](conformance/lib-string-basics.ts) | Via `strings` package |
| `split` / `join` | ✅ | [lib-string-split-join.ts](conformance/lib-string-split-join.ts) | Via `strings` package |
| `includes` / `startsWith` / `endsWith` / `indexOf` | ✅ | [lib-string-search.ts](conformance/lib-string-search.ts) | Via `strings` package |
| `replace` / `replaceAll` (string pattern) | ✅ | [lib-string-replace.ts](conformance/lib-string-replace.ts) | Via `strings` package |
| `replace` / `replaceAll` (RegExp, `$1`/`$&`, fn replacer) | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | `/g` vs first match, `$1`/`$&` patterns, function replacers |
| `charAt` / `substring` / `slice` | ✅ | [lib-string-slice.ts](conformance/lib-string-slice.ts) | Direct Go string indexing/slicing |
| `charCodeAt` / `String.fromCharCode` | ❌ | [lib-string-char-codes.ts](conformance/lib-string-char-codes.ts) | Method undefined in output |
| `concat` / `repeat` | ✅ | [lib-string-pad-repeat.ts](conformance/lib-string-pad-repeat.ts) | Concatenation and `strings.Repeat` |
| `padStart` / `padEnd` | ✅ | [lib-string-pad-repeat.ts](conformance/lib-string-pad-repeat.ts) | Via `strings.Repeat` |
| `localeCompare` | ❌ | [lib-string-compare.ts](conformance/lib-string-compare.ts) | Method undefined in output |
| `match` / `matchAll` / `search` | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Via `regexp` package (`String.match` with groups) |
| `at` (negative indices) | ✅ | [lib-array-at.ts](conformance/lib-array-at.ts) | Supports negative indices |
| Unicode length / iteration | ❌ | [lib-string-unicode.ts](conformance/lib-string-unicode.ts) | Type mismatch in output |

### `Array`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `push` / `pop` | ✅ | [lib-array-push-pop.ts](conformance/lib-array-push-pop.ts) | Basic stack operations |
| `shift` / `unshift` | ✅ | [lib-array-shift-unshift.ts](conformance/lib-array-shift-unshift.ts) | Queue operations |
| `join` / `reverse` | ❌ | [lib-array-reverse-join.ts](conformance/lib-array-reverse-join.ts) | Invalid argument in output |
| `slice` | ❌ | [lib-array-slice.ts](conformance/lib-array-slice.ts) | Panics |
| `splice` | ❌ | [lib-array-splice.ts](conformance/lib-array-splice.ts) | Method undefined in output |
| `sort` (default, lexicographic) | ✅ | [semantics-default-sort.ts](conformance/semantics-default-sort.ts) | String sort by default |
| `sort` (comparator) | ❌ | [lib-array-sort-comparator.ts](conformance/lib-array-sort-comparator.ts) | Panics on comparator sort |
| `flat` / `flatMap` | ❌ | [lib-array-flat-flatmap.ts](conformance/lib-array-flat-flatmap.ts) | Method undefined in output |
| `at` | ✅ | [lib-array-at.ts](conformance/lib-array-at.ts) | Supports negative indices |
| `fill` | ❌ | [lib-array-fill.ts](conformance/lib-array-fill.ts) | `NewArray` undefined in output |
| `Array.from` | ❌ | [lib-array-from.ts](conformance/lib-array-from.ts) | `Array` undefined in output |
| `Array.isArray` | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Type check on values |
| `map` / `filter` / `reduce` | ✅ | [lib-array-map-filter-reduce.ts](conformance/lib-array-map-filter-reduce.ts) | Incl. chaining and object arrays |
| `some` / `every` | ✅ | [lib-array-some-every.ts](conformance/lib-array-some-every.ts) | Predicate quantifiers |
| `find` / `findIndex` / `findLast` | ❌ | [lib-array-find.ts](conformance/lib-array-find.ts) | `findLast` undefined in output |
| `forEach` | ✅ | [lib-map-iteration.ts](conformance/lib-map-iteration.ts) | Block-body callbacks; `Map.forEach` |
| `includes` / `indexOf` / `lastIndexOf` | ❌ | [lib-array-search.ts](conformance/lib-array-search.ts) | `lastIndexOf` undefined in output |
| `entries` | ❌ | [lib-array-entries.ts](conformance/lib-array-entries.ts) | Method undefined in output |
| `length` truncation (`arr.length = 0`) | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Clear via length assignment |
| `filter(Boolean)` | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Constructor as predicate |

### `Map` / `Set`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `Map` (`set` / `get` / `has` / `delete` / `size`) | ✅ | [lib-map.ts](conformance/lib-map.ts) | `Map<K, V>` → Go `map[K]V`; constructor with entries |
| `Map` iteration (`for...of`, destructuring) | ✅ | [lib-map-iteration.ts](conformance/lib-map-iteration.ts) | Key/value iteration, `Object.entries()` unwrapping |
| `Set` (`add` / `has` / `delete` / `size`) | ✅ | [lib-set.ts](conformance/lib-set.ts) | `Set<T>` → Go `map[T]struct{}`; constructor with values |
| `Set` iteration / spread | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | `for...of`, `[...set]` |

### `Number`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `toString` (incl. radix) | ✅ | [lib-number-format.ts](conformance/lib-number-format.ts) | Universal `toString()` via `fmt.Sprintf` for any type |
| `toFixed` | ✅ | [lib-number-format.ts](conformance/lib-number-format.ts) | `n.toFixed(2)` via `strconv.FormatFloat` |
| `parseInt` / `parseFloat` / `Number()` | ✅ | [lib-number-parse.ts](conformance/lib-number-parse.ts) | Mapped to Go's `strconv` package |
| `Number.isInteger` / `isNaN` / `MAX_SAFE_INTEGER` | ✅ | [lib-number-checks.ts](conformance/lib-number-checks.ts) | Number predicates and constants |

### `Date`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `new Date()` / `getTime` / `toISOString` | ❌ | [lib-date.ts](conformance/lib-date.ts) | `NewDate` undefined in output |
| `Date.now()` | ❌ | [lib-date-now.ts](conformance/lib-date-now.ts) | `Date` undefined in output |

### `RegExp`

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| Regex literals | ✅ | [lib-regex-test.ts](conformance/lib-regex-test.ts) | `/pattern/flags` transpiled to `regexp.MustCompile` |
| `new RegExp()` | ✅ | [lib-regex-test.ts](conformance/lib-regex-test.ts) | Constructor with optional flags |
| `test()` | ✅ | [lib-regex-test.ts](conformance/lib-regex-test.ts) | Mapped to `regexp.MatchString` |
| `exec()` (groups) | ✅ | [lib-regex-groups.ts](conformance/lib-regex-groups.ts) | Mapped to `regexp.FindStringSubmatch` |
| Flags (`i`, `m`) | ✅ | [lib-regex-flags.ts](conformance/lib-regex-flags.ts) | Case-insensitive, multiline |
| Backreferences | ❌ | [lib-regex-backreference.ts](conformance/lib-regex-backreference.ts) | Go `regexp` rejects `\1` |
| Named groups | ❌ | [lib-regex-named-groups.ts](conformance/lib-regex-named-groups.ts) | `.groups` undefined in output |
| Global `exec` loop (`/g` + `lastIndex`) | ❌ | [lib-regex-global-exec.ts](conformance/lib-regex-global-exec.ts) | Stateful loops time out — use `matchAll` |
| Lookbehind | ❌ | [lib-regex-lookbehind.ts](conformance/lib-regex-lookbehind.ts) | Go `regexp` rejects `(?<=...)` |

### `Promise` / timers

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `Promise` constructor / `.then` | ❌ | [syntax-promise-then.ts](conformance/syntax-promise-then.ts) | Channel transpilation broken (see [Async & timing](#async--timing)) |
| `Promise.all` | ❌ | [syntax-promise-all.ts](conformance/syntax-promise-all.ts) | Channel transpilation broken |
| `setTimeout` | ❌ | [lib-set-timeout.ts](conformance/lib-set-timeout.ts) | Too many return values in output |

### Misc globals

| API | Status | Probe | Notes |
| --- | :----: | ----- | ----- |
| `assert` | ✅ | [lib-console-log.ts](conformance/lib-console-log.ts) | Transpiled to `panic` on failure |
| `process.argv` / `process.platform` | ✅ | [lib-process.ts](conformance/lib-process.ts) | Mapped to `os.Args` / `runtime.GOOS` |
| `process.env` | ✅ | [syntax-top-level-scope.ts](conformance/syntax-top-level-scope.ts) | Environment variable access |
| `process.exit` | ❌ | — | No probe yet (`os.Exit` intended) |

### Node builtins (`node:*`)

| Module | Status | Probe | Notes |
| ------ | :----: | ----- | ----- |
| `node:path` (`join`, `dirname`, `basename`, `extname`, `resolve`) | ✅ | [lib-node-path.ts](conformance/lib-node-path.ts) | Mapped to Go `path`/`filepath` |
| `node:fs` (`read/write/append/exists/mkdir/readdir/copy/rm`) | ✅ | [lib-node-fs.ts](conformance/lib-node-fs.ts) | Via Go helpers |
| `node:url` (`fileURLToPath`, `pathToFileURL`) | ❌ | — | Declared but no probe yet |
| `node:os` (`platform`, `homedir`, `tmpdir`) | ✅ | [lib-node-fs.ts](conformance/lib-node-fs.ts) | `platform()` covered; `homedir`/`tmpdir` unprobed |
| `node:child_process` (`exec`, `execSync`, `spawnSync`, `spawnInherit`) | ✅ | [lib-node-fs.ts](conformance/lib-node-fs.ts) | Sync API shape, stdio-inherit runs |
| `node:readline` (`question`) | ❌ | — | Declared (TypeNative sync extension) but no probe yet |

### Go bridges (`go:*`)

| Module | Status | Probe | Notes |
| ------ | :----: | ----- | ----- |
| `go:fmt` (`Println`, `Sprintf`) | ✅ | [syntax-import-go.ts](conformance/syntax-import-go.ts) | Direct Go package access |
| `go:strings` (`ToUpper`, `ToLower`) | ✅ | [syntax-import-go.ts](conformance/syntax-import-go.ts) | Direct Go package access |
| `go:strconv` (`FormatBool`) | ✅ | [syntax-import-go.ts](conformance/syntax-import-go.ts) | Direct Go package access |

### npm packages

| Pattern | Status | Probe | Notes |
| ------- | :----: | ----- | ----- |
| `import { x } from 'pkg'` | ✅ | [syntax-import-npm.ts](conformance/syntax-import-npm.ts) | Mapped to Go module imports (fixture dep in [conformance/package.json](conformance/package.json)) |

## Roadmap (known limitations)

- Stateful `/g` regex loops (`while ((m = re.exec(s)))`) are not supported — use `matchAll` (see [lib-regex-global-exec.ts](conformance/lib-regex-global-exec.ts)).
- `import.meta.url` is not lowered.
- Object types compile to Go structs, which are copied by value (JS objects are references).
- CI self-hosting job (stage 1 → stage 2 → compare).
- Gradually type the AST in `transpiler.ts` (fewer dynamic lookups, faster binary).
