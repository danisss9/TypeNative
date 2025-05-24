# TypeNative

Build native applications using Typescript.

## PreRequisites

- Go 1.21 or newer.

## Get Started

- Write a file `test.ts` with content `console.log('Hello World!');` or any other message
- Run `npx typenative --source test.ts --script`
- See your message in the terminal

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
| **Variables** |  |  |
| Variable declarations | ✅ | `let` and `const` |
| **Operators** |  |  |
| Arithmetic operators | ✅ | `+`, `-`, etc. |
| Comparison operators | ✅ | `==`, `!=`, etc. |
| Logical operators | ✅ | `&&`, `\|\|` |
| Increment/Decrement | ✅ | `++`, `--` |
| **Control Flow** |  |  |
| For loops | ✅ | Standard `for` loops |
| For...of loops | ✅ | Iteration over arrays |
| While loops | ✅ | Transpiled to Go's `for` loops |
| Do...while loops | ✅ | Implemented with conditional break |
| If/Else statements | ✅ | Fully supported |
| Switch statements | ✅ | Case and default statements |
| **Data Structures** |  |  |
| Arrays | ✅ | Basic array operations |
| Array methods | ✅ | `push` supported |
| **Functions** |  |  |
| console.log | ✅ | Mapped to `fmt.Println` |
| console.time/timeEnd | ✅ | Performance measurement |
| Math.random | ✅ | Mapped to Go's `rand.Float64()` |
| Math.floor | ✅ | Mapped to Go's `math.Floor()` |
| **Unsupported Features** |  |  |
| Classes | ❌ | Not implemented |
| Interfaces | ❌ | Not implemented |
| Functions | ❌ | Custom function definitions not supported |
| Arrow Functions | ❌ | Not implemented |
| Async/Await | ❌ | Not implemented |
| Modules/Imports | ❌ | Not implemented |
| Generics | ❌ | Not implemented |

TypeNative is currently in early development and new features are being added regularly.