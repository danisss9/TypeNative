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

With Node.js (24 or later runs the TypeScript directly):

```sh
node --experimental-transform-types main.ts app.component.html
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

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U (6 cores, 12 threads),
Node v24.19.0, Go 1.26.0, TypeNative 0.5.0 (unreleased changes), default
(non-`--release`) build. The binary is 14.0 MB.

(a) `ng-compile` (built-in demo template), 30 runs each:

| Runtime    | min       | median      | mean        | max         |
| ---------- | --------- | ----------- | ----------- | ----------- |
| Node.js    | 953.45 ms | 1,020.78 ms | 1,044.35 ms | 1,268.38 ms |
| TypeNative | 108.83 ms | 117.35 ms   | 117.90 ms   | 133.38 ms   |

(b) `ng-compile generated.component.html`, 5 runs per size (medians):

| Template           | Node.js  | TypeNative | TypeNative vs Node |
| ------------------ | -------- | ---------- | ------------------ |
| 9 KB, 186 lines    | 1,105 ms | 303 ms     | 3.7x faster        |
| 16 KB, 362 lines   | 1,131 ms | 487 ms     | 2.3x faster        |
| 32 KB, 706 lines   | 1,235 ms | 845 ms     | 1.5x faster        |
| 65 KB, 1,388 lines | 1,354 ms | 1,620 ms   | 1.2x slower        |

**Per call, TypeNative is 8.7x faster** (117 ms vs 1,021 ms, median). Almost
all of both times is fixed: a one-line template takes about as long. Node
spends its second loading the compiler's 233 TypeScript files and transforming
them (`--experimental-transform-types`) before it compiles anything. The
native binary's 0.1 s is mostly the compiler's own module setup, such as the
DOM schema and entity tables.

**On large templates the native binary loses its lead at about 50 KB.** Past
startup, compiling costs about 24 ms per KB natively against about 4–5 ms per
KB under V8's JIT, so the gap closes as templates grow. Real component
templates are mostly a few KB, well inside the native binary's lead. In a
profile of the 64 KB run, about a third of the samples are goroutine handoffs:
TypeNative runs each generator as a goroutine that passes every value to its
consumer over a channel, in lockstep, and the compiler iterates its operation
lists (`OpList`) through generators in each of its 74 phases. Property access
through reflection on dynamically typed values and garbage collection are the
next largest costs.

A template whose sections all share the root view is another matter: Angular
copies every `@let` and `#ref` of a view into each of its child views, so with
hundreds of them at the top level the compile becomes quadratic in both
runtimes. In this generator without the per-card `@if`, 64 KB took 2.7 s under
Node and 7.3 s natively.
