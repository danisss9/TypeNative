# Changelog

All notable changes to TypeNative will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.20] - 2026-03-16

### Added

- **Spread in array literals**: `[...arr1, ...arr2]` → `append(append([]T{}, arr1...), arr2...)`
- **Rest parameters**: `function(...args: T[])` → Go variadic `func(...args T)`
- **Spread in function calls**: `fn(...args)` → `fn(args...)`
- **Array destructuring**: `const [a, b] = arr` → Go index assignments
- **Object shorthand**: `{ name }` → `{ name: name }` in struct literals
- **Static class members**: `static method()` / `static prop` → `ClassName_method()` / `ClassName_prop` package-level declarations; `ClassName.method()` calls correctly resolve
- **Getters/Setters**: `get prop()` → `Get_prop()` method, `set prop(v)` → `Set_prop(v)` method
- **`for...in` loops**: `for (const k in obj)` → `for k := range obj`
- **`Object.entries()` in `for...of`**: `for (const [k, v] of Object.entries(map))` unwraps to `for k, v := range map`
- **Named function expression IIFEs**: `(function name() { ... })()` → anonymous `func() { ... }()`
- **`process` global**: `process.argv` → `os.Args`, `process.platform` → `runtime.GOOS`, `process.exit()` → `os.Exit()`, `process.cwd()` → `os.Getwd()`
- **`JSON.stringify()` / `JSON.parse()`**: mapped to `encoding/json` `Marshal`/`Unmarshal`
- **`Object.keys()` / `Object.values()` / `Object.entries()`**: map iteration helpers
- **Array methods**: `findIndex`, `every`, `forEach`, `reduce`, `pop`, `shift`, `unshift`, `reverse`, `sort`, `concat`, `flat`, `at`
- **String methods**: `padStart`, `padEnd`, `match`, `matchAll`, `search`, `at`
- **Math methods**: `log`, `log2`, `log10`, `sin`, `cos`, `tan`, `trunc`, `sign`
- **`console.error()`**: maps to `fmt.Fprintln(os.Stderr, ...)`
- **`String()` / `Number()` / `Boolean()`** conversion functions
- **Go reserved words protection**: `getSafeName()` now covers all Go keywords (`break`, `case`, `chan`, `continue`, `default`, `defer`, `else`, `fallthrough`, `for`, `func`, `go`, `goto`, `if`, `import`, `interface`, `map`, `package`, `range`, `return`, `select`, `struct`, `switch`, `type`, `var`)
- **Default import namespaces from npm/local packages**: `import ts from 'typescript'` registers `ts` as a stripped namespace so `ts.method()` → `method()`
- **Better unsupported syntax warnings**: `console.warn` with syntax kind name and source snippet instead of `console.log`
- **Type definitions (`typenative.d.ts`)**: added `findIndex`, `every`, `forEach`, `reduce`, `pop`, `shift`, `unshift`, `reverse`, `sort`, `flat`, `concat`, `at` to `Array`; `padStart`, `padEnd`, `match`, `matchAll`, `search`, `at` to `String`; added `JSON`, `Object`, `Process`, extended `Math` and `Console`

## [0.0.19] - 2026-03-07

### Added

- Module/import support: `import { x } from './file'` transpiled to Go package imports for local TypeScript files
- Node.js built-in module imports: `import { join } from 'node:path'` and similar mapped to corresponding Go standard library packages
- npm package imports: `import { x } from 'pkg'` mapped to Go module imports via `typenative-npm.d.ts` type definitions
- Go package imports: `import { x } from 'go:package'` to import a Go library package
- Named exports: `export function` and `export const` declarations now transpiled correctly

## [0.0.18] - 2026-03-03

### Added

