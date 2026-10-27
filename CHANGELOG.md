# Changelog

All notable changes to TypeNative will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Examples:** `todo-cli`, `dupe-finder`, `mandelbrot-png` and `desktop-notes` (a notes app in an
  Edge/Chrome app window), each with a Node-vs-TypeNative benchmark
- **Conformance:** every `examples/*/main.ts` is type-checked and built by the suite as
  `example-<name>`

### Fixed

- **Destructuring:** `const [a, ...rest] = arr` gives `rest` the remaining elements (it compiled to
  a single element)
- **Numbers:** `String(n)`, templates and `JSON.stringify` print non-integers in plain notation
  from `1e-6` up to `1e21` (`1761603012345.678`, not `1.761603012345678e+12`), and exponents
  without padding (`1e-7`, not `1e-07`)
- **`Number()`:** converts optional strings and booleans (`Number(s)` with `s: string | undefined`
  gave `NaN`)

## [0.4.1] - 2026-10-24

Node-accurate JSON (`stringify` with spacing and replacers, `parse` with a reviver, and JSON
modules), regexes with JS semantics that no longer re-scan the whole string on global matches,
`Date` and error-stack parity, generator iterator helpers, `go:embed` and
`go:runtime/coverage`, seven more Go bridge packages, and `async` calls that start when the
statement runs.

### Added

- **`JSON.stringify`:**
  - `space` (number or string) with Node's layout
  - replacer functions and key lists
  - `toJSON()` methods
  - Dates as ISO strings, `Map` / `Set` as `{}`
  - `TypeError`s for circular structures and bigints
- **`JSON.parse`:** reviver, and a `SyntaxError` for invalid JSON (it returned `null`)
- **Arrays:** writing past the end grows the array
- **Classes:** polymorphic `this` return types (fluent builders), and `obj[key]` on class
  instances and typed objects
- **Generators:** iterator helpers (`map`, `filter`, `take`, `drop`, `flatMap`, `toArray`,
  `forEach`, `some`, `every`, `find`, `reduce`), `Iterator.from` and `next()`
- **Weak references:** `WeakRef` / `FinalizationRegistry`
- **`Date`:**
  - `new Date(string)` (ISO and the formats `toString` / `toUTCString` produce), and
    `new Date(y, m, d, …)` in local time
  - `Date.parse`, the setters (`setHours`, `setUTCDate`, …), `getTimezoneOffset`
  - `toUTCString`, `toLocale*String` (en-US)
  - Node's `toString` format for `String(date)` and templates
  - Invalid Dates (`getTime()` is `NaN`)
- **Errors:** `err.stack` lists the TS frames (`at fn (file.ts:line)`); `AggregateError`
- **Functions:** `fn.bind`, `fn.name`, `fn.length`; `apply` on non-variadic functions, and
  `call` / `apply` on function declarations
- **Statics:** `Promise.withResolvers`, `Promise.try`, `Object.is`, `Object.groupBy`,
  `Map.groupBy`, `Array.of`, `Symbol.for` / `keyFor` / `description`, `BigInt()`,
  `BigInt.asIntN` / `asUintN`
- **`Number`:** `toExponential`, `isSafeInteger`, `parseInt` / `parseFloat`, `MIN_VALUE`,
  `NEGATIVE_INFINITY`
- **`Math`:** `fround`, `imul`, `clz32`, `asinh` / `acosh` / `atanh`, `sumPrecise`
- **`String`:** `codePointAt`, `String.fromCodePoint`, `substr`, `trimLeft` / `trimRight`,
  `isWellFormed` / `toWellFormed`, `toLocaleUpperCase` / `toLocaleLowerCase`, `split` limit,
  `lastIndexOf` position
- **`process`:** `stdout.columns` / `rows` / `getWindowSize()` (and `stderr`),
  `stdin.setRawMode` / `isRaw` (undone at exit), `umask`, on Linux, macOS, FreeBSD and Windows
