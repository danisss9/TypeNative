# MongoDB Driver CLI

The official MongoDB Node.js driver, natively. [vendor/mongodb/](vendor/mongodb/)
holds `mongodb` 7.9.1's upstream TypeScript source (132 files, Apache-2.0) and
[vendor/bson/](vendor/bson/) holds `bson` 7.3.4 (32 files, Apache-2.0).
[main.ts](main.ts) compiles all 164 vendored modules—SDAM topology discovery,
CMAP connection pooling, OP_MSG / OP_QUERY wire protocol framing, BSON/EJSON
serialization and deserialization, cursor iteration, and CRUD/aggregation
operations—into a single dependency-free native executable.

## Usage

```sh
mongodb-driver ping <uri>                             # Connect and run { ping: 1 }
mongodb-driver crud <uri> [db] [collection]           # Insert, find, sort, update, aggregate, count, delete
mongodb-driver insert <uri> <db> <collection> <json>  # Insert a JSON or Extended JSON document
mongodb-driver query <uri> <db> <collection> [json]   # Query documents and print Extended JSON
mongodb-driver bench-wire <uri> [ops=500]             # Pooled OP_MSG CRUD round-trips (4 * ops commands)
mongodb-driver bson-roundtrip                         # Verify BSON & EJSON round-trip across BSON types
mongodb-driver bson-bench [docs=5000]                 # Serialize and deserialize N nested BSON documents
mongodb-driver --help                                 # Show usage
```

Point `<uri>` at any MongoDB server (for example `mongodb://127.0.0.1:27017`),
or use the bundled self-contained local OP_MSG/OP_QUERY wire-protocol mock
server ([mock/server.mjs](mock/server.mjs)) with no external MongoDB
installation required:

```sh
# Terminal 1: start the local wire-protocol mock server
node mock/server.mjs 27017

# Terminal 2: run commands against it
./dist/mongodb-driver ping "mongodb://127.0.0.1:27017/?directConnection=true"
./dist/mongodb-driver crud "mongodb://127.0.0.1:27017/?directConnection=true"
```

## Run it

With Node.js (the vendored sources use TypeScript enums and parameter
properties, so `run-node.mjs` compiles the patched vendor tree to `.cache/node`
once and reuses it):

```sh
node run-node.mjs bson-roundtrip
node run-node.mjs ping "mongodb://127.0.0.1:27017/?directConnection=true"
```

With TypeNative:

```sh
npx typenative --source main.ts --output dist/mongodb-driver
./dist/mongodb-driver bson-roundtrip
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/mongodb-driver/main.ts --output dist/mongodb-driver
```

`main.ts` compiles cleanly with full TypeScript typechecking enabled (checked
in CI as `example-mongodb-driver` via `npm run conformance`). See
[VENDOR.md](VENDOR.md) for the exact pinned upstream versions, import rewrites,
and minimal documented patches.

## Parity with Node.js

[parity.mjs](parity.mjs) compiles `main.ts` to a native binary, starts the
in-process TCP OP_MSG/OP_QUERY mock server, and runs 13 end-to-end test cases
under both Node.js and the compiled binary—checking `stdout`, `stderr`, and
exit codes byte for byte:

- CLI help (`--help`) and error exit paths (unknown command, missing URI)
- `bson-roundtrip` across all core BSON/EJSON types (`ObjectId`, `Int32`,
  `Double`, `Long`, `Decimal128`, `Timestamp`, `Binary`, `Date`, `BSONRegExp`,
  `MinKey`, `MaxKey`, `Code`, `DBRef`, nested arrays/documents, UTF-8)
- `bson-bench 500` deterministic byte counts and checksums
- Live TCP OP_MSG `ping`, full `crud` lifecycle (`drop`, `insertOne`,
  `insertMany`, `findOne`, sorted `find().toArray()`, `updateOne` with `$set`
  and `$inc`, `aggregate` `$match` + `$group`, `countDocuments`, `deleteOne`),
  `insert` with Extended JSON (`$oid`/`$date`), filtered/unfiltered/empty
  `query`, and `bench-wire 50`

All 13 cases match byte for byte:

```sh
node parity.mjs
```

## Benchmark

Reproduce with `node bench.mjs [cliRuns=20] [warmRuns=5] [wireOps=500] [bsonDocs=5000]`.
The harness builds both runtimes from the exact same patched vendor tree,
starts the local TCP OP_MSG mock server, alternates Node.js and TypeNative
runs, and fails immediately if any output ever differs:

- **(a) Cold-start CLI `ping`:** spawn process → TCP handshake (`isMaster` /
  `hello`) → `{ ping: 1 }` → graceful `client.close()` → exit.
- **(b) End-to-end CLI `crud`:** spawn process → full 10-operation CRUD and
  aggregation lifecycle → EJSON output → exit.
- **(c) Warm OP_MSG throughput `bench-wire 500`:** one connected `MongoClient`
  running 500 iterations of `insertOne` + `findOne` + `updateOne` + `deleteOne`
  (2,000 sequential OP_MSG round-trips per run).