- `Map<K, V>` support: transpiled to Go `map[K]V`; `.set()`, `.get()`, `.has()`, `.delete()`, `.clear()`, `.size` fully supported
- `Set<T>` support: transpiled to Go `map[T]struct{}`; `.add()`, `.has()`, `.delete()`, `.clear()`, `.size` fully supported
- Try/Catch/Finally support: `try/catch/finally` transpiled to Go IIFE with `defer`/`recover` pattern
- `throw new Error("msg")` transpiled to `panic("msg")`; bare `throw expr` transpiled to `panic(expr)`
- `Error` type added to `typenative.d.ts` for IDE type checking in test files
- Closures over mutable state: functions can now capture and mutate variables from outer scopes
- Function type annotations: `() => number`, `(x: number) => string`, etc. transpiled to Go `func(...)` types
- Return type inference for functions and arrow functions: when no explicit return type annotation is present, the transpiler infers the return type from `return` statements
- Expression-body arrow functions now correctly wrap the result as `{ return expr; }` in Go

## [0.0.17] - 2026-02-16

### Added

- Support for ternary expressions (`condition ? a : b`)
- Support for optional chaining (`obj?.prop`, `arr?.[i]`)
- Support for nullish coalescing (`??` operator)
- Support for type aliases (`type X = ...`)
- Support for type assertions (`expr as Type`)
- Support for optional properties (`prop?: Type` in interfaces/types)
- Support for default parameter values (e.g. `function(x = defaultValue)`)
- Support for enum declarations and member access (`enum X { ... }`, `X.Member`)
- Support for array methods: `map`, `filter`, `some`, `find`
- Support for chaining array methods (e.g. `arr.map(...).filter(...).join(...)`)

## [0.0.16] - 2025-02-15

### Added

- RegExp support: regex literals (`/pattern/flags`), `new RegExp()`, `test()`, and `exec()` mapped to Go's `regexp` package
- Universal `toString()` support for numbers, booleans, arrays, and objects

## [0.0.15] - 2025-02-15

### Added

- Classes with constructors, inheritance (`extends`, `super()`), and methods transpiled to Go structs
- Interfaces with method signatures and `extends` transpiled to Go interfaces
- Generics support for functions and classes via Go type parameters
- Async/Await transpiled to Go channels and goroutines
- Promises (`new Promise`) transpiled to channel + goroutine pattern
- `setTimeout` mapped to Go's `time.AfterFunc`
- Nullable types (`T | null`, `T | undefined`) transpiled to Go pointer types
- Object literals transpiled to Go struct literals
- `assert()` function transpiled to `panic` on failure
- `parseInt` and `parseFloat` mapped to Go's `strconv` package
- String methods: `split`, `trim`, `trimStart`, `trimEnd`, `toUpperCase`, `toLowerCase`, `indexOf`, `includes`, `startsWith`, `endsWith`, `replace`, `replaceAll`, `repeat`, `charAt`, `substring`, `slice`, `concat`, `toString`
- Array methods: `join`, `slice`, `toString` (in addition to existing `push`)
- Math methods: `ceil`, `round`, `abs`, `sqrt`, `pow`, `min`, `max` (in addition to existing `random`, `floor`)
- Non-null assertion operator (`!`) support
- Type-aware method dispatch to prevent class methods from being intercepted as built-in string/array methods
- Safe name collision avoidance for Go reserved identifiers
- Automatic Go import management for `fmt`, `math`, `math/rand`, `strings`, `strconv`, `time`

## [0.0.14] - 2025-05-25

### Added

- Project creation with new `--new` command
- Support for functions and arrow functions
- Support for switch statements
- If statements, while loops, and for...of loops for arrays

### Changed

- Replaced shelljs dependency with execa for improved process execution

### Fixed

- Project creation issues

## [0.0.12] - 2025-05-23

### Changed

- Switched transpilation target to Go language

## [0.0.9] - 2024-03-01

### Added

- Basic types support (number, boolean, string, null, any)
- Support for variable declarations
- Support for binary expressions
- Arithmetic, comparison, logical, and increment/decrement operators

## [0.0.1] - 2024-02-24

### Added

- Initial project setup
- Basic project structure

## [0.0.0] - 2022-12-20

### Added

- Initial commit
