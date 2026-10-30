# Examples

Small, complete TypeNative programs, each runnable as-is under **both**
Node.js and a compiled TypeNative binary, with a `bench.mjs` that measures
Node vs TypeNative on the same workload and a README documenting the results.

| Example                           | Demonstrates                                                               | Headline result (this machine*)                              |
|-----------------------------------|----------------------------------------------------------------------------|--------------------------------------------------------------|
| [hello-world](hello-world/)       | `console.log`, `process.argv`, template literals                           | **7.0x faster startup** (14.7 ms vs 103.5 ms)                |
| [fibonacci](fibonacci/)           | Recursion, `perf_hooks` timing, CPU-bound number crunching                 | **1.9x faster compute** (50.2 ms vs 94.8 ms)                 |
| [json-server](json-server/)       | `node:http` web server with GET + POST JSON routes, zero dependencies      | **1.3x higher HTTP throughput** (17.8k vs 13.4k GET req/s)   |
| [todo-cli](todo-cli/)             | A to-do CLI persisting to a JSON file, run many times a day                | **6.8x faster per command** (16.3 ms vs 111.4 ms)            |
| [dupe-finder](dupe-finder/)       | Recursive directory walk, SHA-256 hashing, JSON report written to disk     | **1.6x faster scan** (412 ms vs 674 ms, 2,000 files)         |
| [mandelbrot-png](mandelbrot-png/) | Fractal render + hand-written PNG encoder on `node:zlib`, no image library | **1.2x faster**, steadier (597 ms vs 744 ms)                 |
| [desktop-notes](desktop-notes/)   | Notes app in an Edge/Chrome app window, UI compiled into one binary        | **5.6x faster launch, 4.7x less memory** (15 vs 72 MiB)      |
| [yaml-cli](yaml-cli/)             | The `yaml` package's own CLI from its unmodified source, 100% Node parity  | **26x faster per call** (8 vs 213 ms); 3.8x slower on 10 MB† |

\* Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0, TypeNative
0.4.0 (hello-world, fibonacci, json-server) and 0.4.1 (the rest). See each
example's README for full methodology and numbers.

† Measured on a Linux container (4 vCPUs, Xeon @ 2.80GHz), Node v24.22.2,
Go 1.26.0. The native binary is faster up to about 150–200 KB of input per run.
yaml-cli's [parity.mjs](yaml-cli/parity.mjs) also checks every output against
Node byte for byte on the yaml-test-suite (1,608 cases).

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
cd examples/todo-cli    && node bench.mjs
cd examples/dupe-finder && node bench.mjs
cd examples/mandelbrot-png && node bench.mjs
cd examples/desktop-notes  && node bench.mjs
cd examples/yaml-cli       && node bench.mjs   # and node parity.mjs
```

TypeNative's clearest wins are process startup and memory. Startup is about
7x faster, which is what you feel in a CLI like todo-cli. A long-running app
like desktop-notes idles at about a fifth of Node's memory. Disk- and
hash-bound work (dupe-finder) and HTTP serving gain 1.3–1.6x. Pure
floating-point loops (mandelbrot-png) run at about the same speed as V8's
JIT, and recursion-heavy code (fibonacci) runs about 2x faster. Every example
also ships as one dependency-free binary. The READMEs report what was
measured, including run-to-run variation and how each load was generated.

## Build check

`npm run conformance` type-checks and builds every `examples/*/main.ts` (as
`example-<name>`), so a change to TypeNative that breaks an example fails the
suite. Run just these with `node scripts/conformance.mjs example`. See the
[Examples section of conformance.md](../conformance.md#examples).
