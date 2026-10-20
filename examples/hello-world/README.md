# Hello World

The smallest possible TypeNative program — a `console.log` with an optional
name from `process.argv`. It is the "hello world" of both TypeScript and
native compilation: no work is done at all, so benchmarking it measures pure
**runtime startup cost**.

## The code

```ts
// main.ts
const name = process.argv[2] ?? 'world';
console.log(`Hello, ${name}!`);
```

## Run it

With Node.js:

```sh
node main.ts Ada
# Hello, Ada!
```

With TypeNative (compile to a native binary and run it):

```sh
npx typenative --source main.ts --output dist/hello.exe
./dist/hello.exe Ada
# Hello, Ada!
```

From a checkout of this repository, use the local CLI instead of `npx`:

```sh
node bin/cli.js --source examples/hello-world/main.ts --script   # compile + run
node bin/cli.js --source examples/hello-world/main.ts --output dist/hello.exe
```

(`--script` compiles and runs in one step; passing program arguments requires a
built binary, as shown above.)

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=30]`. The script compiles `main.ts` with
the TypeNative CLI, then times **complete process runs** (spawn to exit) of
the same program under both runtimes. Since the program does no work, the
numbers are almost entirely startup time.

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0,
TypeNative 0.4.0, default (non-`--release`) build.

| Runtime    | min        | median     | mean       | max        |
|------------|------------|------------|------------|------------|
| Node.js    | 97.07 ms   | 103.45 ms  | 104.51 ms  | 125.91 ms  |
| TypeNative | 12.95 ms   | 14.72 ms   | 15.18 ms   | 25.11 ms   |

**TypeNative starts 7.0x faster** (median). The compiled binary is a
self-contained 2.4 MB executable: there is no runtime to boot, no module
system to initialize, and no JIT to warm up, so process-to-output latency is
an order of magnitude lower. For CLI tools that are invoked frequently, this
is the difference users notice.
