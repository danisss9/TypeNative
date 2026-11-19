# Node.js Built-in Modules (`node:*`)

TypeNative implements Node.js built-in modules directly on top of Go's standard library and vendored pure-Go packages. Programs can import modules with either the `node:` prefix (`import fs from 'node:fs'`) or bare names (`import fs from 'fs'`), using default, named, or namespace imports. Subpath imports (`node:fs/promises`, `node:path/posix`, `node:stream/web`, …) are supported as well.

Signatures follow `@types/node` and are declared in [types/typenative-npm.d.ts](../types/typenative-npm.d.ts). For exact per-API coverage and probes, see [Node builtins in conformance.md](../conformance.md#node-builtins-node).

## Event Loop & Concurrency Model

Callbacks, timers, streams, and async I/O completions execute on **one single-threaded event loop**, one callback at a time—matching Node.js semantics. An `async` function runs synchronously until its first `await`.

---

## Module Reference

### Filesystem & Paths

| Module | Highlights |
| --- | --- |
| `node:fs`, `node:fs/promises` | Sync, callback, and promise APIs (`readFile`, `writeFile`, `appendFile`, `stat`, `lstat`, `readdir`, `mkdir`, `rm`, `rmdir`, `unlink`, `rename`, `copyFile`, `cp`, `realpath`, `symlink`, `readlink`, `chmod`, `open`, `FileHandle`, `createReadStream`, `createWriteStream`, `watch` via vendored `fsnotify`, `watchFile`, `glob`). |
| `node:path`, `node:path/posix`, `node:path/win32` | Faithful ports of Node's path algorithms (not Go's `filepath`): `join`, `resolve`, `dirname`, `basename`, `extname`, `normalize`, `relative`, `isAbsolute`, `parse`, `format`, `toNamespacedPath`, `sep`, `delimiter`. |

### Process, OS & System

| Module | Highlights |
| --- | --- |
| `node:process` | `argv`, `argv0`, `execPath`, `execArgv`, `env`, `cwd`, `chdir`, `platform` (Node names like `win32`/`darwin`/`linux`), `arch`, `pid`, `ppid`, `exit`, `exitCode`, `hrtime`, `uptime`, `memoryUsage`, `nextTick`, `stdin`, `stdout`, `stderr`, `on('exit')`, signal handlers. |
| `node:os` | `platform`, `arch`, `type`, `release`, `hostname`, `homedir`, `tmpdir`, `cpus`, `totalmem`, `freemem`, `endianness`, `EOL`, `devNull`, `networkInterfaces`, `userInfo`, `constants`. |
| `node:tty` | `isatty`, `ReadStream`, `WriteStream` (`isTTY`, `columns`, `rows`, `getColorDepth`, `hasColors`). |
| `node:console` | `Console` class and global `console` methods. |
| `node:constants`, `node:sys` | OS/fs/crypto constants; `node:sys` aliases `node:util`. |
| `node:module` | `builtinModules`, `isBuiltin`, `createRequire` (compile-time literal module and JSON requires), `findPackageJSON`. |
| `node:v8` | `getHeapStatistics`, `getHeapSpaceStatistics`, `getHeapCodeStatistics` (from Go `runtime.MemStats`), `serialize` / `deserialize` (structured-clone codec). |

### Buffers, Encoding & URLs

| Module | Highlights |
| --- | --- |
| `node:buffer` | `Buffer` (`from`, `alloc`, `allocUnsafe`, `concat`, `isBuffer`, `byteLength`, `compare`, integer read/write methods, `utf8`/`hex`/`base64`/`base64url`/`latin1`/`ascii`/`utf16le`), `Blob`, `File`, `atob`, `btoa`, `transcode`, `isUtf8`, `isAscii`. |
| `node:string_decoder` | `StringDecoder` for incremental multi-byte UTF-8 / UTF-16 / Base64 decoding. |
| `node:url` | `URL`, `URLSearchParams`, `fileURLToPath`, `pathToFileURL`, `format`, `parse`, `resolve`, `domainToASCII`, `domainToUnicode`. |
| `node:querystring` | `parse`, `stringify`, `escape`, `unescape`. |
| `node:punycode` | `encode`, `decode`, `toASCII`, `toUnicode`, `ucs2`. |

