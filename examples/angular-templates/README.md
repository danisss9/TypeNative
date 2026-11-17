# Angular template compiler

The Angular template compiler, natively. [vendor/angular/compiler/](vendor/angular/compiler/)
holds `@angular/compiler`'s TypeScript source (`packages/compiler/src`: 233
files, about 66,000 lines, MIT licensed). Its logic is upstream's own; the only
edits are mechanical, so Node.js can run the files directly: import specifiers
carry their `.ts` extension, and type-only imports are marked `type`.
[main.ts](main.ts) parses an Angular template (control flow, bindings, pipes,
i18n, `@defer`, `@let`, …) with `parseTemplate`, compiles it to a component
definition with `compileComponentFromMetadata`, and prints the Ivy
instructions as JavaScript, the way the Angular CLI's output reads.

This is the largest real codebase TypeNative compiles. The compiler is
built around deep class hierarchies with abstract members and `super` calls,
visitor interfaces implemented by dozens of classes, generators, structural
object types that extend each other, `Map`s and `Set`s of arrays and objects,
`bigint` message fingerprints, and template-literal code generation whose
output must match V8's byte for byte.

## Usage

```sh
ng-compile                      # compile the built-in demo template
ng-compile app.component.html   # compile a template file
```

A template with syntax errors prints them as `// error: …` comments. An error
the compiler throws prints as `// compile error: …` and exits with code 1.

## Run it

With Node.js. Node runs TypeScript only by stripping types, and Angular's
compiler source uses enums, which that mode rejects, so `run-node.mjs`
compiles `main.ts` and everything it imports to JavaScript with the
repository's `typescript` package once, caches it in `.cache/node/`, and runs
it:

```sh
node run-node.mjs my.component.html
```

With TypeNative:

```sh
npx typenative --source main.ts --output dist/ng-compile
./dist/ng-compile app.component.html
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/angular-templates/main.ts --output dist/ng-compile
```

## Parity with Node.js

Reproduce with `node parity.mjs [filter]`. The script fetches the test cases
of Angular's compiler compliance suite
(`packages/compiler-cli/test/compliance/test_cases`, at commit `939171c`) into
`.cache/` (it isn't committed) and compiles `main.ts`. It then compiles every
component template in them with both runtimes: each external `.html` template,
and each inline `template:` string literal. stdout, stderr and the exit code
must match byte for byte, with no normalization. Failures are written to
`.cache/failures/`.

```
612/612 templates match (100.00%)
```

The corpus covers control flow (`@if`, `@for`, `@switch`, `@defer` with every
trigger, `@let`), i18n (attributes, ICUs nested in ICUs, meanings,
descriptions and custom ids, legacy message ids, line-ending normalization),
pipes, two-way bindings, listeners, directive matching, `ng-content`
projection, styling bindings and templates with errors (which
must report the same messages).

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=30] [sizeRuns=5] [kilobytes=8,16,32,64]`.
The script compiles `main.ts`, then times **complete process runs** (spawn to
exit) of `ng-compile` under both runtimes, alternating Node and native runs,
and checks that the two outputs are identical:

- **(a) per-call latency:** the built-in demo template (control flow,
  bindings, pipes, listeners, `@let`, `ng-content`), about one component's
  worth. This is what a build tool or editor pays per template when it starts
  a compiler process per file.
- **(b) scaling:** generated templates from 8 to 64 KB. Each is a dashboard of
  cards using `@if`/`@for`/`@switch`, `@defer`, `@let`, property, class, style
  and attribute bindings, listeners, two-way bindings, pipes, i18n attributes
  and ICUs, `ng-template` references and `ng-content`, from a fixed-seed
  generator, so every machine gets the same input. Each card is its own
  embedded view (`@if (panels.x) { … }`), the way sections of a real template
  are.

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600 (6 cores, 12 threads),
Node v26.13.0, Go 1.27.4, TypeNative 0.7.0, default
(non-`--release`) build. The binary is 16.7 MB. Node runs the compiler as
precompiled JavaScript (see [Run it](#run-it)); that build is done once,
before timing.

(a) `ng-compile` (built-in demo template), 30 runs each:

| Runtime    | min       | median      | mean        | max         |
| ---------- | --------- | ----------- | ----------- | ----------- |
| Node.js    | 218.33 ms | 222.94 ms   | 225.50 ms   | 302.30 ms   |
| TypeNative | 50.29 ms  | 51.74 ms    | 52.91 ms    | 85.98 ms    |

(b) `ng-compile generated.component.html`, 5 runs per size (medians):

| Template           | Node.js  | TypeNative | TypeNative vs Node |
| ------------------ | -------- | ---------- | ------------------ |
| 9 KB, 186 lines    | 258 ms   | 85 ms      | 3.0x faster        |
| 16 KB, 362 lines   | 282 ms   | 115 ms     | 2.5x faster        |
| 32 KB, 706 lines   | 316 ms   | 180 ms     | 1.8x faster        |
| 65 KB, 1,388 lines | 393 ms   | 321 ms     | 1.2x faster        |

**Per call, TypeNative is 4.3x faster** (52 ms vs 223 ms, median). Almost
all of both times is fixed: a one-line template takes about as long. Node
spends it loading and evaluating the compiler's 233 modules before it
compiles anything. The native binary's 52 ms is mostly the compiler's own
module setup, such as the DOM schema and entity tables.

**The native binary is faster at every size measured, including 65 KB
(1.2x).** Past startup, compiling costs about 4 ms per KB natively against
about 2–3 ms per KB under V8's JIT, so the gap narrows as templates grow. Most
of the 64 KB run is the compiler's operation traversal: its 74 phases each
iterate the operation lists (`OpList`), and the garbage collector scans the
IR they build. Before this was fixed, about a third of the samples were
goroutine hand-offs: iterating an `OpList` reached through a dynamically
typed op field (`op.handlerOps`, `op.trackByOps`) went through reflection to
its `*[Symbol.iterator]()` channel, one goroutine per list. `TnToArray` now
recognizes the generator's push form directly (`Symbol_iterator__seq`) and
iterates it in place, with no reflection, channel or goroutine per list; the
64 KB run fell from about 600 ms to about 320 ms.

A template whose sections all share the root view is another matter: Angular
copies every `@let` and `#ref` of a view into each of its child views, so with
hundreds of them at the top level the compile becomes quadratic in both
runtimes. In this generator without the per-card `@if`, 64 KB took 2.7 s under
Node and 7.3 s natively.
