# Standard Library & Web Globals

TypeNative provides a built-in JavaScript and Web standard library declared in [types/typenative.d.ts](../types/typenative.d.ts) and lowered to Go runtime helpers. Everything listed here is available globally without imports (unless noted).

For per-method status and test probes, see [Standard library in conformance.md](../conformance.md#standard-library).

## Core Built-ins

### `console` & `assert`

- `console.log`, `console.error`, `console.warn`, `console.info`, `console.debug`, `console.dir`, `console.table`, `console.trace`
- `console.time` / `console.timeEnd` / `console.timeLog`, `console.count` / `console.countReset`, `console.group` / `console.groupEnd`, `console.assert`
- Global `assert(condition, message?)` — panics on failure (can be shadowed by a local or imported `assert` binding).

### `Array` & Iterators

- Mutating: `push`, `pop`, `shift`, `unshift`, `splice`, `reverse`, `sort` (with comparator or default lexicographic), `fill`, `copyWithin`
- Non-mutating & ES2023+ change-by-copy: `slice`, `concat`, `toSorted`, `toReversed`, `toSpliced`, `with`, `flat`, `flatMap`, `join`
- Iteration & search: `map`, `filter`, `reduce`, `reduceRight`, `forEach`, `some`, `every`, `find`, `findLast`, `findIndex`, `findLastIndex`, `includes`, `indexOf`, `lastIndexOf`, `at`, `keys`, `values`, `entries`
- Statics: `Array.isArray`, `Array.from`, `Array.of`, `new Array<T>(length)`
- ES2025 Iterator Helpers (`Iterator.from`, `.map`, `.filter`, `.take`, `.drop`, `.flatMap`, `.reduce`, `.toArray`, `.forEach`, `.some`, `.every`, `.find`)

### `Object` & `Reflect`

- `Object.keys`, `Object.values`, `Object.entries`, `Object.fromEntries`, `Object.assign`, `Object.hasOwn`, `Object.is`, `Object.create`, `Object.defineProperty`, `Object.getOwnPropertyNames`, `Object.getOwnPropertySymbols`, `Object.getOwnPropertyDescriptor`, `Object.groupBy`
- Integrity: `Object.freeze`, `Object.seal`, `Object.preventExtensions`, `Object.isFrozen`, `Object.isSealed`, `Object.isExtensible`
- `Reflect`: `get`, `set`, `has`, `deleteProperty`, `ownKeys`, `construct`, `apply`, and related dynamic operations

### `String`

- Slicing & splitting: `slice`, `substring`, `split`, `at`, `charAt`, `charCodeAt`, `codePointAt`, `String.fromCharCode`, `String.fromCodePoint`, `String.raw`
- Searching & matching: `indexOf`, `lastIndexOf`, `includes`, `startsWith`, `endsWith`, `search`, `match`, `matchAll`
- Transforming: `replace`, `replaceAll`, `toLowerCase`, `toUpperCase`, `toLocaleLowerCase`, `toLocaleUpperCase`, `trim`, `trimStart`, `trimEnd`, `padStart`, `padEnd`, `repeat`, `normalize`, `localeCompare`

### `Number`, `Math` & `BigInt`

- `Number`: `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `isInteger`, `isSafeInteger`, `toFixed`, `toPrecision`, `toExponential`, `toString(radix)`, `toLocaleString`, constants (`MAX_SAFE_INTEGER`, `MIN_SAFE_INTEGER`, `MAX_VALUE`, `MIN_VALUE`, `EPSILON`, `POSITIVE_INFINITY`, `NEGATIVE_INFINITY`, `NaN`)
- `Math`: full standard library—`abs`, `ceil`, `floor`, `round`, `trunc`, `fround`, `sign`, `sqrt`, `cbrt`, `pow`, `exp`, `expm1`, `log`, `log2`, `log10`, `log1p`, `hypot`, `imul`, `clz32`, `min`, `max` (including spread), `random`, trig (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`), hyperbolic (`sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`), constants (`PI`, `E`, `LN2`, `LN10`, `SQRT2`, …)
- `BigInt`: `BigInt()`, `BigInt.asIntN`, `BigInt.asUintN`, arithmetic, exponentiation (`**`), bitwise/shift operators, and loose comparisons

### `Map`, `Set`, `WeakMap`, `WeakSet`