### Events, Streams & Readline

| Module | Highlights |
| --- | --- |
| `node:events` | `EventEmitter` (`on`, `once`, `off`, `emit`, `removeAllListeners`, `listeners`, `listenerCount`, `setMaxListeners`, `events.once`, `events.on`), `EventTarget`, `Event`, `AbortController`, `AbortSignal`. |
| `node:stream`, `node:stream/promises`, `node:stream/consumers` | `Readable`, `Writable`, `Duplex`, `Transform`, `PassThrough`, `pipeline`, `finished`, `compose`, `Readable.from`, backpressure (`highWaterMark`, `drain`), async iteration (`for await`), consumers (`text`, `json`, `buffer`, `arrayBuffer`, `blob`). |
| `node:stream/web` | `ReadableStream`, `WritableStream`, `TransformStream`, `TextEncoderStream`, `TextDecoderStream`, `CompressionStream`, `DecompressionStream`, queuing strategies. |
| `node:readline`, `node:readline/promises` | `createInterface`, line-by-line async iteration, `question`, `prompt`, `close`, cursor/line helpers. Also includes a TypeNative synchronous extension `readline.question(prompt)` used by the self-hosted CLI. |

### Networking & HTTP

| Module | Highlights |
| --- | --- |
| `node:net` | TCP and IPC/Unix-socket servers and clients (`createServer`, `createConnection`, `Socket`, `Server`, `isIP`, `isIPv4`, `isIPv6`). |
| `node:tls` | TLS/SSL servers and clients (`connect`, `createServer`, `TLSSocket`, `createSecureContext`, root CA certificates). |
| `node:dns`, `node:dns/promises` | `lookup`, `resolve`, `resolve4`, `resolve6`, `resolveCname`, `resolveMx`, `resolveTxt`, `resolveSrv`, `resolveNs`, `reverse`, `Resolver`. |
| `node:dgram` | UDP sockets (`createSocket('udp4' \| 'udp6')`, `bind`, `send`, `address`, multicast). |
| `node:http`, `node:https` | HTTP/1.1 servers and clients (`createServer`, `request`, `get`, `IncomingMessage`, `ServerResponse`, `ClientRequest`, `Agent` connection pooling, trailers, `httpValidation`, `METHODS`, `STATUS_CODES`). |
| `node:http2` | HTTP/2 client and server sessions on vendored `golang.org/x/net/http2` (`createServer`, `createSecureServer`, `connect`, streams, frame-level `ping`, `settings`, `goaway`, `altsvc`, `getPackedSettings` / `getUnpackedSettings`). |

### Cryptography & Compression

| Module | Highlights |
| --- | --- |
| `node:crypto` | `createHash`, `createHmac`, `createCipheriv` / `createDecipheriv`, `randomBytes`, `randomInt`, `randomUUID`, `pbkdf2`, `scrypt`, `hkdf`, `timingSafeEqual`, key generation (`generateKeyPair`, `createPublicKey`, `createPrivateKey`, `createSecretKey`), `sign` / `verify`, `diffieHellman`, `X509Certificate`, and Web Crypto (`crypto.subtle`). |
| `node:zlib`, `node:zlib/iter` | Sync, async, and streaming compression/decompression for `gzip`/`gunzip`, `deflate`/`inflate`, `deflateRaw`/`inflateRaw`, `brotliCompress`/`brotliDecompress` (vendored pure-Go Brotli), and `zstd`. |

### Concurrency & Subprocesses

