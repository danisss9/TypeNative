# TypeNative

Build native applications using Typescript.

## PreRequisites

- [Nodejs v24](https://nodejs.org/en) or newer.
- [Go 1.23](https://go.dev/doc/install) or newer.

## Get Started

- Write a file `test.ts` with content `console.log('Hello World!');` or any other message
- Run `npx typenative --source test.ts --script`

## Typescript Syntax Support

TypeNative currently supports a focused subset of TypeScript syntax elements that are transpiled to Go code. The support is grouped by topic for easier scanning.

**Basic Types**

| Feature        | Supported | Notes                                                         |
| -------------- | :-------: | ------------------------------------------------------------- |
| number         |    ✅     | Transpiled to `float64`                                       |
| boolean        |    ✅     | Transpiled to `bool`                                          |
| string         |    ✅     |                                                               |
| null           |    ✅     |                                                               |
| any / unknown  |    ✅     | Dynamic values handled at runtime (JSON-like objects, arrays, primitives) |
| Nullable types |    ✅     | `T \| null` / `T \| undefined` transpiled to Go pointer types |

**Variables & Objects**

| Feature                | Supported | Notes                                           |
| ---------------------- | :-------: | ----------------------------------------------- |
| Variable declarations  |    ✅     | `let` and `const`                               |
| Object literals        |    ✅     | Transpiled to Go struct literals                |
| Object shorthand       |    ✅     | `{ name }` → `{ name: name }`                  |
| Array destructuring    |    ✅     | `const [a, b] = arr`                            |
| Object destructuring   |    ✅     | `const { x, y } = obj`                          |
| Object spread          |    ✅     | `{ ...base, x: 1 }`                             |
| Records / dictionaries |    ✅     | `Record<K, V>` and objects indexed by key → Go maps |
| Object type aliases    |    ✅     | `type P = { x: number }` → Go struct            |

**Operators**

| Feature                  | Supported | Notes                          |
| ------------------------ | :-------: | ------------------------------ |
| Arithmetic operators     |    ✅     | `+`, `-`, etc.                 |
| Comparison operators     |    ✅     | `==`, `!=`, `===`, `!==`, etc. |
| Logical operators        |    ✅     | `&&`, `\|\|`                   |
| Increment/Decrement      |    ✅     | `++`, `--`                     |
| Spread operator          |    ✅     | `[...arr]`, `fn(...args)`      |
| Non-null assertion (`!`) |    ✅     | Stripped during transpilation  |
| Ternary expressions      |    ✅     | `condition ? a : b`            |
| Nullish coalescing       |    ✅     | `??` operator                  |
| Optional chaining        |    ✅     | `obj?.prop`, `arr?.[i]`        |
| Nullish assignment       |    ✅     | `x ??= value`                  |
| `in` / `typeof`          |    ✅     | `"key" in obj`, `typeof x === "string"` |
| JS truthiness            |    ✅     | `if (str)`, `!count`, `a \|\| fallback` on any type |

**Control Flow**

| Feature            | Supported | Notes                                                  |
| ------------------ | :-------: | ------------------------------------------------------ |
| If/Else statements |    ✅     | Fully supported                                        |
| Switch statements  |    ✅     | Case and default statements                            |
| For loops          |    ✅     | Standard `for` loops                                   |
| Continue           |    ✅     | `continue` in all loop kinds                           |
| For...of loops     |    ✅     | Arrays, Maps, Sets; `Object.entries()` unwrapping      |
| For...in loops     |    ✅     | Iterates keys via Go `range`                           |
| While loops        |    ✅     | Transpiled to Go's `for` loops                         |
| Do...while loops   |    ✅     | Implemented with conditional break                     |
| Try/Catch/Finally  |    ✅     | `throw` → `panic`; catch/finally via `defer`/`recover` |
| Narrowing          |    ✅     | `T \| undefined` narrowed after `if (x)`, `x !== undefined`, early returns |

**Data Structures & Array Methods**

| Feature                    | Supported | Notes                                                                                         |
| -------------------------- | :-------: | --------------------------------------------------------------------------------------------- |
| Arrays                     |    ✅     | Basic array operations                                                                        |
| Array methods              |    ✅     | `push`, `pop`, `shift`, `unshift`, `join`, `slice`, `concat`, `reverse`, `sort`, `flat`, `at` |
| Higher-order array methods |    ✅     | `.map()`, `.filter()`, `.some()`, `.find()`, `.findIndex()`, `.every()`, `.forEach()`, `.reduce()` |
| Method chaining            |    ✅     | e.g. `.map(...).filter(...).join(...)`                                                        |
| Map                        |    ✅     | `Map<K, V>` → Go `map[K]V`; `.set()`, `.get()`, `.has()`, `.delete()`, `.clear()`, `.size`  |
| Set                        |    ✅     | `Set<T>` → Go `map[T]struct{}`; `.add()`, `.has()`, `.delete()`, `.clear()`, `.size`         |
| Object.keys / values       |    ✅     | Typed results for maps and records                                                            |
| Array sort / flat          |    ✅     | `sort((a, b) => a - b)` in place, `flat()` one level                                          |

**Functions**

| Feature                      | Supported | Notes                                                       |
| ---------------------------- | :-------: | ----------------------------------------------------------- |
| Function declarations        |    ✅     | Transpiled to Go functions                                  |
| Arrow functions              |    ✅     | Transpiled to anonymous functions                           |
| IIFEs                        |    ✅     | `(() => { ... })()` and `(function name() { ... })()`       |
| Closures over mutable state  |    ✅     | Functions capturing and mutating outer variables            |
| Function types               |    ✅     | `() => number`, `(x: number) => string` as type annotations |
| Generics (functions/classes) |    ✅     | Type parameters via Go generics                             |
| Default parameter values     |    ✅     | `function(x = defaultValue)`                                |
| Rest parameters              |    ✅     | `function(...args: T[])` → Go variadic                      |
| Optional parameters          |    ✅     | `function f(x?: string)`                                    |
| Destructured parameters      |    ✅     | `function f({ a, b }: T)`, `([x, y]: number[])`             |

**Classes & Interfaces**

| Feature             | Supported | Notes                                                          |
| ------------------- | :-------: | -------------------------------------------------------------- |
| Classes             |    ✅     | Transpiled to Go structs with constructor and receiver methods |
| Parameter properties |    ✅     | `constructor(private x: number)`                              |
| Class inheritance   |    ✅     | `extends` via embedded structs, `super()` supported            |
| Static members      |    ✅     | `static method()` / `static prop` → package-level declarations |
| Getters / Setters   |    ✅     | `get prop()` → `Get_prop()`, `set prop(v)` → `Set_prop(v)`    |
| Interfaces          |    ✅     | Transpiled to Go interfaces, supports `extends`                |
| Optional properties |    ✅     | `prop?: Type` in interfaces/types                              |
| Enums               |    ✅     | `enum` declarations and member access                          |

**Async & Timing**

| Feature     | Supported | Notes                                                             |
| ----------- | :-------: | ----------------------------------------------------------------- |
| Async/Await |    ✅     | `async` functions return Go channels, `await` reads from channels |
| Promises    |    ✅     | `new Promise` transpiled to channel + goroutine pattern           |
| setTimeout  |    ✅     | Mapped to Go's `time.AfterFunc`                                   |

**Built-in Functions & Utilities**

| Feature               | Supported | Notes                                                 |
| --------------------- | :-------: | ----------------------------------------------------- |
| console.log           |    ✅     | Mapped to `fmt.Println`                               |
| console.error         |    ✅     | Mapped to `fmt.Fprintln(os.Stderr, ...)`              |
| console.time/timeEnd  |    ✅     | Performance measurement via `time.Now` / `time.Since` |
| assert                |    ✅     | Transpiled to `panic` on failure                      |
| parseInt / parseFloat |    ✅     | Mapped to Go's `strconv` package                      |
| JSON.stringify        |    ✅     | Mapped to `encoding/json` `Marshal` / `MarshalIndent` |
| JSON.parse            |    ✅     | Mapped to `encoding/json` `Unmarshal`                 |
| Object.keys/values    |    ✅     | Map key/value iteration helpers                       |
| process.argv          |    ✅     | Mapped to `os.Args`                                   |
| process.platform      |    ✅     | Mapped to `runtime.GOOS`                              |
| process.exit          |    ✅     | Mapped to `os.Exit`                                   |

**Math Methods**

| Feature                   | Supported | Notes                                             |
| ------------------------- | :-------: | ------------------------------------------------- |
| Math.random               |    ✅     | Mapped to `rand.Float64()`                        |
| Math.floor / ceil / round |    ✅     | Mapped to `math.Floor`, `math.Ceil`, `math.Round` |
| Math.abs / sqrt / pow     |    ✅     | Mapped to corresponding `math` functions          |
| Math.min / max            |    ✅     | Go builtins `min` / `max`                         |
| Math.max(...arr)          |    ✅     | Spread and any number of arguments via `slices.Max` / `max` |
| Math.log / log2 / log10   |    ✅     | Mapped to `math.Log`, `math.Log2`, `math.Log10`   |
| Math.sin / cos / tan      |    ✅     | Mapped to `math.Sin`, `math.Cos`, `math.Tan`      |
| Math.trunc / sign         |    ✅     | Mapped to `math.Trunc` and inline sign check      |

**String Methods**

| Feature                    | Supported | Notes                                         |
| -------------------------- | :-------: | --------------------------------------------- |
| Template literals          |    ✅     | Backtick strings with `${expr}` interpolation |
| toUpperCase / toLowerCase  |    ✅     | Via `strings` package                         |
| trim / trimStart / trimEnd |    ✅     | Via `strings` package                         |
| split / includes / indexOf |    ✅     | Via `strings` package                         |
| startsWith / endsWith      |    ✅     | Via `strings` package                         |
| replace / replaceAll       |    ✅     | Via `strings` package                         |
| replace with RegExp        |    ✅     | `/g` vs first match, `$1`/`$&` patterns, function replacers |
| charAt / substring / slice |    ✅     | Direct Go string indexing/slicing             |
| concat / repeat            |    ✅     | String concatenation and `strings.Repeat`     |
| padStart / padEnd          |    ✅     | Via `strings.Repeat`                          |
| match / matchAll / search  |    ✅     | Via `regexp` package                          |
| at                         |    ✅     | Supports negative indices                     |

**Number / Object Methods**

| Feature  | Supported | Notes                                                 |
| -------- | :-------: | ----------------------------------------------------- |
| toString |    ✅     | Universal `toString()` via `fmt.Sprintf` for any type |
| toFixed  |    ✅     | `n.toFixed(2)` via `strconv.FormatFloat`               |

**RegExp**

| Feature        | Supported | Notes                                               |
| -------------- | :-------: | --------------------------------------------------- |
| Regex literals |    ✅     | `/pattern/flags` transpiled to `regexp.MustCompile` |
| new RegExp()   |    ✅     | Constructor with optional flags                     |
| test()         |    ✅     | Mapped to `regexp.MatchString`                      |
| exec()         |    ✅     | Mapped to `regexp.FindStringSubmatch`               |

**Modules & Imports**

| Feature                  | Supported | Notes                                                              |
| ------------------------ | :-------: | ------------------------------------------------------------------ |
| Named imports            |    ✅     | `import { x } from './file'`                                       |
| Default imports          |    ✅     | `import x from 'pkg'` — namespace stripped in output               |
| Namespace imports        |    ✅     | `import * as x from 'pkg'`                                         |
| Local file imports       |    ✅     | Relative paths transpiled to a separate Go file                    |
| Node.js built-in imports |    ✅     | `import { join } from 'node:path'` mapped to Go stdlib             |
| Go package imports       |    ✅     | `import { x } from 'go:pkg'`                                       |
| npm package imports      |    ✅     | `import { x } from 'pkg'` mapped to Go module imports              |
| Named exports            |    ✅     | `export function` / `export const` declarations                    |

## Native (self-hosted) compiler

TypeNative compiles itself: `src/main.ts` transpiles to Go and builds into a native `typenative`
binary that needs no Node.js at runtime and produces the same Go output as the npm package.

```sh
npm run build              # compile the TypeScript sources
npm run build:native       # build native/typenative and native/tsparser
native/typenative --source app.ts --script
```

Building the native compiler requires Go 1.26 (for the TypeScript parser, `tsparser/`). The
`typenative` binary finds `tsparser` next to itself, or via the `TYPENATIVE_TSPARSER`
environment variable.

### Known limitations

- Stateful `/g` regex loops (`while ((m = re.exec(s)))`) are not supported — use `matchAll`
- `import.meta.url` is not lowered
- Object types compile to Go structs, which are copied by value (JS objects are references)

TypeNative is in early development and new features are being added regularly.