- **(d) BSON CPU throughput `bson-bench 5000`:** pure in-memory `BSON.serialize`
  + `BSON.deserialize` of 5,000 nested documents (1.73 MB of BSON per run).

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600 (6 cores, 12 threads),
Node.js v26.13.0, Go 1.27.4, TypeNative 0.7.1, default (non-`--release`) build.
Binary size: **25.58 MB** (compiled in 7.7 s).

### (a) Cold-start CLI: `ping` (20 runs, live TCP OP_MSG)

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 170.55 ms | 175.70 ms | 179.34 ms | 207.67 ms |
| TypeNative |  31.36 ms |  33.76 ms |  34.10 ms |  38.09 ms |

**TypeNative is 5.20x faster** (33.76 ms vs 175.70 ms median).

### (b) End-to-end CLI: `crud` (20 runs, 10 OP_MSG ops/run)

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 176.02 ms | 181.91 ms | 181.12 ms | 184.54 ms |
| TypeNative |  37.79 ms |  40.33 ms |  40.15 ms |  41.55 ms |

**TypeNative is 4.51x faster** (40.33 ms vs 181.91 ms median).

### (c) BSON serialize + deserialize: `bson-bench 5000` (1.73 MB/run, 5 runs)

| Runtime    | min       | median    | mean      | max       | Throughput   |
| ---------- | --------- | --------- | --------- | --------- | ------------ |
| Node.js    | 191.80 ms | 194.87 ms | 196.68 ms | 205.67 ms | 25,658 doc/s |
| TypeNative | 174.87 ms | 177.87 ms | 177.71 ms | 181.48 ms | 28,111 doc/s |

**TypeNative is 1.10x faster** (28,111 vs 25,658 docs/s median).

### (d) Warm OP_MSG throughput: `bench-wire 500` (2,000 commands/run, 5 runs)

| Runtime    | min       | median    | mean      | max       | Throughput  |
| ---------- | --------- | --------- | --------- | --------- | ----------- |
| Node.js    | 391.17 ms | 394.35 ms | 402.81 ms | 433.63 ms | 5,072 cmd/s |
| TypeNative | 810.93 ms | 816.60 ms | 818.07 ms | 827.56 ms | 2,449 cmd/s |

**TypeNative runs at 0.48x Node's warm throughput** (2,449 vs 5,072 cmds/s).

### Interpreting the numbers

- **CLI startup & short-lived jobs (4.5x–5.2x faster):** Node.js spends ~170 ms
  loading, parsing, and JIT-initializing the 164-module driver graph on every
  invocation, whereas the native binary has the entire driver compiled ahead of
  time. On Windows, ~20–25 ms of TypeNative's 33.8 ms cold `ping` is spent
  inside `os.release()` (which spawns `cmd /c ver` once during handshake client
  metadata construction), leaving under ~10 ms for startup and the TCP
  handshake + `ping` itself.
- **CPU-bound BSON (1.10x faster):** Pure BSON serialization and
  deserialization across 5,000 nested documents runs slightly faster natively
  than V8 even on a sustained 1.73 MB batch.
- **Long-lived warm OP_MSG loop (0.48x):** Inside a hot sequential loop of
  2,000 wire commands, the driver allocates a fresh `onData` async generator,
  `readMany` async generator, `TimeoutContext`, and dynamic `Document` option
  bags on every command. V8's inline caches and single-threaded microtask queue
  stay faster on that per-command dynamic dispatch and goroutine handoff
  overhead.

## Compiler & runtime work unlocked

Compiling and running the real MongoDB driver end to end surfaced a set of
general TypeNative transpiler and Node runtime improvements (all in
TypeNative itself, not example hacks):

- Symbol-keyed class members (`get [sym]()`, `[sym]()`, `[sym] =`, `static [sym]`)
  across modules, including `Symbol.for(...)` and exported `unique symbol` keys.
- Type-alias resolution in `interface X extends TypeAlias` chains (e.g.
  `TopologyOptions extends BSONSerializeOptions, ServerOptions` where
  `ServerOptions` is an `Omit<...> & ...` intersection).
- Constructor-with-statics types (`{ new (...): T; make(...): T }`),
  polymorphic `new this(...)` in static methods, and `this` binding in
  `TnCallMember`.
- Two-argument `Promise.prototype.then(onFulfilled, onRejected)`, channel
  conversions across `Promise<T>` boundaries, `return expr` inside `try`/`catch`
  in `async` functions, and `TnAwait` inside `async function*` generators.
- Concrete subclass copying of inherited `async` methods and computed
  `[Symbol.iterator]` / `[Symbol.asyncIterator]` generator methods, plus
  typed-nil handling in `??=` and nilable Go interface checks in optional
  method calls (`abortListener?.[kDispose]()`).
- Dynamic dispatch coverage for `EventEmitter`, `Stream`/`Socket`, `[]byte`,
  `Date`, and getter properties in `in` / `TnHas`, plus cycle guards in
  runtime struct conversion planning (`tnConvPlan`).
