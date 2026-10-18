# Changelog

All notable changes to TypeNative will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The Go standard-library bridge (`go:*` imports) goes from 73 to 154 probed packages, with 16
left typed-only and 6 excluded. Most of the new coverage came with bridge fixes found by the
probes: callbacks, generics, tuples, struct fields and constants now behave the way the
generated types say they do.

### Added

- **Go probes**: compress (flate, zlib, lzw, bzip2), archive/tar, encoding (json, base32,
  ascii85, asn1), mime/quotedprintable, unicode/utf16, hash (adler32, crc64, maphash), crypto
  (sha3, hkdf, pbkdf2, des, rc4, fips140, ecdh, ecdsa, elliptic, mlkem, mlkemtest, x509, pkix,
  tls metadata, dsa, hpke), fmt, path, io/fs, io/ioutil, maps, iter, unique, weak, structs,
  image (color, palette, draw, gif, jpeg), go/* (parser, ast, scanner, printer, constant,
  build, build/constraint, doc, doc/comment, types, importer), html/template,
  text/template/parse, regexp/syntax, reflect, net (loopback TCP, textproto, cookiejar,
  httputil, httptrace, pprof, cgi), runtime (metrics, pprof, trace), time/tzdata, os/user,
  debug/buildinfo, math/big, testing (testing, fstest, iotest, quick), database/sql (+driver),
  syscall
- **Go generics**: type args are inferred recursively from the arguments and through constraint
  core types (`Map ~map[K]V`); callback params of generic functions and methods on generic
  receivers (`unique.Handle[T].Value`) are concrete
- **Go callbacks**: TS closures passed to Go (params or struct fields) get the exact Go
  signature — int params read as numbers, block bodies work, returns convert to the result type
- `for (const [k, v] of seq2)` over `iter.Seq2`; destructuring multi-value Go calls types each
  element; printf-style calls pass numbers to `%d %x %o %b %c %U` as `int64`
- `String.indexOf(search, fromIndex)`
- `npm run check:go-types` type-checks the `go:*` probes against `types/typenative-go.d.ts`
- **Node networking**: `node:net` (TCP / Unix servers and sockets as duplex streams, Node's
  `ECONNREFUSED`-style errors, `isIP`), `node:dns` (+ `dns/promises`), `node:http` /
  `node:https` (servers on `net/http`, `request` / `get`, `STATUS_CODES`, `METHODS`),
  `node:tls` (Node's certificate checks and error codes, `getPeerCertificate`), `node:dgram`,
  and the global `fetch` with `Headers` / `Request` / `Response`
- **`node:async_hooks`**: `AsyncLocalStorage` and `AsyncResource`; the event loop carries an
  async context through timers, `nextTick`, microtasks, promise callbacks, awaits, fs / dns
  callbacks, streams and servers
- **`node:test`**: `test` / `describe` / `it` with hooks, subtests, skip / todo, timeouts and
  `mock.fn`; Node's TAP (or, on a terminal, spec) report and exit code
- **`node:worker_threads`**: workers re-run the program as child processes linked over
  loopback TCP (structured-clone messages, `workerData`, `terminate`, errors), plus
  `MessageChannel` / `MessagePort` / `BroadcastChannel`; globals `__filename` / `__dirname`
- `new Promise((resolve) => setTimeout(resolve, ms))`: `resolve` / `reject` can be passed as
  values
- **`node:stream/web`**: `ReadableStream` / `WritableStream` / `TransformStream` with readers,
  writers, controllers, queuing strategies, `tee` / `pipeTo` / `pipeThrough` and `for await`;
  `TextEncoderStream` / `TextDecoderStream`, `CompressionStream` / `DecompressionStream` (also
  globals); `Readable.toWeb` / `fromWeb` & co. and `stream.compose`
- `Blob` / `File` (`node:buffer` and globals) and `FormData`; fetch streams bodies
  (`response.body`, `ReadableStream` uploads), sends Blob / FormData bodies and reads
  `blob()` / `formData()`
- `TextDecoder#decode(bytes, { stream: true })`
- **`node:crypto`**: `scrypt` / `scryptSync`; callback forms of `pbkdf2`, `hkdf`,
  `randomBytes`, `randomFill`; `KeyObject` with `createPrivateKey` / `createPublicKey` /
  `createSecretKey` and PEM / DER / JWK import and export; `generateKeyPair(Sync)` (RSA, EC,
  Ed25519, X25519) and `generateKey(Sync)`; `sign` / `verify`, `createSign` / `createVerify`
  (PKCS#1 v1.5, PSS, ECDSA DER / P1363, Ed25519); `publicEncrypt` & co.; ECDH and classic
  Diffie-Hellman (MODP groups); `generatePrime` / `checkPrime`; `X509Certificate`; and
  `crypto.subtle` (digest, keys, sign / verify, AES-GCM / CBC / CTR, RSA-OAEP, PBKDF2 / HKDF /
  ECDH / X25519 derivation, wrap / unwrap)
- **`child_process.fork`** with an IPC channel (`send` / `'message'` / `disconnect`;
  `process.send` / `process.on('message')` in the child) and **`node:cluster`**: workers share
  listening ports through the primary, which relays connections round-robin; cluster and worker
  events, `disconnect`, `setupPrimary`
- **`node:http2`** on `net/http`'s HTTP/2: h2c and TLS servers with the `'stream'` API
  (`respond`, `respondWithFile`) and the compatibility `(req, res)` API; `connect()` client
  sessions whose `request()` streams emit `'response'` with `:status`
- `path.matchesGlob`; Buffer `read/writeBig(U)Int64LE/BE`, `swap16/32/64`, `buffer.isUtf8` /
  `isAscii` / `transcode`; `util.parseArgs`, `getSystemErrorName` / `Message` / `Map`,
  `MIMEType`, `parseEnv`, `aborted`, `debuglog`, `toUSVString`; `process.loadEnvFile`
- `process.on('uncaughtException' | 'uncaughtExceptionMonitor' | 'unhandledRejection' |
  'beforeExit')`, `process.cpuUsage` / `resourceUsage` / `availableMemory`; `os.totalmem` /
  `freemem` / `uptime` / `loadavg` / `release` / `version`; timer handles with `ref` / `unref` /
  `hasRef` / `refresh` / `close`; `PerformanceObserver`, `performance.timerify` /
  `eventLoopUtilization`, `createHistogram`, `monitorEventLoopDelay`; `events.errorMonitor`,
  `captureRejections`, static `getMaxListeners` / `setMaxListeners`, `addAbortListener`
- zlib callback forms (`gzip(buf, [options], cb)` & co.) and `util.promisify` of them;
  `readline.cursorTo` / `moveCursor` / `clearLine` / `clearScreenDown`;
  `diagnostics_channel.tracingChannel` (`traceSync` / `tracePromise` / `traceCallback`) and
  `channel.bindStore` / `runStores`; `net.BlockList` / `SocketAddress`; `dns.Resolver` (own
  servers, `timeout`, `cancel`), `setServers`, `lookupService`; `tls.checkServerIdentity` (and
  the `connect` option); HTTP `'upgrade'` / `'connect'` on servers and clients; node:test
  `t.assert` and `mock.timers`; `console.table`

### Fixed

- **Go types**: void functions were typed as returning `GoError`; params now accept what the
  bridge converts (`number[]` for `[]byte`, one-char strings for `byte`/`rune`, `null` for
  nil-able types, an array for variadics, an optional trailing `error`); pointers to basics are
  `GoRef<T>`; typed constants keep their named type; aliases resolve (`os.FileMode`); named
  slice/map types keep their methods (`net.IP`); `iter.Seq` is iterable; unimportable
  `*/internal` packages are dropped and `runtime/cgo` is excluded
- **Go bridge**: path-qualified types (`net/http.Cookie`) are localized and imported; unused
  type-only imports are dropped and `import 'go:pkg'` emits `import _`; field reads/writes
  convert numbers on any receiver; `null` comparisons on nil-able Go values are real nil checks;
  `===` with typed constants coerces; `ref<T>().value` dereferences; `json.Unmarshal` fills a
  `Record` ref
- `npm run gen:go` runs from the repo root again
- The self-hosted compiler (`npm run build:native`) builds again; the `src/go/*` modules are
  transpilable by TypeNative
- Object literals whose keys aren't identifiers (`{ 'Content-Type': … }`) compile (as records)
- `const { a, b } = f()` evaluates `f()` once
- `await` inside async arrow callbacks no longer blocks the event loop (every `await` goes
  through `TnAwait`)
- `JSON.parse` assigned to an interface type converts into its struct (it was `nil`); typed
  callback parameters accept decoded JSON-like values
- `for await` over a stream that errors throws the error (it ended the loop silently)
- `const { value, done } = obj` on Node class instances types the bindings (and reads
  accessors); `x as File` asserts dynamic values to Node classes
- `Response#clone()` of a network body no longer blocks the event loop (both copies stream it)
- The self-hosted compiler no longer crashes on `const [a, b] = call()`
- A detached top-level async call with arguments (`run(a, b);`) passes them (they were dropped)
- A function that only returns `undefined` compiles (its result type was `nil`)
- `gunzip` of data without a gzip header fails with `incorrect header check`, as in Node
- Negative bigint literals and `-x` on bigints; hex / octal / binary bigint literals;
  `p.then(() => …)` on a `Promise<void>`; `JSON.stringify` of records keeps their keys (it
  printed the map's internals); `String(x)` / template literals use a Node class's `toString()`
- Top-level variables named like an imported Go package (`rsa`, `pem`, `encoding`, `http`, …) are
  renamed instead of clashing with it; `bigint.toString(radix)`; `ArrayBuffer` annotations and
  `byteLength` on Buffers
- `(c) => (body += c)` arrow bodies; `console.log(x?.y)` prints optional strings / numbers
  without quotes; the self-hosted compiler no longer crashes on `console.log` arguments of
  unknown type

## [0.1.3] - 2026-10-15

Decorators and JSX arrive alongside a broad language-surface expansion (`using`, `new.target`,
`for await`, namespaces, dynamic `import()`), and `types/typenative.d.ts` grows into a complete
lib replacement. The conformance suite grows to 241 probes — including its first `.tsx` probe —
and passes fully through the dev CLI.

### Added

- **Language**: `using` declarations — `[Symbol.dispose]()` runs when the enclosing block or
  function exits, in reverse declaration order; `new.target` (constructors pass the target class
  name through `super()` chains); `for await...of`; the `arguments` object; namespaces; computed
  and heterogeneous enums; callable/construct signatures (`type F = { (): void }` — a class passed
  as a value is its constructor); ambient declarations (`declare const` / `declare function` /
  `declare module`); string, numeric and boolean literal types (single literals, unions,
  literal-union `Record` keys)
- **Decorators**: standard method and class decorators — decorator factories (`@tag('x')`),
  stacked decorators, static methods — applied where the class is defined; `this` in the wrapper
  is the decorated method's receiver; `f.call` / `f.apply`
- **JSX**: `.tsx` files render JSX to HTML strings — text is escaped, void tags self-close
  (`<br/>`), components are called with their props, `className` maps to `class`, boolean
  attribute shorthand (`disabled`) and fragments flatten; both parsers take a tsx flag and
  `.tsx` imports resolve
- **Modules**: re-exports (`export { x } from './y'`), side-effect imports (`import './x'`),
  dynamic `import()` (async), `import x = require('y')`; top-level statements of imported
  modules execute through a generated `init()`
- **Typing**: rest-parameter function types `(...args: T[]) => R` become variadic Go func types
- **Library**: `String.normalize` — backed by `golang.org/x/text/unicode/norm`, vendored from
  GOROOT's vendor tree via a `replace` in `dist/go.mod`, so builds need no network; object
  literals of method-bearing interfaces; `new Set([...spread])`
- **Type definitions**: `types/typenative.d.ts` expands by ~500 lines — `Generator`/`AsyncGenerator`
  and the `Iterable`/`AsyncIterable` families, `Disposable`, `Awaited`, `TemplateStringsArray`,
  `ArrayLike`, real mapped types for `Partial`/`Required`/`Readonly`/`Pick`/`Omit`/`Record`,
  `RegExpExecArray`, constructor interfaces (`Array`/`String`/`Number`) and the `JSX` namespace
- **Project config**: `types/tsconfig.json` — a standalone `lib: []` project for the
  lib-replacement d.ts, so editors don't load es5 libs alongside it (TS6200, duplicate identifiers)

### Changed

- The conformance runner picks up `.tsx` probes; scaffolds pin `typenative ^0.1.3`; `dist/`
  cleanup also removes stale `go.mod`/`go.sum`
- Both parsers emit `declarationKind` (`var`/`let`/`const`/`using`/`await using`) on variable
  declaration lists; tsparser takes `--tsx` and emits `JsxText`
- README rewritten: requirements, quick start, CLI reference, and expanded language/stdlib tables

## [0.1.2] - 2026-10-13

The type system and standard library catch up with the conformance matrix: generics gain
constraints, defaults and generic interfaces; utility types, `keyof`/`typeof`, intersections,
conditional types and mapped types lower to Go; Promise, timer, Object, collection and math
built-ins round out. The conformance suite grows to 219 probes (including 15 for rows that
already worked — `console.error`/`warn`, `Map`/`Set.clear`, `node:url`, `process.cwd`, `split`
with a RegExp, access modifiers, `const enum`, `import type`, indexed access types, literal
types, hex/octal/binary literals, `override`, template literal types, `var`) and passes fully
through the dev CLI; the stage-1/stage-2 bootstrap fixpoint holds.

### Added

- **Generics**: constraints (`T extends U`), defaults (`T = U`), generic interfaces, class
  expressions, index signatures, `keyof` and mapped types
- **Type operators**: `keyof T`, `typeof x`, `readonly T[]`, intersections `A & B` (merged into
  one struct), conditional types (`T extends U ? X : Y`) with `infer`, `void`/`never`/`object`,
  the `void` operator, `satisfies`
- **Utility types**: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `NonNullable` (lowered to
  the base type)
- **Language**: async generators (`async function*` driven by `for await`), labeled tuple
  elements with optional and rest members (`[x: number, y?: string, ...rest: number[]]`),
  overload signatures, `this: T` parameters, `asserts x is T`, optional call `f?.()` (checks the
  function value; the result is nullable), comma-separated declarators/updates in `for` headers
  (`for (let i = 0, j = 10; …; i++, j--)` via Go's parallel forms), import renaming
  (`import { a as b }`), `static { … }` blocks → `func init()`, self-referencing arrow functions
  (`const f = (…) => … f(…) …`)
- **Promises & timers**: `Promise.prototype.reject`/`catch`/`finally`, combinators
  `race`/`allSettled`/`any`, `Promise.resolve`; `setTimeout` returns a handle that `clearTimeout`
  stops; `setInterval`; `queueMicrotask`
- **Objects**: `Object.hasOwn`, `Object.defineProperty`, `Object.fromEntries`, integrity methods
  (`freeze`/`seal`/`preventExtensions`)
- **Collections**: `WeakMap`/`WeakSet`; ES2024 `Set` operations (`union`, `intersection`,
  `difference`, `isSubsetOf`, …); array `concat` (flattens one level), `copyWithin`, `toSpliced`,
  `toSorted`, `toReversed`, `with`, `reduceRight`; `any` receivers accept the newer array methods
  through array-only method casts
- **Strings, numbers, regex**: `String.raw`, `toPrecision`, `String()`/`Boolean()` with JS
  formatting and truthiness; regex `y`/`u` flags and `.source`/`.flags`
- **Globals**: `globalThis`, `structuredClone`, `isFinite`, `encodeURIComponent`/
  `decodeURIComponent`; `Math` constants (`PI`, `E`, `SQRT2`, …) and `hypot`/`cbrt`/`expm1`/
  `log1p`/hyperbolics/inverse trig/`atan2`
- **Date**: `getUTC*` getters and `Date.UTC`
- **Semantics**: functions stored in `Record`s are called as values — `rec.fn(args)` lowers to
  `rec.Get("fn")(args)` (previously dispatched as a built-in method, so `handlers.sort(x)` ran an
  array sort); names that are also JS `Map` methods stay Map methods unless the receiver is typed
  as a `Record`; dynamic `obj[key] = v` writes; mixed array literals (`[['a', 1]]`) become
  `[]interface{}`

### Changed

- tsparser emits the raw text of template literals

### Fixed

- `JSON.stringify` no longer HTML-escapes `<`, `>`, `&` in the reflection path (`json.Marshal`
  produced `\u003c`); stage 1 and stage 2 of the bootstrap generate identical Go again
- `Date.toISOString` printed the month twice (`2006-01-01` instead of `2006-01-02`)
- `??` passed to a nullable parameter is boxed; object literals nested in dynamic objects stay
  dynamic; shorthand properties (`{ x }`) read narrowed variables correctly

## [0.1.1] - 2026-10-10

The conformance suite is fully green: all 147 probes pass (up from 95/147), through both the dev
CLI (`node bin/cli.js`) and the self-hosted native compiler (`npm run conformance -- --native`).

### Added

- **Language**: array/object destructuring with defaults and elision, computed keys, `for...in`,
  labeled loops (`continue outer` / `break outer`), `as const`, type guards (`p is T`),
  generators (`function*` / `yield` / `yield*`) and `*[Symbol.iterator]()` custom iterators,
  `async`/`await` with `new Promise`, `.then` and `Promise.all` (lowered to goroutines over
  channels, with pending callbacks and timers drained before exit), `setTimeout`
- **Modules**: `import.meta.url` — the `file://` URL of the running program
  (`os.Executable` through the `pathToFileURL` lowering)
- **Classes**: inheritance with `super` (methods copied onto subclasses for `this` dispatch),
  abstract classes, `#private` fields, static members typed from initializers, getters/setters
  (`c.v` reads/writes rewrite to `Get_v()`/`Set_v()`), interface `extends` (inherited properties
  flattened into the derived struct), object-literal methods and getters
- **Errors**: `throw new Error` / `new Error(message)` produce a real error value — custom error
  classes via `extends Error`, `instanceof` and `.message` on caught values
- **Typing**: generic functions via Go generics (call sites infer type arguments), numeric enums
  as plain numbers, tagged templates, JS loose equality (`0 == false`) with `bool`/number/string
  coercion, `p is T` predicates returning `bool`
- **Runtime values**: `bigint` (`2n ** 64n` etc. via `math/big`) and `symbol` (unique pointers,
  usable as record keys)
- **Library**: array `splice`, `fill`, `entries`, `flatMap`, `findLast`/`findLastIndex`,
  `lastIndexOf`, `new Array<T>(n)`, `Array.from`, `join()` defaulting to `","`, in-place
  `reverse`; `charCodeAt`/`String.fromCharCode`/`localeCompare`; `Date` (`new Date(ms)`,
  `getTime`, `toISOString`, `Date.now()`); `Object.assign`; `.length` counts UTF-8 code points
  and `[...str]` spreads runes
- **Regex**: `/g` regexes carry `lastIndex` state (`re.exec` loops terminate); named groups
  (`(?<name>` → `(?P<name>`, `exec` returns a match with `.groups`); backreferences and
  lookbehind/lookahead run on a small backtracking engine (RE2 does not support them)
- **Semantics**: arrays are references — `const b = a; b.push(3)` is visible through `a`
  (array variables hold `*[]T`)

### Changed

- `JSON.stringify` serializes through reflection, so unexported (auto-generated) struct fields
  are included
- `Object.assign` copies sources (structs, maps, dynamic objects) into an ordered map
- `throw` panics with a `TnError` value carrying `.message` instead of a bare string

## [0.1.0] - 2026-10-09

TypeNative compiles itself: `src/main.ts` builds into a native `typenative` binary that passes the
whole test suite and regenerates its own Go source identically (stage-1/stage-2 bootstrap).

### Added

- **Native compiler**: `npm run build:native` builds `native/typenative` and `native/tsparser`
- **`any` / `unknown` at runtime**: property and index access, truthiness, equality (objects by
  identity), method calls, spreads and conversions to typed values via a small Go runtime
  (`TnGet`, `TnSet`, `TnAs`, …) — no guessed types
- **Language**: object spread, `??=`, `in`, `typeof`, `continue`, optional and destructured
  parameters, constructor parameter properties, `return` inside `try`/`catch`, object type
  aliases and inline object types → Go structs, `Record<K, V>` and dictionaries → Go maps
- **Typing**: contextual types for object/array/function literals, narrowing of `T | undefined`,
  JS truthiness, `??` chains, nullable ternaries, optional chains across calls
- **Library**: `toFixed`, `Math.max(...arr)`, `sort` with comparators, `flat`, typed
  `Object.keys`/`values`, regex `replace` (`/g`, `$1`/`$&`, function replacers), `match`/`split`
  with regexes, `Array.isArray`, `console.warn`, `fs.unlinkSync`, `process.env['X']`
- Tests 33–50

### Changed

- **Go 1.23 or newer is required** (generated code uses `slices`/`maps` iterator helpers)
- `process.platform` reports Node's names (`win32`, `darwin`, `linux`)
- `JSON.stringify` no longer escapes `<`, `>`, `&` (like JS)
- Out-of-range array/string reads give zero values instead of panicking (JS `undefined`)
- Imports and helpers are emitted in sorted order
- Map, Set and Record keep insertion order (like JS); objects are references (Go pointers)

### Fixed

- The test suite never ran (scripts called `bin/index.js`, which has no entry point); it now runs
  through `bin/cli.js`
- Phase 3c regressions (19 tests): AST kind names, missing parent links, `extends` detection
- Main-file top-level variables were invisible to functions
- `spawnSync` with `stdio: 'inherit'` dropped its arguments

## [0.0.21] - 2026-09-06

Self-hosting milestone: the compiler no longer depends on `execa`, `fs-extra`, or `nanoid`, and the
TypeScript parser is decoupled behind an injectable, normalized JSON AST — produced either by the
`typescript` npm package (dev CLI) or by the new Go-native `tsparser` tool (self-hosted binary).
Verified: all 33 test specs transpile identically through both parser paths, and the compiler now
transpiles its own source all the way to `go build`.

### Added

- **`node:fs` mappings**: `readFileSync`, `writeFileSync`, `appendFileSync`, `existsSync`, `mkdirSync`, `readdirSync`, `copyFileSync`, `rmSync` → Go helpers (`TnReadFile`, `TnWriteFile`, …)
- **`node:url` mappings**: `fileURLToPath`, `pathToFileURL`
- **`node:os` mappings**: `platform` (returns `win32`/`darwin`/linux like Node), `homedir`, `tmpdir`
- **`node:child_process` mappings**: sync `exec`/`execSync`/`spawnSync` shaped like Node's `spawnSync` (`{ stdout, stderr, status }`); `{ stdio: 'inherit' }` runs with the parent's stdio (`TnRunInherit`); `{ input }` pipes stdin (`TnExecInput`)
- **`node:readline` mapping**: synchronous `question(prompt)` for interactive native prompts (`TnQuestion`, single buffered stdin reader)
- **`process.env.X`** → `TnGetenv("X")`
- **Go helper registry**: node-stdlib helpers are emitted once into the main output file with correct per-file import scoping (helpers register their Go packages lazily; import lists are computed after function bodies are visited)
- **`tsparser/` Go tool**: parses TypeScript via `github.com/buke/typescript-go-internal` (native Go port of the TypeScript parser — no embedded JS runtime) and emits a normalized JSON AST with TypeScript-API kind and field names
- **`src/parse-node.ts`**: Node adapter producing the identical JSON AST from the `typescript` npm package; verified byte-identical against `tsparser` on all test specs and all compiler sources
- **`src/parse-native.ts`**: self-hosted parser client (spawns the `tsparser` binary, `TYPENATIVE_TSPARSER` env override)
- **Injectable parser**: `transpileToNative(code, { parse, readFile })` — the transpiler no longer imports `typescript`
- **Unbraced `if`/`else if`/`else` statements**: single-statement branches now emit valid Go blocks
- **`%` and `%=` on numbers** → `math.Mod`
- **`./x.js` → `x.ts` import resolution** for ES-style relative specifiers
- **Tests 31–32**: node-stdlib end-to-end spec (fs round-trip, os platform, shell exec) and subprocess/control-flow spec

### Changed

- **CLI entry split**: `bin/cli.js` (npm `bin`) keeps inquirer for interactive Node use; the transpilable core lives in `src/index.ts` (`run`/`createProject`), with `src/main.ts` as the self-hosting entry and `src/prompt.ts` (transpilable sync prompts) replacing inquirer in native builds
- **Transpiler internals**: the `ts` typechecker is replaced by syntactic `typeNodeToText`; node predicates became plain `isX()` kind-string functions; operator tokens map through a kind-name table
- Dropped runtime dependencies: `execa`, `fs-extra`, `nanoid` (replaced by a local `goSafeId`)

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
