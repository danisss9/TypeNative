# Examples

Small, complete TypeNative programs, each runnable as-is under **both**
Node.js and a compiled TypeNative binary, with a `bench.mjs` that measures
Node vs TypeNative on the same workload and a README documenting the results.

| Example                           | Demonstrates                                                               | Headline result (this machine*)                              |
|-----------------------------------|----------------------------------------------------------------------------|--------------------------------------------------------------|
| [hello-world](hello-world/)       | `console.log`, `process.argv`, template literals                           | **6.8x faster startup** (14.5 ms vs 98.8 ms)                 |
| [fibonacci](fibonacci/)           | Recursion, `perf_hooks` timing, CPU-bound number crunching                 | **1.9x faster compute** (51.0 ms vs 97.0 ms)                 |
| [json-server](json-server/)       | `node:http` web server with GET + POST JSON routes, zero dependencies      | **1.2x higher HTTP throughput** (16.9k vs 13.9k GET req/s)   |
| [todo-cli](todo-cli/)             | A to-do CLI persisting to a JSON file, run many times a day                | **7.0x faster per command** (15.4 ms vs 107.3 ms)            |
| [dupe-finder](dupe-finder/)       | Recursive directory walk, SHA-256 hashing, JSON report written to disk     | **1.6x faster scan** (407 ms vs 660 ms, 2,000 files)         |
| [mandelbrot-png](mandelbrot-png/) | Fractal render + hand-written PNG encoder on `node:zlib`, no image library | **1.1x faster** (594 ms vs 663 ms)                           |
| [desktop-notes](desktop-notes/)   | Notes app in a native webview window, UI compiled into one binary          | **5.9x faster launch, 6.6x less memory** (11 vs 72 MiB)      |
| [yaml-cli](yaml-cli/)             | The `yaml` package's own CLI from its unmodified source, 100% Node parity  | **16x faster per call** (17 vs 271 ms); 2.4x slower on 10 MB† |
| [marked-cli](marked-cli/)         | The `marked` markdown CLI from its unmodified source, 100% Node parity     | **7.1x faster per call** (26 vs 188 ms); 1.7x slower on 10 MB‡ |
| [openai-chat](openai-chat/)       | Chat client for any OpenAI-compatible API: streaming `fetch` + SSE parsing, readline REPL | **1.2x faster per answer** (717 vs 864 ms streamed)          |
| [angular-templates](angular-templates/) | Angular's template compiler (`@angular/compiler`, 233 files) to Ivy instructions, 100% Node parity | **8.7x faster per template** (117 vs 1,021 ms); 1.2x slower at 64 KB§ |
| [react-compiler](react-compiler/) | The React Compiler (`babel-plugin-react-compiler` + Babel 7.29 + zod 4, ~470 files) compiling components to their auto-memoized form | in progress — JSX now parses natively; the compiler's scope bindings are the next gap¶ |

\* Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0, TypeNative
0.5.0 (unreleased changes), all examples. See each example's README for full
methodology and numbers.

† The native binary is faster up to about 1 MB of input per run.
yaml-cli's [parity.mjs](yaml-cli/parity.mjs) also checks every output against
Node byte for byte on the yaml-test-suite (1,608 cases).

‡ The native binary is faster up to about 1–2 MB of markdown per run.
marked-cli's [parity.mjs](marked-cli/parity.mjs) checks every output against
Node byte for byte on marked's spec suites (2,859 cases).

§ The native binary is faster up to about 50 KB of template
per run; most component templates are a few KB. angular-templates'
[parity.mjs](angular-templates/parity.mjs) checks every output against Node
byte for byte on the templates of Angular's compiler compliance suite (612
templates).

¶ The largest codebase TypeNative compiles. The binary builds and
initializes all ~470 vendored modules in Node's evaluation order (see the
TypeNative CHANGELOG for what that took); the whole pipeline runs natively —
JSX sources parse (the tokenizer's element context stack, the TypeScript
plugin's try-parses, @babel/types' validators) and the compiler runs to its
own diagnostics. @babel/traverse's Scope collects no bindings natively yet
(`getBindingIdentifiers` returns nothing), which BuildHIR reports as
`Could not find binding for param`; tracked in
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
7x faster, which is what you feel in a CLI like todo-cli. A long-running app
like desktop-notes idles at about a seventh of Node's memory. Disk- and
hash-bound work (dupe-finder) and HTTP serving gain 1.2–1.6x. Pure
floating-point loops (mandelbrot-png) run at about the same speed as V8's
JIT, and recursion-heavy code (fibonacci) runs about 2x faster. Every example
also ships as one dependency-free binary. The READMEs report what was
measured, including run-to-run variation and how each load was generated.

## Build check

`npm run conformance` type-checks and builds every `examples/*/main.ts` (as
`example-<name>`), so a change to TypeNative that breaks an example fails the
suite. Run just these with `node scripts/conformance.mjs example`. See the
[Examples section of conformance.md](../conformance.md#examples).