- `Map<K, V>`: `set`, `get`, `has`, `delete`, `clear`, `size`, `forEach`, `keys`, `values`, `entries`, `for...of`, `Map.groupBy` (insertion-ordered)
- `Set<T>`: `add`, `has`, `delete`, `clear`, `size`, `forEach`, `keys`, `values`, `entries`, `for...of`, plus ES2025 set methods (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`)
- `WeakMap` and `WeakSet`, plus `WeakRef` and `FinalizationRegistry` (backed by Go's `weak` package and `runtime.AddCleanup`, running callbacks on the event loop)

### `JSON`

- `JSON.parse` (with reviver support; fast typed decoding when assigned to a typed target)
- `JSON.stringify` (with replacer and indent/space support)

### `RegExp`

- Literals (`/pattern/flags`) and `new RegExp(pattern, flags)`
- Flags: `i`, `m`, `s`, `g`, `y`, `u`, `d`
- Methods & properties: `test()`, `exec()` (including named capture groups `.groups` and stateful `lastIndex`), `source`, `flags`, `global`, `ignoreCase`, `multiline`, `dotAll`, `sticky`, `unicode`
- **Dual engine:** Standard patterns run on Go's linear-time RE2 engine. Patterns using JS-only features that RE2 does not support (backreferences, lookahead, lookbehind) automatically run on TypeNative's built-in backtracking VM (`src/regex_vm.ts`).

### `Date`

- `new Date()`, `new Date(ms)`, `new Date(dateString)`, `new Date(y, m, d, ...)`
- `Date.now()`, `Date.UTC()`, `Date.parse()`
- Local and UTC getters/setters, `getTime`, `valueOf`, `getTimezoneOffset`, `toISOString`, `toDateString`, `toTimeString`, `toUTCString`, `toJSON`, `toLocaleString`

### `Temporal`

Full ISO 8601 `Temporal` API backed by Go's `time` and embedded `time/tzdata` (linked only into programs that use `Temporal`):

- `Temporal.Instant`, `Temporal.ZonedDateTime`, `Temporal.PlainDate`, `Temporal.PlainTime`, `Temporal.PlainDateTime`, `Temporal.PlainYearMonth`, `Temporal.PlainMonthDay`, `Temporal.Duration`, `Temporal.Now`
- Parsing, `with`, `add`, `subtract`, `until`, `since`, `round`, `total` (all rounding modes), `relativeTo`, DST disambiguation, `getTimeZoneTransition`, and `toString` options
- *Note:* Non-ISO calendars throw a `RangeError` (no ICU bundled).

### `Intl`

- `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.Collator`, `Intl.PluralRules`, `Intl.ListFormat`, `Intl.RelativeTimeFormat`, `Intl.Segmenter`, `Intl.DisplayNames`, `Intl.Locale`, `Intl.getCanonicalLocales`, `Intl.supportedValuesOf`, and `.toLocaleString()`
- Locale data is captured from Node's ICU (`npm run gen:intl`) for 32 locales; plural rules, collation, and case mapping use `golang.org/x/text` (offline vendored).

### `Promise`, Timers & Microtasks

- `new Promise((resolve, reject) => ...)`, `.then`, `.catch`, `.finally`
- `Promise.resolve`, `Promise.reject`, `Promise.all`, `Promise.race`, `Promise.allSettled`, `Promise.any`, `Promise.withResolvers`, `Promise.try`
- `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `setImmediate`, `clearImmediate`, `queueMicrotask`

### Errors & Symbols

- `Error`, `TypeError`, `RangeError`, `SyntaxError`, `ReferenceError`, `URIError`, `EvalError`, `AggregateError`, `DOMException`, `QuotaExceededError`
- `err.message`, `err.name`, `err.cause`, `err.stack` (mapped back to `.ts` file names and line numbers via Go `//line` directives)
- `Symbol()`, `Symbol.for`, `Symbol.keyFor`, `.description`, and well-known symbol protocols (`Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.dispose`, `Symbol.asyncDispose`, `Symbol.toPrimitive`, `Symbol.hasInstance`, `Symbol.toStringTag`)

---

## Binary Data, WebAssembly & Web Globals

### Typed Arrays & Binary Encoding

- `ArrayBuffer`, `DataView`, `Uint8Array`, `Int8Array`, `Uint8ClampedArray`, `Uint16Array`, `Int16Array`, `Uint32Array`, `Int32Array`, `Float32Array`, `Float64Array`, `BigInt64Array`, `BigUint64Array`
- `Buffer`, `TextEncoder`, `TextDecoder`, `atob`, `btoa`
- `Uint8Array` hex/base64 helpers (`toHex`, `fromHex`, `toBase64`, `fromBase64`)

### `WebAssembly`

Runs on **[wazero](https://github.com/tetratelabs/wazero)** (pure Go, no cgo; optimizing compiler on `amd64`/`arm64`, interpreter elsewhere; linked only when used):

- `WebAssembly.validate`, `compile`, `instantiate`, `compileStreaming`, `instantiateStreaming`
- `WebAssembly.Module` (`imports`, `exports`, `customSections`), `WebAssembly.Instance`, `WebAssembly.Memory` (`buffer`, `grow`), `WebAssembly.Global` (`value`, `valueOf`), exported/imported `WebAssembly.Table`
- `CompileError`, `LinkError`, `RuntimeError`
- Works seamlessly with `node:wasi` (`WASI` preview1 and unstable).

### Networking & Web APIs

- **Fetch API:** `fetch`, `Headers`, `Request`, `Response`, `FormData`, `Blob`, `File`
- **WebSocket:** RFC 6455 `WebSocket` client over `net`/`tls` (text, `Blob`, `ArrayBuffer`, subprotocols, custom headers, close handshake)
- **URLs:** `URL`, `URLSearchParams`, `URLPattern`, `encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`
- **Web Streams:** `ReadableStream`, `WritableStream`, `TransformStream`, `ByteLengthQueuingStrategy`, `CountQueuingStrategy`, `TextEncoderStream`, `TextDecoderStream`, `CompressionStream`, `DecompressionStream`
- **Events & Abort:** `EventTarget`, `Event`, `CustomEvent`, `ErrorEvent`, `AbortController`, `AbortSignal`
- **Messaging:** `MessageChannel`, `MessagePort`, `BroadcastChannel`
- **Storage & Environment:** `localStorage` (persisted as JSON when `TN_LOCALSTORAGE_FILE` is set), `sessionStorage`, `Storage`, `navigator` (`hardwareConcurrency`, `language`, `languages`, `platform`, `userAgent`), `performance`, `crypto`, `structuredClone`, `globalThis`, `process`, `__filename`, `__dirname`
