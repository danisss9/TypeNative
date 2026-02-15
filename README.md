# TypeNative

Build native applications using Typescript.

## PreRequisites

- [Nodejs v24](https://nodejs.org/en) or newer.
- [Go 1.21](https://go.dev/doc/install) or newer.

## Get Started

- Write a file `test.ts` with content `console.log('Hello World!');` or any other message
- Run `npx typenative --source test.ts --script`
- See your message in the terminal

## Create a TypeNative Project

- Run `npx typenative --new`
- Give your project a name
- Start writing code

## Typescript Syntax Support

TypeNative currently supports a subset of TypeScript syntax elements that are transpiled to Go code:

| Feature | Supported | Notes |
|---------|:---------:|-------|
| **Basic Types** |  |  |
| number | ✅ | Transpiled to `float64` |
| boolean | ✅ | Transpiled to `bool` |
| string | ✅ | |
| null | ✅ |  |
| any | ✅ | Used for type inference |
| Nullable types | ✅ | `T \| null` / `T \| undefined` transpiled to Go pointer types |
| **Variables** |  |  |
| Variable declarations | ✅ | `let` and `const` |
| Object literals | ✅ | Transpiled to Go struct literals |
| **Operators** |  |  |
| Arithmetic operators | ✅ | `+`, `-`, etc. |
| Comparison operators | ✅ | `==`, `!=`, `===`, `!==`, etc. |
| Logical operators | ✅ | `&&`, `\|\|` |
| Increment/Decrement | ✅ | `++`, `--` |
| Non-null assertion (`!`) | ✅ | Stripped during transpilation |
| **Control Flow** |  |  |
| For loops | ✅ | Standard `for` loops |
| For...of loops | ✅ | Iteration over arrays |
| While loops | ✅ | Transpiled to Go's `for` loops |
| Do...while loops | ✅ | Implemented with conditional break |
| If/Else statements | ✅ | Fully supported |
| Switch statements | ✅ | Case and default statements |
| **Data Structures** |  |  |
| Arrays | ✅ | Basic array operations |
| Array methods | ✅ | `push`, `join`, `slice`, `toString` |
| **Functions** |  |  |
| Function declarations | ✅ | Transpiled to Go functions |
| Arrow functions | ✅ | Transpiled to anonymous functions |
| **Classes & Interfaces** |  |  |
| Classes | ✅ | Transpiled to Go structs with constructor and receiver methods |
| Class inheritance | ✅ | `extends` via embedded structs, `super()` supported |
| Interfaces | ✅ | Transpiled to Go interfaces, supports `extends` |
| Generics | ✅ | Type parameters on functions and classes via Go generics |
| **Async** |  |  |
| Async/Await | ✅ | `async` functions return Go channels, `await` reads from channels |
| Promises | ✅ | `new Promise` transpiled to channel + goroutine pattern |
| setTimeout | ✅ | Mapped to Go's `time.AfterFunc` |
| **Built-in Functions** |  |  |
| console.log | ✅ | Mapped to `fmt.Println` |
| console.time/timeEnd | ✅ | Performance measurement via `time.Now` / `time.Since` |
| assert | ✅ | Transpiled to `panic` on failure |
| parseInt / parseFloat | ✅ | Mapped to Go's `strconv` package |
| **Math Methods** |  |  |
| Math.random | ✅ | Mapped to `rand.Float64()` |
| Math.floor / ceil / round | ✅ | Mapped to `math.Floor`, `math.Ceil`, `math.Round` |
| Math.abs / sqrt / pow | ✅ | Mapped to corresponding `math` functions |
| Math.min / max | ✅ | Mapped to `math.Min`, `math.Max` |
| **String Methods** |  |  |
| toUpperCase / toLowerCase | ✅ | Via `strings` package |
| trim / trimStart / trimEnd | ✅ | Via `strings` package |
| split / includes / indexOf | ✅ | Via `strings` package |
| startsWith / endsWith | ✅ | Via `strings` package |
| replace / replaceAll | ✅ | Via `strings` package |
| charAt / substring / slice | ✅ | Direct Go string indexing/slicing |
| concat / repeat / toString | ✅ | String concatenation and `strings.Repeat` |
| **Unsupported Features** |  |  |
| Modules/Imports | ❌ | Not yet implemented |
| Try/Catch | ❌ | Not yet implemented |

TypeNative is currently in early development and new features are being added regularly.