| Module | Highlights |
| --- | --- |
| `node:child_process` | `spawn`, `spawnSync`, `exec`, `execSync`, `execFile`, `execFileSync`, `fork` (with IPC `send`/`message` channel). |
| `node:worker_threads` | `Worker`, `isMainThread`, `parentPort`, `workerData`, `threadId`, `MessageChannel`, `MessagePort`, `BroadcastChannel`. Workers run as child processes compiled into the binary as additional entry points. |
| `node:cluster` | `isPrimary`, `isWorker`, `fork`, `workers`, `worker`, IPC messaging. |

### Database, Native FFI, WASI & SEA

| Module | Highlights |
| --- | --- |
| `node:sqlite` | `DatabaseSync`, `StatementSync`, prepared statements, named/positional parameters, `exec`, `all`, `get`, `run`, `iterate`, `function`, `aggregate`, backup, and transactions. Powered by a **bundled pure-Go SQLite** (`modernc.org/sqlite` in `govendor/`)—no cgo, no network at build time. |
| `node:ffi` | Node 26 FFI: `dlopen`, `dlclose`, `dlsym`, `DynamicLibrary`, `registerCallback` / `unregisterCallback`, typed memory getters/setters (`get*`/`set*`), `toString`, `toBuffer`, `toArrayBuffer`, `getRawPointer`, `suffix`, `types`. Pure Go (no cgo): `LoadLibrary` on Windows, vendored `purego` on Linux/macOS. |
| `node:wasi` | `WASI` (`version: 'preview1'` and `'unstable'`, `args`, `env`, `preopens`, `stdin`/`stdout`/`stderr`, `start`, `initialize`, `getImportObject`). Powered by vendored `wazero`. |
| `node:sea` | `isSea()` (always `true`), `getAsset`, `getRawAsset`, `getAssetAsBlob` for files embedded via `--sea-config <file>`. |

### Testing, Utilities, Timers & Diagnostics

| Module | Highlights |
| --- | --- |
| `node:assert`, `node:assert/strict` | `ok`, `equal`, `strictEqual`, `deepEqual`, `deepStrictEqual`, `throws`, `rejects`, `doesNotThrow`, `match`, `fail`, `AssertionError`. |
| `node:test`, `node:test/reporters` | `test`, `describe`, `it`, `before`, `after`, `beforeEach`, `afterEach`, `skip`, `todo`, `only`, `mock` (`fn`, `method`, `getter`, `setter`, `timers`), snapshots, `run()`, and reporters (`tap`, `spec`, `dot`, `junit`, `lcov`). |
| `node:util`, `node:util/types` | `format`, `inspect`, `promisify`, `callbackify`, `parseArgs`, `styleText`, `stripVTControlCharacters`, `TextEncoder`, `TextDecoder`, `deprecate`, `debuglog`, `types.is*` predicates. |
| `node:timers`, `node:timers/promises` | `setTimeout`, `setInterval`, `setImmediate`, `clear*`, and promise-based `setTimeout` / `setImmediate` / `setInterval` (async iterator). |
| `node:perf_hooks` | `performance` (`now`, `timeOrigin`, `mark`, `measure`, `getEntries*`, `clearMarks`, `clearMeasures`), `PerformanceObserver`, `createHistogram`, `monitorEventLoopDelay`. |
| `node:async_hooks` | `AsyncLocalStorage` (`run`, `enterWith`, `getStore`, `exit`, `snapshot`), `AsyncResource`. |
| `node:diagnostics_channel` | `channel`, `hasSubscribers`, `subscribe`, `unsubscribe`, `tracingChannel`. |

---

## Unsupported Modules (`🚫`)

These modules depend on a runtime V8/JavaScript engine or are deprecated upstream and cannot be implemented in a native Go binary:

- `node:vm` — runtime JS compilation/execution
- `node:repl` — interactive JS evaluation
- `node:inspector` — V8 debugger/profiler protocol
- `node:trace_events` — V8/Node trace categories
- `node:domain` — deprecated upstream
