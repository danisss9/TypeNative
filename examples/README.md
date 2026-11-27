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
| [react-compiler](react-compiler/) | The React Compiler (`babel-plugin-react-compiler` + Babel 7.29 + zod 4, ~470 files) compiling components to their auto-memoized form, 100% Node parity | **3.5x faster per file** (103 vs 364 ms); **1.7x faster at 64 KB** (623 vs 1,085 ms)¶ |
| [mongodb-driver](mongodb-driver/) | Official `mongodb` 7.9.1 driver + `bson` 7.3.4 (164 files), live TCP OP_MSG wire protocol & EJSON CLI, 100% Node parity | **5.2x faster `ping`** (33.8 vs 175.7 ms); **4.5x faster CRUD** (40.3 vs 181.9 ms); **1.1x faster BSON**‖ |
| [tsc](tsc/)                       | Full upstream TypeScript compiler (`tsc` v6.0.3, 81 files, ~178K lines): emit, JSX, decorators, `.d.ts`, incremental, `--build`, `--watch`, 100% Node parity | **12.9x faster startup** (13.1 vs 169.3 ms); warm incremental **1.6x–1.8x** of Node (683 vs 382–426 ms)# |

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

‖ Measured on the same machine with TypeNative 0.7.1 against a bundled local
TCP OP_MSG/OP_QUERY mock server (no external `mongod` required). Cold CLI
commands are 4.5x–5.2x faster and pure BSON serialize+deserialize is 1.1x
faster (28,111 vs 25,658 docs/s); a warm 2,000-command sequential OP_MSG loop
runs at 0.48x Node's throughput (2,449 vs 5,072 cmds/s). mongodb-driver's
[parity.mjs](mongodb-driver/parity.mjs) verifies all 13 BSON/EJSON and live
wire-protocol cases byte for byte against Node.

\# Measured on the same machine with TypeNative 0.7.2. Cold `tsc --version`
startup is 12.9x faster (13.1 vs 169.3 ms); incremental warm no-op and 1-file
edit rebuilds run in 683 ms (vs 382–426 ms in Node); full cold type-checking
of `checker.ts`'s heavily dynamic AST/Type graph is slower than V8 (3.3x on a
22-file project, ~19x on TypeNative's own 47K-line `src/`). tsc's
[parity.mjs](tsc/parity.mjs) verifies all 23 end-to-end workloads (emit,
downlevel, JSX, decorators, declarations, sourcemaps, diagnostics, module
resolution, incremental `.tsbuildinfo`, `--build` references, `--watch`, and
`tsc --noEmit` on TypeNative's own `src/`) byte for byte against Node.

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
cd examples/mongodb-driver  && node parity.mjs   # and node bench.mjs (bundled OP_MSG mock server)
cd examples/tsc             && node parity.mjs   # and node bench.mjs (full TypeScript v6.0.3 compiler)
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
