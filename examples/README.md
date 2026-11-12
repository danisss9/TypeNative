# Examples

Small, complete TypeNative programs, each runnable as-is under **both**
Node.js and a compiled TypeNative binary, with a `bench.mjs` that measures
Node vs TypeNative on the same workload and a README documenting the results.

| Example                           | Demonstrates                                                               | Headline result (this machine*)                              |
|-----------------------------------|----------------------------------------------------------------------------|--------------------------------------------------------------|
| [hello-world](hello-world/)       | `console.log`, `process.argv`, template literals                           | **8.5x faster startup** (7.4 ms vs 62.4 ms)                  |
| [fibonacci](fibonacci/)           | Recursion, `perf_hooks` timing, CPU-bound number crunching                 | **2.0x faster compute** (36.4 ms vs 73.8 ms)                 |
| [json-server](json-server/)       | `node:http` web server with GET + POST JSON routes, zero dependencies      | 0.7x Node's HTTP throughput (44.3k vs 60.0k GET req/s)       |
| [todo-cli](todo-cli/)             | A to-do CLI persisting to a JSON file, run many times a day                | **8.2x faster per command** (9.3 ms vs 76.1 ms)              |
| [dupe-finder](dupe-finder/)       | Recursive directory walk, SHA-256 hashing, JSON report written to disk     | **2.9x faster scan** (224 ms vs 645 ms, 2,000 files)         |
| [mandelbrot-png](mandelbrot-png/) | Fractal render + hand-written PNG encoder on `node:zlib`, no image library | **1.1x faster** (452 ms vs 514 ms)                           |
| [desktop-notes](desktop-notes/)   | Notes app in a native webview window, UI compiled into one binary          | **4.4x faster launch, 6.7x less memory** (11 vs 73 MiB)      |
| [yaml-cli](yaml-cli/)             | The `yaml` package's own CLI from its unmodified source, 100% Node parity  | **13x faster per call** (9 vs 117 ms); 3.9x slower on 10 MB† |
| [marked-cli](marked-cli/)         | The `marked` markdown CLI from its unmodified source, 100% Node parity     | **8.4x faster per call** (14 vs 119 ms); 1.6x slower on 10 MB‡ |
| [openai-chat](openai-chat/)       | Chat client for any OpenAI-compatible API: streaming `fetch` + SSE parsing, readline REPL | **1.1x faster per answer** (716 vs 780 ms streamed)          |
| [angular-templates](angular-templates/) | Angular's template compiler (`@angular/compiler`, 233 files) to Ivy instructions, 100% Node parity | **3.7x faster per template** (61 vs 223 ms); 1.9x slower at 64 KB§ |
| [react-compiler](react-compiler/) | The React Compiler (`babel-plugin-react-compiler` + Babel 7.29 + zod 4, ~470 files) compiling components to their auto-memoized form | in progress — the full pipeline runs; simple functions compile byte-identically, runtime panics remain in the compiler's passes¶ |

\* Windows 11 Pro, AMD Ryzen 5 7600, Node v26.13.0, Go 1.27.4, TypeNative
0.5.0 (unreleased changes), all examples. See each example's README for full
methodology and numbers.

† The native binary is faster up to about 350 KB of input per run.
yaml-cli's [parity.mjs](yaml-cli/parity.mjs) also checks every output against
Node byte for byte on the yaml-test-suite (1,608 cases).

‡ The native binary is faster up to about 1–1.5 MB of markdown per run.
marked-cli's [parity.mjs](marked-cli/parity.mjs) checks every output against
Node byte for byte on marked's spec suites (2,859 cases).

§ The native binary is faster up to about 25 KB of template
per run; most component templates are a few KB. angular-templates'
[parity.mjs](angular-templates/parity.mjs) checks every output against Node
byte for byte on the templates of Angular's compiler compliance suite (612
templates).

¶ The largest codebase TypeNative compiles. The binary builds and
initializes all ~470 vendored modules in Node's evaluation order (see the
TypeNative CHANGELOG for what that took); the whole pipeline runs natively —
JSX parses, Scope collects bindings, the HIR builds, and codegen emits
memoized output whose CompileSuccess lines match Node's. Simple functions
compile byte-identically; the remaining fixtures fail inside the compiler's
own passes (effects-inference ordering, nil dereferences in instruction
rewriting), tracked in
[the example's README](react-compiler/README.md#status-what-works-natively);
[parity.mjs](react-compiler/parity.mjs) reports the current gap and
[bench.mjs](react-compiler/bench.mjs) is ready.

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

desktop-notes also needs `npm install` in its folder first, for the webview
package. Its compiled build doesn't.

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
cd examples/desktop-notes  && npm install && node bench.mjs
cd examples/yaml-cli       && node bench.mjs   # and node parity.mjs
cd examples/marked-cli     && node bench.mjs   # and node parity.mjs
cd examples/openai-chat    && node bench.mjs   # against a local mock API, no key needed
cd examples/angular-templates && node bench.mjs   # and node parity.mjs
cd examples/react-compiler  && node parity.mjs   # and node bench.mjs
```

TypeNative's clearest wins are process startup and memory. Startup is about
8x faster, which is what you feel in a CLI like todo-cli. A long-running app
like desktop-notes idles at about a seventh of Node's memory. Disk- and
hash-bound work (dupe-finder) runs about 3x faster, while HTTP serving
(json-server) handles fewer requests per second than Node 26. Pure
floating-point loops (mandelbrot-png) run at about the same speed as V8's
JIT, and recursion-heavy code (fibonacci) runs about 2x faster. Every example
also ships as one dependency-free binary. The READMEs report what was
measured, including run-to-run variation and how each load was generated.

## Build check

`npm run conformance` type-checks and builds every `examples/*/main.ts` (as
`example-<name>`), so a change to TypeNative that breaks an example fails the
suite. Run just these with `node scripts/conformance.mjs example`. See the
[Examples section of conformance.md](../conformance.md#examples).
