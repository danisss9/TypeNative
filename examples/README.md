# Examples

Small, complete TypeNative programs, each runnable as-is under **both**
Node.js and a compiled TypeNative binary, with a `bench.mjs` that measures
Node vs TypeNative on the same workload and a README documenting the results.

| Example                           | Demonstrates                                                               | Headline result (this machine*)                              |
|-----------------------------------|----------------------------------------------------------------------------|--------------------------------------------------------------|
| [hello-world](hello-world/)       | `console.log`, `process.argv`, template literals                           | **9.2x faster startup** (4.9 ms vs 45.2 ms)                  |
| [fibonacci](fibonacci/)           | Recursion, `perf_hooks` timing, CPU-bound number crunching                 | **2.1x faster compute** (31.8 ms vs 66.1 ms)                 |
| [json-server](json-server/)       | `node:http` web server with GET + POST JSON routes, zero dependencies      | **1.6x Node's HTTP throughput** (94k vs 57k GET req/s)       |
| [todo-cli](todo-cli/)             | A to-do CLI persisting to a JSON file, run many times a day                | **10.2x faster per command** (5.4 ms vs 54.8 ms)             |
| [dupe-finder](dupe-finder/)       | Recursive directory walk, SHA-256 hashing, JSON report written to disk     | **2.8x faster scan** (231 ms vs 643 ms, 2,000 files)         |
| [mandelbrot-png](mandelbrot-png/) | Fractal render + hand-written PNG encoder on `node:zlib`, no image library | **1.1x faster** (419 ms vs 462 ms)                           |
| [desktop-notes](desktop-notes/)   | Notes app in a native webview window, UI compiled into one binary          | **3.9x faster launch, 6.7x less memory** (11 vs 72 MiB)      |
| [yaml-cli](yaml-cli/)             | The `yaml` package's own CLI from its unmodified source, 100% Node parity  | **11.3x faster per call** (9 vs 107 ms); 1.1x faster on 10 MB† |
| [marked-cli](marked-cli/)         | The `marked` markdown CLI from its unmodified source, 100% Node parity     | **8.2x faster per call** (13 vs 107 ms); 1.1x faster on 10 MB‡ |
| [openai-chat](openai-chat/)       | Chat client for any OpenAI-compatible API: streaming `fetch` + SSE parsing, readline REPL | **1.1x faster per answer** (700 vs 766 ms streamed)          |
| [angular-templates](angular-templates/) | Angular's template compiler (`@angular/compiler`, 233 files) to Ivy instructions, 100% Node parity | **4.3x faster per template** (52 vs 223 ms); 1.2x faster at 64 KB§ |
| [react-compiler](react-compiler/) | The React Compiler (`babel-plugin-react-compiler` + Babel 7.29 + zod 4, ~470 files) compiling components to their auto-memoized form, 100% Node parity | **3.5x faster per file** (103 vs 364 ms); **1.7x faster at 64 KB** (623 vs 1,085 ms) |

\* Windows 11 Pro, AMD Ryzen 5 7600, Node v26.13.0, Go 1.27.4, TypeNative
0.7.0, all examples. See each example's README for full
methodology and numbers.

† Large inputs are converted in up to six worker processes, one contiguous
run of documents each; the single-process path is still about 2.1x slower
than Node on 10 MB. yaml-cli's [parity.mjs](yaml-cli/parity.mjs) also checks
every output against Node byte for byte on the yaml-test-suite (1,608 cases).

‡ Large inputs are parsed in up to six worker processes, one contiguous run of
sections each, at top-level heading boundaries; a single process is still about
1.6x slower than Node on 10 MB. marked-cli's
[parity.mjs](marked-cli/parity.mjs) checks every output against Node byte for
byte on marked's spec suites (2,859 cases).

§ The native binary is faster at every template size measured (3.0x at 9 KB,
1.2x at 65 KB); most component templates are a few KB. angular-templates'
[parity.mjs](angular-templates/parity.mjs) checks every output against Node
byte for byte on the templates of Angular's compiler compliance suite (612
templates).

¶ The largest codebase TypeNative compiles. The native binary is faster at
every size measured (2.5x at 9 KB, 1.7x at 64 KB); most component files are
a few KB.
react-compiler's [parity.mjs](react-compiler/parity.mjs) checks every output
against Node byte for byte (memoized code, `// CompileSuccess` memo slot and
block counts, and compile errors with their code frames) on 15 fixtures
covering components, hooks, the compiler's pragmas, JSX outlining, TypeScript
syntax and the error paths.

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
9x faster, which is what you feel in a CLI like todo-cli. A long-running app
like desktop-notes idles at about a seventh of Node's memory. Disk- and
hash-bound work (dupe-finder) runs about 3x faster, HTTP serving (json-server)
handles about 1.6x more requests per second than Node 26, pure floating-point
loops (mandelbrot-png) run at about the same speed as V8's JIT, and
recursion-heavy code (fibonacci) runs about 2x faster. Every example
also ships as one dependency-free binary. The READMEs report what was
measured, including run-to-run variation and how each load was generated.

## Build check

`npm run conformance` type-checks and builds every `examples/*/main.ts` (as
`example-<name>`), so a change to TypeNative that breaks an example fails the
suite. Run just these with `node scripts/conformance.mjs example`. See the
[Examples section of conformance.md](../conformance.md#examples).
