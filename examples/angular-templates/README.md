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
