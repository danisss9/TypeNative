# Examples

Small, complete TypeNative programs, each runnable as-is under **both**
Node.js and a compiled TypeNative binary, with a `bench.mjs` that measures
Node vs TypeNative on the same workload and a README documenting the results.

| Example                                      | Demonstrates                                                             | Headline result (this machine*)                 |
|----------------------------------------------|--------------------------------------------------------------------------|--------------------------------------------------|
| [hello-world](hello-world/)                  | `console.log`, `process.argv`, template literals                        | **7.0x faster startup** (14.7 ms vs 103.5 ms)    |
| [fibonacci](fibonacci/)                      | Recursion, `perf_hooks` timing, CPU-bound number crunching              | **1.9x faster compute** (50.2 ms vs 94.8 ms)     |
| [json-server](json-server/)                  | `node:http` web server with GET + POST JSON routes, zero dependencies   | **1.3x higher HTTP throughput** (17.8k vs 13.4k GET req/s) |

\* Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0, TypeNative
0.4.0. See each example's README for full methodology and numbers.

## Running an example

From a checkout of this repository (requires Node.js ≥ 24 and Go ≥ 1.26; run
`npm ci && npm run build` once if `bin/cli.js` does not exist yet):

```sh
# compile + run, one step
node bin/cli.js --source examples/hello-world/main.ts --script

# or compile a distributable binary
node bin/cli.js --source examples/hello-world/main.ts --output dist/hello.exe
./dist/hello.exe
```

With the published npm package, run the same commands from inside an example
folder using `npx typenative` instead of `node bin/cli.js`.

Under plain Node.js, the examples run directly too:

```sh
cd examples/fibonacci
node main.ts 35
```

## Reproducing the benchmarks

Each example folder contains a self-contained harness that compiles the
example with the repo's own CLI and compares both runtimes:

```sh
cd examples/hello-world && node bench.mjs
cd examples/fibonacci   && node bench.mjs 35 15
cd examples/json-server && node bench.mjs
```

Across the three, TypeNative wins process startup (~7x), CPU-bound compute
(~2x) and HTTP throughput (~1.3x, with lower median latency). The READMEs
report what was measured, including run-to-run variation and how each load
was generated.
