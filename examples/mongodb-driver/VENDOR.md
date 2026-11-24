# Vendored MongoDB driver sources

Upstream, pinned:

| Package | Version | Files | Source |
|---|---|---|---|
| `mongodb` | 7.9.1 | 132 `.ts` | https://github.com/mongodb/node-mongodb-native `src/` |
| `bson` | 7.3.4 | 32 `.ts` | https://github.com/mongodb/js-bson `src/` |

Both are Apache-2.0; their `LICENSE.md` files are kept beside `src/`.

The npm tarballs ship these TypeScript sources (the published `lib/` is the
compiled output), which is what TypeNative compiles directly.

## Import rewrites (`node rewrite-imports.mjs`)

Only three, because TypeNative resolves relative `.ts` imports:

- `mongodb/src/bson.ts`: `from 'bson'` → `../../bson/src/index.ts`
- `mongodb/src/connection_string.ts`: `from 'mongodb-connection-string-url'` → the shim
- `mongodb/src/cmap/auth/scram.ts`: `from '@mongodb-js/saslprep'` → the shim

`@mongodb-js/saslprep` and `mongodb-connection-string-url` publish only compiled
JavaScript, so [vendor/shims/](vendor/shims/) provides the small surface the
driver uses.

## Upstream patches (`node apply-patches.mjs`)

The script is idempotent and lists every change made to the vendored tree. Both
the Node.js runner (`run-node.mjs`) and the TypeNative binary compile from this
same patched tree.

### Driver (`mongodb` 7.9.1)

- `cmap/wire_protocol/compression.ts`: `let zstd` → `let zstdLib`, because
  TypeNative's `node:zlib` helper imports a Go package named `zstd`; the
  `return reject(err)` executor paths spell out the `return;`.
- `client-side-encryption/mongocryptd_manager.ts`: static `import { spawn }`
  instead of `require('child_process')`.
- `runtime_adapters.ts`: static `import * as os from 'os'` exposing the four
  `OsAdapter` methods instead of dynamic `await import('os')`.
- `cmap/handshake/client_metadata.ts`: inline the pinned version `'7.9.1'`
  instead of `require('../../../package.json').version`; `process.env`
  destructuring spelled out (TypeNative maps `process.env.X`); no Deno/Bun
  branches; `.byteLength` → `.length` on a `Uint8Array`; split `BSON.serialize`
  into a local before `BSON.deserialize`.
- `timeout.ts`: `Timeout` holds its promise in a `readonly promise` field
  instead of extending `Promise<never>`; the `Promise.race(..., timeout)` sites
  race `timeout.promise`; `TimeoutContext.create` takes `any` (its option type
  is a union intersected with a session).
- `connection_string.ts`: `CaseInsensitiveMap` wraps a `Map` instead of
  extending it (TypeNative does not subclass built-in `Map`); explicit types
  for `hostAddresses`, `tlsList`/`sslList`, `mechanismProperties`, and
  `readPreferenceTags.transform`.
- `mongo_logger.ts`: `SeverityLevelMap` wraps a `Map`; `LogConvertible` spells
  out `[key: string]: any` instead of `extends Record<string, any>`; split
  chained assignments and typed `createLoggingSeverities()` / `createStdioLogger`.
- `mongo_client.ts`: `PkFactory.createPk` modeled as a function property;
  explicit TLS option fields; `this.s` getters replaced with direct field
  assignments (object-literal getters inside a typed struct literal are not
  emitted as field initializers); `this.options.metadata` wrapped in an async
  IIFE; indexed `hosts` copy loop and `any` callback types for cursor/session
  close arrays.
- `sessions.ts` & `operations/execute_operation.ts`: labeled `continue` out of
  a `try/catch` replaced with retry flags (Go cannot jump across the generated
  function boundary); `import { setTimeout as delayTimeout } from 'timers/promises'`.
- `operations/operation.ts`, `command.ts`, `find.ts`, `find_and_modify.ts`,
  `aggregate.ts`, `create_collection.ts`, `delete.ts`, `update.ts`, `rename.ts`,
  `drop.ts`, `search_indexes/create.ts`, `client_bulk_write/*`, `bulk/common.ts`,
  `read_preference.ts`, `error.ts`, `deps.ts`: structural option/result type
  boundaries (`CommandOperation` options, `Object.assign` in `buildOptions`,
  `defineAspects(operation: any, …)`, `makeDocumentSequence`, direct relative
  imports instead of package barrel re-imports).
- `mongo_types.ts`: `EventKey | symbol` event names narrowed to `string`
  (every driver call site passes a string key).
- `sdam/topology.ts`, `sdam/topology_description.ts`, `sdam/server.ts`:
  explicit `credentials` field on `TopologyOptions`, indexed loop for
  `srvListeners` check, spread copy for `allHosts`, wrapped `reauthPromise.then`
  callbacks.
