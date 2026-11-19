# Go Interoperability (`go:*`)

TypeNative lets you import any Go standard library package directly from TypeScript using the `go:` import prefix. The full Go standard library is declared for TypeScript type-checking in [types/typenative-go.d.ts](../types/typenative-go.d.ts) (included via `"types": ["typenative/go"]` in `tsconfig.json`), with 154 packages probed in [conformance.md](../conformance.md#go-bridges-gostar).

## Basic Usage

```ts
import { Println, Sprintf } from 'go:fmt';
import { ToUpper } from 'go:strings';

Println(Sprintf('Hello, %s!', ToUpper('world')));
```

Namespace imports also work:

```ts
import * as time from 'go:time';

const now = time.Now();
console.log(now.Format(time.RFC3339));
```

Side-effect imports emit Go blank imports (`import _ "time/tzdata"`):

```ts
import 'go:time/tzdata';
```

## Bridge Semantics

### Numbers & Precision

- All Go integer and floating-point types (`int`, `int32`, `int64`, `uint`, `float32`, `float64`, …) map to TypeScript `number`.
- Arguments convert automatically to the expected Go numeric type (`T(x)`), and return values convert back to `float64`.
- Note that `int64` / `uint64` values beyond ±2⁵³ lose precision when converted to `number`.
- Named numeric constants (e.g., `time.Second`, `reflect.String`) retain their Go type; arithmetic and `===` coerce the `number` side (`time.Second * 2`).

### Error Handling (`GoError`)

- Go functions returning `(T, error)` automatically unwrap to `T` and throw a `GoError` when `err != nil`.
- Go functions returning only `error` throw a `GoError` when called as a statement, and return the error value (or `null`) when used in expression/value position.

### Multi-Value Returns (Tuples)

Go multi-value returns pack into TypeScript tuples so destructuring works naturally:

```ts
import * as strings from 'go:strings';

const [before, after, found] = strings.Cut('key=value', '=');
```

### Structs, Methods & Type Annotations

- Construct Go structs with `new pkg.Type({ ... })` (compiled to a Go composite literal—pointer when any method requires a pointer receiver).
- Fields can be read and mutated directly (`h.Size += 1`), including promoted fields from embedded structs.
- Use `pkg.Type` in TypeScript type annotations (`let d: dwarf.Data | null = null`).
- `null` passes as Go `nil`, and `x === null` compiles to a real `nil` check on pointers, slices, maps, and interfaces.

### Implementing Go Interfaces

Passing a TypeScript class instance where a Go function expects a Go interface (such as `sort.Interface` or `heap.Interface`) automatically generates a Go adapter struct with the exact Go method signatures (converting `number` ↔ `int`, etc.). The class must implement every method of the interface (inherited methods count).

### Callbacks & Generics

- Functions passed to Go callback parameters or struct fields compile to Go closures with the exact Go signature. Callbacks returning `(T, error)` return `T` and a `nil` error.
- Go generic functions infer type arguments from call arguments, including through type constraints (e.g., `maps.Keys(m)`).

### `printf` Format Verbs

When passing a string literal format to `fmt.Printf` / `fmt.Sprintf` / etc., `number` arguments matching `%d`, `%x`, `%o`, `%b`, `%c`, or `%U` automatically convert to `int64`.

### Channels (`chan<T>`) & Iterators

Create and use Go channels with the built-in `chan<T>(size?)` helper (`GoChan<T>`):

- `ch.send(val)` — send a value
- `ch.recv()` — receive a value
- `ch.close()` — close the channel
- `for (const v of ch)` — range over a channel, `iter.Seq`, or `iter.Seq2` (`for (const [k, v] of seq2)`)

### Out-Parameters (`ref<T>`)

When a Go API expects a pointer to populate (out-parameter), wrap a value with `ref<T>(init?)` and read/write `.value`:

```ts
import { Sscanf } from 'go:fmt';

const n = ref(0);
Sscanf('42', '%v', n);
console.log(n.value); // 42
```

### Byte Slices & Maps

- Go `[]byte` maps to `Uint8Array` (zero-copy). Passing a `number[]` copies per call.
- A TypeScript `Record<K, V>` passes to a Go `map[K]V` of matching key/value types (as a copy).

### Embedding Files (`//go:embed`)

Import `embed` from `go:embed` to embed static files into the compiled binary at compile time:

```ts
import * as embed from 'go:embed';

const page = embed.string('./page.html');
const icon = embed.bytes('./icon.png');
const assets = embed.files('./assets/*'); // embed.FS
```

Rules for `embed.*`:
- Must be a top-level variable initializer with string literal path/pattern arguments.
- Paths are relative to the declaring file and must stay inside the entry file's directory.
- The CLI automatically copies matched files alongside the generated Go sources before building.

### Coverage (`go:runtime/coverage`)

Build with `--cover` to enable Go coverage counters (`-cover -covermode=atomic`) and access `go:runtime/coverage` APIs at runtime. Set `GOCOVERDIR` to write coverage profiles on exit.

## Unavailable Go Packages (`🚫`)

Because TypeNative compiles without cgo and without raw memory addresses:

- `go:unsafe` — raw pointer arithmetic
- `go:plugin` — requires cgo
- `go:runtime/cgo` — requires cgo
- `go:runtime/race` — race detector requires cgo

## Regenerating Go Type Declarations

If you are contributing to TypeNative and want to update `types/typenative-go.d.ts` and the Go table in `conformance.md` for a newer Go version, run:

```sh
npm run gen:go
npm run check:go-types
```

Never edit `types/typenative-go.d.ts` by hand.