- **`node:readline`:** `emitKeypressEvents` and `'keypress'` events (Node's key decoder)
- **`node:child_process`:** `spawn` `detached`, `child.unref()` / `ref()`
- **`node:dgram`:** multicast (`addMembership` / `dropMembership`, `setMulticastInterface`), and
  `setBroadcast` / `setTTL` / `setMulticastTTL` / `setMulticastLoopback` take effect (they were
  accepted and ignored)
- **Errors:** `err.errno` and `util.getSystemErrorName` / `Message` / `Map` use Node's numbers for
  the target OS (libuv's table: `ENOENT` is `-4058` on Windows, `ECONNREFUSED` `-61` on macOS) and
  libuv's messages; `getSystemErrorMap` has all 85 entries in Node's order
- **`node:dns`:** `resolveAny` / `resolveCaa` / `resolveNaptr` / `resolvePtr` / `resolveSoa`,
  `resolve4` / `resolve6` with `{ ttl: true }`, and the `Resolver` `tries` option
- **`node:module`** (`builtinModules`, `isBuiltin`), **`node:v8`** (`getHeapStatistics`,
  `serialize` / `deserialize`) and **`node:sea`** (`isSea`)
- **`node:crypto`:** `Hash` / `Hmac` as streams; AES key wrap ciphers (`id-aes*-wrap`,
  `id-aes*-wrap-pad`)
- **`node:http`:** `res.addTrailers()`
- **JSON modules:** `import data from './x.json' with { type: 'json' }` and
  `createRequire(import.meta.url)('./x.json')`, read at compile time
- **Workers and `fork` for another file:** `new Worker('./worker.ts')` / `fork('./child.ts')` compile
  that file into the binary as a second entry point, run in the child process
- **`node:test`:** `--test-name-pattern`, `--test-skip-pattern`, `--test-only` and
  `--test-reporter` (`tap`, `spec`, `dot`, `junit`) from `NODE_OPTIONS`; Node's notice for `.only`
  without `--test-only`
- **`node:stream`:** `'readable'` events and Node's `read()` / `read(size)`
- **`node:sqlite`:** statements are finalized once garbage-collected (they lived until
  `db.close()`); `db.serialize()` / `db.deserialize()`
- **Go bridges:** a probe for every bridged `go:` package, new ones for `debug/*`, `log/syslog`,
  `math/cmplx`, `net/http/fcgi`, `net/rpc`, `net/rpc/jsonrpc`, `net/smtp`, `testing/cryptotest`,
  `testing/slogtest` and `testing/synctest`. Along with them:
  - `pkg.T` in type annotations is the Go type (`let d: dwarf.Data | null = null`,
    `(t: testing.T) => …`)
  - `ref.value` can be written (`r.value = x`), also through `GoRef<T>` parameters, so TS classes
    can be `net/rpc` services
  - `chan<T>()` makes a `chan T`
  - TS records pass where Go takes a `map[K]V`
  - callbacks whose Go signature returns `(T, error)`
- **`go:embed`:** `embed.string(path)`, `embed.bytes(path)` and `embed.files(...patterns)` (an
  `embed.FS`) compile to `//go:embed` vars; the CLI copies the files next to the Go sources
- **`go:runtime/coverage`**, with a `--cover` CLI option that builds with coverage counters. Probes
  can pass CLI options with a first line like `// conformance-flags: --cover`

### Fixed

- **Regex performance:** global `replace` / `split` / `matchAll` and backreference or
  lookaround patterns no longer re-scan the whole string for every match (quadratic on long
  input); the self-hosted compiler builds itself ~10× faster
- **Regex empty matches:** `/g` patterns can match empty at the end of input
  (`'abc'.replace(/x*/g, '-')` is `-a-b-c-`)
- **Regex `split`:** follows JS: capture groups are included (`'a1b'.split(/(\d)/)` is `a`,
  `1`, `b`), `limit` is honored, and empty matches split like JS
  (`'aXbXXc'.split(/(?<=X)/)` is `aX`, `bX`, `X`, `c`)
- **Match `.index`:** `exec`, `match` and `matchAll` results have `.index` (a compile error
  before); `search` returns a character index (it returned a byte offset)
- **`match` with `/g`:** returns every match (it returned the first match's groups)
- **Arrays as strings:** `arr.toString()`, `String(arr)` and `` `${arr}` `` join elements with
  commas (they printed Go's `[a b]`)
- **`node:dns`:** `resolve(name, 'PTR')` queries the name's PTR records (it did a reverse lookup)
- **Templates:** `${err}` on an `Error` builds and prints `Name: message` (`null` when null)
- **`Date` annotations:** `let d: Date`, `Date` parameters, return types, fields and `as Date`
  compiled to an undefined Go type
- **Named imports of Node values:** `import { METHODS } from 'node:http'` keeps its array type
  (`METHODS.includes(…)` compiled as a string method)
- **`console.log` / `inspect`:** Maps and Sets nested in objects print as `Map(n) {…}` /
  `Set(n) {…}` (string-keyed Maps printed as plain objects)
- **Worker messages / `v8.deserialize`:** Sets arrive as Sets and both pass `instanceof`
- **`Array<T>` / `ReadonlyArray<T>` annotations** compiled to an undefined Go type
- **`stream.push(cond ? text : null)`:** a nullable string is a chunk or the end of the stream
  (`null` through it never ended the stream)
- **`hmac.digest()` a second time** returns an empty result, as in Node (it threw)
- **Destructured callback parameters** (`([k, v]) => …`, `({ a }) => …`) in `map` / `filter` & co.
  were unsupported syntax
- **`[...map]`, `map.entries()`** and **`{ ...record, k: v }`** (such as `{ ...process.env }`)
  did not build
- **`+` on two dynamic values** concatenates when one is a string (`'a' + 1` gave `1`)
- **`Object.keys` / `values` / `entries` and `for...in`** on typed objects (interfaces, object
  literals, class instances) did not build
- **`JSON.parse`:** objects keep the text's key order (they came out sorted)
- **Indexing a typed array held as `any`** (`record.list[1].id`) gave `undefined`
- **Worker / IPC messages and `v8.deserialize`:** objects keep their key order (they arrived
  sorted), records arrive as plain objects rather than `Map`s, and both convert to typed
  `Record` fields
- **Optional method calls as statements** (`port?.postMessage(x)`) on `void` methods, and
  `process.send?.(…)` / `process.disconnect?.()`, did not build
- **Dates:** local getters on `new Date(ms)` used UTC
- **Async arrows:** async arrows kept as values return promises (`return` of a plain value didn't
  build)
- **`.then` on async calls:** the call starts when the statement runs, like JS (it started inside
  the background goroutine, where `exec()` registering its listeners off the event loop could
  race it)
- **Maps:** `[...map.keys()]` / `[...map.values()]` build
- **Optional chains:** comparing an optional chain or an `any` value with `null` / `undefined`
  sees a nil pointer inside it
- **`length` fields:** `obj.length` on an object with its own `length` field read it (it compiled
  to Go's `len()`)
- **Error casts:** `(err as Error)` works on instances of custom error classes
- **`any` variables:**
  - a variable declared `any` / `unknown` with a primitive initializer is dynamic:
    `const s: any = '6'; s - 1` builds, and reassigning another type works
  - `==` between `any` values coerces like JS
  - `<T>x` converts like `x as T`
- **Class members:**
  - `#x` and `x` in one class no longer collide
  - private fields and static properties stay out of `JSON.stringify`

Programs that built Go that didn't compile, or computed a wrong value, with no TypeNative error:

- **Classes:**
  - methods without a return-type annotation compiled as returning nothing; they now infer it
    like functions do, including returns nested in `if` / loops / `switch` / `try`
  - field initializers ran before `super()` and the parameter properties, so
    `d = this.k * 2` read `0`
  - static members and getters / setters are inherited (`Child.make()`, `super.v`)
  - private accessors (`get #x()`), `static #x` and `#x in obj` work
  - async methods are lowered like async functions
  - `instanceof Map` / `Set` / `Date` / `Array` work, and `instanceof Parent` is true for
    subclass instances
- **Control flow:**
  - a `switch` that covers every case without `default` builds; so does any statement after a
    `switch`
  - labeled blocks support `break label`
- **Async:** `return otherPromise()` in an async function settles with the awaited value, and
  unannotated async functions build
- **Values and operators:**
  - numeric enum reverse mapping (`Color[0]`)
  - string enum members concatenate and print as strings (`console.log` printed `'a'`)
  - bigint bitwise and shift operators
  - Date arithmetic and ordering (`b - a`, `+d`, `a < b`)
  - `any` operands of `-` / `*` / `/` convert like JS (`'6' - 1` is `5`)
- **Objects:**
  - object-literal setters (they were dropped)
  - repeated interfaces / enums, and an interface named like a class, merge
  - `Object.hasOwn` / `defineProperty` with a computed key build instead of crashing the
    compiler
  - unsupported decorators and descriptors are reported as diagnostics instead of crashes
- **Go bridges:** a blocking call (`time.Sleep`) inside a callback failed to build, a panic in
  one was swallowed, and `time.Sleep` hung inside a `synctest` bubble
- **`for (;;)`** without an initializer or update crashed the compiler

### Documentation

- `conformance.md` separates ❌ (not implemented yet, feasible) from 🚫 (will not be implemented)
  and explains why for each row. Several rows that were ❌ for "impossible" reasons are now
  marked feasible: terminal size and raw mode, `umask`, `getCallSites`, workers and `fork` for
  another file, and freeing SQLite statements on GC
- Rows for gaps the matrix didn't list, each checked by compiling a small program. Among them:
  - Date parsing, setters and arithmetic
  - `JSON.stringify` `space` / replacer / `toJSON`
  - `err.stack`, `bind`, `Intl`, `Temporal`, `WeakRef`
  - class methods without a return-type annotation
  - field initializers that run too early
  - `instanceof Map` / `Date`
  - static and accessor inheritance
- A "Roadmap: known limitations" section, which the link in CONTRIBUTION.md pointed to
- The Go bridges table has no ⚠️ ("typed, no probe yet") status any more. A probe that can't run on
  a platform opts out with a first line like `// conformance-skip: win32 (reason)`
- `go:plugin`, `go:unsafe`, `go:runtime/race` and `go:runtime/cgo` are 🚫 (cgo or raw memory),
  each with the reason

## [0.4.0] - 2026-10-19

A fuller CLI (`--target` cross-compilation, `--release`, `--emit-go`), typed arrays, Brotli and
`fs.watch`, and TS classes that satisfy Go interfaces such as `heap.Interface`. Three sample apps
now run as tests.

### Added

- **CLI**: `--help`, `--version`, `--target <os/arch>` (cross-compiles through `GOOS` /
  `GOARCH`; `--script` refuses foreign targets), `--release` (`-trimpath -ldflags="-s -w"`),
  `--emit-go <dir>` (writes the Go sources and `go.mod` and stops), the entry file as a bare
  argument, and `--flag=value`. Unknown options exit with code `2`, and a missing or older Go
  toolchain (below 1.26) is reported before anything is built
- **Typed arrays**: `Int8Array`, `Uint8ClampedArray`, `Int16Array`, `Uint16Array`,
  `Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array` (indexing, `from` / `of`,
  `fill` / `set` / `subarray` / `slice`, the callback methods, `sort`, `join`, iteration),
  `ArrayBuffer` (`slice`, `isView`) and `DataView`. Views made on an `ArrayBuffer` share its
  memory, and writes convert like JS; `new Uint8Array(arrayBuffer)` is a view too
- **Go interfaces**: a TS class passed where Go expects an interface (`heap.Interface`,
  `sort.Interface`) gets an adapter with the exact Go method signatures, so `go:container/heap`
  works and `sort.Sort` takes classes
- **Brotli** in `node:zlib`: `brotliCompressSync` / `brotliDecompressSync`, the callback and
  promisified forms, `createBrotliCompress` / `createBrotliDecompress` and `constants.BROTLI_*`,
  on the vendored `github.com/andybalholm/brotli` (byte-identical to Node's output)
- **`fs.watch`** (`recursive`, `persistent`, `signal`, `ref` / `unref`), `fs.watchFile` /
  `unwatchFile` and `fs/promises` `watch`, on the vendored `github.com/fsnotify/fsnotify`
- `x instanceof Int32Array` / `URL` / any Node global class
- Three sample apps run as tests (`conformance/app-*.ts`): a `wc`-style CLI, a JSON API on
  `node:http` + `node:sqlite`, and a stream pipeline with gzip / Brotli

### Changed

- Every build goes through `dist/go.mod` (`go build -C dist`), and generated Go files start
  with Go's `// Code generated … DO NOT EDIT.` header
- Vendored Go modules are linked only into programs that import them (`npm run vendor:go`
  now vendors sqlite, Brotli and fsnotify)

### Fixed

- A subclass without a constructor takes its parent's constructor arguments (it compiled to a
  constructor with no parameters)
- `new C([1, 2])` passes array literals to constructors whose array parameter is a shared
  reference
- `this.field` has the field's type inside class bodies, so `Map` / `Set` fields dispatch their
  methods (`this.counts.set(k, v)` called a Go method `set` that doesn't exist)
- Tuple elements read with their declared types (`pair[0]` of a `[string, number]` is a
  string), including in the callbacks of `sort` / `map` / … on tuple arrays
- `rows.map((r) => ({ … }))` and `reduce` accumulators take the contextual type (a function
  returning `Note[]` builds `Note`s, not anonymous structs)
- Object literals with computed keys (`{ [constants.BROTLI_PARAM_QUALITY]: 4 }`) are objects keyed
  by the computed value (they compiled to a struct field named `undefined`)
- `(x as T)` on a Go `any` result (`heap.Pop(h) as Task`) asserts the type, and so does
  `this.items.push(x as T)`
- Timers fire in deadline order (then creation order) when several expire together, as in
  Node; timer goroutines that woke at once on a busy loop or coarse OS clock could run out of
  order

## [0.3.1] - 2026-10-18

### Fixed

- `node:tls` on macOS: an untrusted certificate chain reports Node's codes
  (`DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`,
  `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`) like on other platforms; the platform verifier returns
  a plain error, not `UnknownAuthorityError`
- `go build` runs with `-trimpath`, so vendored packages (the ~5 MB sqlite driver) are cached
  once instead of recompiled for every project directory, and builds are reproducible
- `conformance-parallel.mjs` builds one sqlite probe first so a cold cache doesn't time out
  every sqlite probe at once on small runners; the `node:sqlite` `location()` probe compares
  canonical paths (symlinks, Windows 8.3 short names)

## [0.3.0] - 2026-10-18

Errors now point at your TypeScript. Programs are type-checked before they're transpiled, code
TypeNative can't compile stops the build with its position, and Go build errors and panics
report `.ts` lines. CI runs the suite on Linux, Windows and macOS, and all 398 probes pass on
Windows (four failed there before), through both the Node CLI and the self-hosted compiler.

### Added

- **Type-checking**: the CLI type-checks the entry file and its imports before transpiling,
  using the nearest `tsconfig.json` (or `lib: []` plus the bundled `typenative` declarations),
  and stops on errors (`main.ts:4:7: error TS2322: …`); `--no-typecheck` skips it. The
  self-hosted compiler runs the same check on typescript-go (`tsparser --check`)
- **Line directives**: generated Go carries `/*line file.ts:line:col*/` directives, so
  `go build` errors and panic stack traces report TypeScript files and lines; runtime helpers
  keep their own `dist/code.go` positions. Both parsers emit `line` / `column` on AST nodes
- `TranspileResult.diagnostics`, and `fileName` / `goFile` / `goos` transpile options
- `npm run bootstrap:check`: the self-hosted compiler must emit byte-identical Go for
  `src/main.ts` to the Node CLI's; `conformance-parallel.mjs --native`
- CI on Ubuntu, Windows and macOS, `check:go-types` in CI, and a self-hosted compiler job
  (bootstrap fixpoint + the suite through it)

### Changed

- Unsupported syntax and unsupported `node:` modules are errors with a position
  (`main.ts:2:1: error: Unsupported syntax: WithStatement`) instead of warnings followed by
  broken Go; `;` and `debugger` statements compile to nothing
- Generated Go is deterministic: temp and renamed identifiers come from a generator seeded per
  transpilation instead of `Math.random`, so the same source always gives the same Go
- Code typed into `--script`'s prompt is saved as `dist/script.ts` (type-checked, and named in
  errors)
- Scaffolded `tsconfig.json` sets `skipLibCheck`
- `node:sqlite` `function()` / `aggregate()` callbacks are typed `(...args: any[])`: arguments
  convert to the types the callback declares
- The release workflow builds `bin/` before testing and publishing; `conformance-parallel.mjs`
  sizes its worker pool to the machine
- Probes that depend on the OS (`lib-node-dns-resolver`, `lib-node-util-parse-args`) hold on
  Windows, and the conformance probes type-check (`conformance/tsconfig.json` sets
  `skipLibCheck`)

### Fixed

- Windows: `os.totalmem()` / `os.freemem()` / `os.uptime()` read the OS (they returned the
  process's own memory, `0` and `0`); `performance.now()` keeps increasing between calls, so
  marks taken in a row keep their order (Go's Windows clock repeats readings)

## [0.2.0] - 2026-10-18

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
- `new Error(message, { cause })` / `err.cause`; fetch refuses the Fetch standard's bad ports;
  `net.Stream` and the `autoSelectFamily` defaults
- **`node:sqlite`**: `DatabaseSync` / `StatementSync` (`run` / `get` / `all` / `iterate`, named
  and bare parameters, `readBigInts`, `returnArrays`, `columns()`, `expandedSQL`), `function()`,
  `aggregate()` (window functions), `setAuthorizer`, `limits`, `createTagStore()`, `backup()`,
  and Node 24's error codes and messages. SQLite comes from github.com/ncruces/go-sqlite3 (Wasm
  translated to Go: no cgo), vendored in `govendor/` by `npm run vendor:go` so builds need no
  network. `loadExtension`, sessions and `serialize` are not available
- conformance.md gives each unsupported Node module (`vm`, `repl`, `inspector`, …) its own section

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
- Error properties declared by both `NodeJS.ErrnoException` and `AssertionError` no longer hide
  each other (`(e.cause as Error).message` typed the cause as unknown)
- Negative bigint literals and `-x` on bigints; hex / octal / binary bigint literals;
  `p.then(() => …)` on a `Promise<void>`; `JSON.stringify` of records keeps their keys (it
  printed the map's internals); `String(x)` / template literals use a Node class's `toString()`
- Top-level variables named like an imported Go package (`rsa`, `pem`, `encoding`, `http`, …) are
  renamed instead of clashing with it; `bigint.toString(radix)`; `ArrayBuffer` annotations and
  `byteLength` on Buffers
- Object literals with `$` in a key (`{ $id: 1 }`) compile (as records); `rows as Row[]` on an
  array of dynamic values converts each element; records held in dynamic values read their keys
  (`row.name`, `row['name']`, `Object.keys(row)`, `row as Row`); `bytes[i]` on a dynamic
  `Uint8Array`; `x === 1n` when `x` is `number | bigint`
- `arr.reduce(…)` has a result type (functions returning it compiled without a return value); a
  typed arrow parameter is no longer mistaken for an earlier variable of the same name
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
