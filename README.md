# TypeNative

Build native applications using Typescript.

## PreRequisites

- [Nodejs v24](https://nodejs.org/en) or newer.
- [Go 1.23](https://go.dev/doc/install) or newer.

## Get Started

- Write a file `test.ts` with content `console.log('Hello World!');` or any other message
- Run `npx typenative --source test.ts --script`

## Conformance

TypeNative proves transpilation works with a conformance suite in [conformance/](conformance/):
one probe per TypeScript feature, run with `npm run conformance`
(filter: `node scripts/conformance.mjs <filter>`; `--native` uses the self-hosted binary).

- [conformance.md](conformance.md) — every TypeScript language feature and ported
  standard-library API, split by area, each linking to the probe that confirms
  it (including known gaps).

## Native (self-hosted) compiler

TypeNative compiles itself: `src/main.ts` transpiles to Go and builds into a native `typenative`
binary that needs no Node.js at runtime and produces the same Go output as the npm package.

```sh
npm run build              # compile the TypeScript sources
npm run build:native       # build native/typenative and native/tsparser
native/typenative --source app.ts --script
```

Building the native compiler requires Go 1.26 (for the TypeScript parser, `tsparser/`). The
`typenative` binary finds `tsparser` next to itself, or via the `TYPENATIVE_TSPARSER`
environment variable.

TypeNative is in early development and new features are being added regularly.
See [conformance.md](conformance.md#roadmap-known-limitations) for known limitations.