- `utils.ts`: `mergeOptions`, `decorateDecryptionResult`, and `makeStateMachine`
  typed with `any` to preserve reference identity and class methods instead of
  copying into structural value structs; `isRecord` checks built-in types
  directly instead of `ctor.prototype.isPrototypeOf`; `promiseWithResolvers`
  delegates to `Promise.withResolvers()`; `List`'s sentinel/element node union
  (`ListNode` / `HeadNode` / `EmptyNode`) unified into one `ListNode<T>` shape
  so `ptr !== this.head` compares pointer identity directly without struct
  copies.
- `cmap/connect.ts`: guard `tlsSocket.disableRenegotiation` dynamically; type
  `handshakeDoc` as `Document` so computed `[LEGACY_HELLO_COMMAND]` (`isMaster`)
  is preserved in an open map instead of colliding with lowercase `ismaster`.
- `cmap/wire_protocol/on_data.ts`: rewritten as a genuine `async function*`
  generator (matching Go's native channel-backed async generator lowering) with
  an idempotent `closeHandler` and `onClose` hook.
- `cmap/connection.ts`: `Connection.command` implementation return type widened
  from `Promise<Document>` to `Promise<any>` so `MongoDBResponse` /
  `CursorResponse` instances pass through without coercing to nil `*TnMap`;
  `readMany` calls `onData`'s `onClose` hook in `finally` to detach listeners
  deterministically on early `return` from `for await`; guarded
  `dataEvents.throw(error)` during teardown.
- `cmap/connection_pool.ts`, `cmap/wire_protocol/responses.ts`,
  `cmap/wire_protocol/on_demand/document.ts`: explicit `any` / `String(name)`
  at dynamic boundaries.
- `cursor/abstract_cursor.ts`: `stream()` returns `any`; `trackCursor` captures
  `this` lexically in `this.once('close', () => …)`; `toArray()` pulls
  documents sequentially via `await this.next()` + `this.readBufferedDocuments()`
  instead of mixing an eager `for await` producer goroutine with synchronous
  batch draining.

### BSON (`bson` 7.3.4)

- `bson/src/utils/byte_utils.ts` & `node_byte_utils.ts`: use `nodeJsByteUtils`
  directly (avoiding the Node/browser union) with concrete `Uint8Array` return
  types.
- `bson/src/bson_value.ts`: `inspect(0, options, inspect)`.
- `bson/src/parser/utils.ts`: `isUint8Array` uses `value instanceof Uint8Array`.
- `bson/src/parse_utf8.ts`: drop ambient `declare const TextDecoder` shadow so
  TypeNative uses the built-in `TextDecoder`.
- `bson/src/parser/serializer.ts` & `calculate_size.ts`: materialize `Map`
  entries with `Array.from(...)`; type `sourceObject`, `iterTarget`, `object`,
  and cycle-tracking `path: Set<any>` dynamically so arrays and plain objects
  do not coerce through `TnRecordOf`.
- `bson/src/parser/deserializer.ts`: type `holdingDocument`, `rootObject`,
  `currentDest`, and `assignValue` target as `any` so deserialized BSON arrays
  remain native Go slices rather than coercing to `*TnMap`.
- `bson/src/db_ref.ts`: type `DBRefLike.$id` and `DBRef.oid` as `any` so EJSON
  serialization can store plain `{ $oid: ... }` objects in a `DBRef`.
- `bson/src/binary.ts`, `decimal128.ts`, `timestamp.ts`, `extended_json.ts`,
  `parser/on_demand/parse_to_elements.ts`: narrow union/bit-op/numeric
  boundaries.

### Feature trimming

The example does not need change streams, `db.admin()`, or client-side
encryption. `apply-patches.mjs` removes those imports/methods from `db.ts`,
`collection.ts`, and `mongo_client.ts` (including the `'.'` barrel import in
`mongo_client.ts`), narrows `mongo_client_auth_providers.ts` to
DEFAULT/PLAIN/SCRAM only, and keeps type-only stubs for OIDC, AWS temporary
credentials, `Encrypter`, and `AutoEncrypter`. This keeps optional native
addons (`kerberos`, `mongodb-client-encryption`, `@aws-sdk/*`) out of the
binary. `VENDOR.md` is the source of truth; every change is listed here.

## Status

Shipped, verified example (`main.ts`):

- Builds cleanly with full TypeScript typechecking via `npm run conformance`
  (`example-mongodb-driver`).
- Passes **13/13** byte-for-byte Node.js parity tests (`node parity.mjs`),
  covering BSON/EJSON types and live TCP OP_MSG CRUD/aggregation/benchmark
  commands against [mock/server.mjs](mock/server.mjs).
- Benchmarked against Node.js in [README.md](README.md) (`node bench.mjs`).
