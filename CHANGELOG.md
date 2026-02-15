# Changelog

All notable changes to TypeNative will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
