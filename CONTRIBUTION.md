# Contributing to TypeNative

Thanks for helping build TypeNative — a TypeScript-to-Go transpiler that ships native binaries. Contributions of all sizes are welcome: new language features, standard-library coverage, bug fixes, docs, and probes.

> New here? Read [README.md](README.md) first — it explains what TypeNative is, how the pipeline works, and the repo layout.

## Ways to contribute

- **Add a missing feature** — pick a ❌ row in [conformance.md](conformance.md) and make it ✅.
- **Fix a bug** — failing probe, wrong Go output, bad error message.
- **Improve docs** — README, conformance matrix, code comments.
- **Report issues** — open an issue with a minimal `.ts` repro, expected vs. actual output, and your `node --version` / `go version`.

## Prerequisites

- [Node.js v24](https://nodejs.org/en) or newer.
- [Go 1.26](https://go.dev/doc/install) or newer — hard minimum (`tsparser/go.mod` declares `go 1.26.0`).

## Setup

```sh
git clone https://github.com/danisss9/typenative.git
cd typenative
npm ci
npm run build        # tsc -> bin/
npm run conformance  # full probe suite, must be green before you start
```

## How a feature gets added

Every supported feature follows the same four-step loop. Do all four — a transpiler change without a probe (or vice versa) will not be merged.

### 1. Write a probe in `conformance/`

One file per feature, named by area:

| Prefix | Meaning | Example |
| ------ | ------- | ------- |
| `syntax-` | Language syntax | `syntax-optional-chaining.ts` |
| `semantics-` | Runtime behavior | `semantics-loose-equality.ts` |
| `lib-` | Standard-library API | `lib-map.ts` |

Probe conventions:

- Self-contained — no imports except the module under test, no external files.
- Exercise the feature with `console.log` **and** verify with `assert(condition, 'message')`.
- A passing probe transpiles, compiles with `go build`, runs, and exits `0`. Anything else is a failure.

```ts
// conformance/lib-map.ts
const m = new Map<string, number>([['a', 1]]);
m.set('b', 2);
assert(m.size === 2 && m.get('a') === 1 && m.has('b') && !m.has('c'), 'map');
```

Run just your probe while iterating:

```sh
node scripts/conformance.mjs lib-map        # substring filter
node scripts/conformance.mjs --native lib-map  # same, via self-hosted binary
```

### 2. Extend the ambient types in `types/`

The `.d.ts` files are the type-checking contract for user code. If your feature adds API surface, declare it:

- `types/typenative.d.ts` — core JS subset (`Array`, `Map`, `Set`, `JSON`, `Math`, `RegExp`, …).
- `types/typenative-npm.d.ts` — `node:*` shims (`fs`, `path`, `os`, `child_process`, …).
- `types/typenative-go.d.ts` — `go:*` bridges (`fmt`, `strings`, `strconv`).

No signature → user code won't type-check → the feature doesn't exist.

### 3. Implement in `src/transpiler.ts`

- Match on `node.kind === 'Xxx'` strings (never the `typescript` enum) so the same code consumes Node- and Go-produced ASTs.
- Emit a warning, not a crash, for anything still unsupported: `console.warn('[TypeNative] Unsupported syntax: …')`.
- Keep the transpiler free of Node-only dependencies (see below).

### 4. Document in `conformance.md`

Add or flip the matrix row and link your probe. Keep ✅/❌ honest — known gaps stay visible, and the [roadmap](conformance.md#roadmap-known-limitations) lists structural limitations.

## The transpilability rule

This is the one rule that breaks the build if ignored: **`src/index.ts`, `src/transpiler.ts`, `src/main.ts`, `src/prompt.ts`, and `src/parse-native.ts` must transpile with TypeNative itself.** That means:

- ❌ No `inquirer`, no async Node-only APIs, no unmapped modules in those files.
- ✅ Node-only code lives in `src/cli.ts` (prompts) and `src/parse-node.ts` (`typescript` package) and is injected at the boundary — e.g. `run({ ..., parse: parseAstJson })`.
- ✅ Prompts in transpilable code go through `src/prompt.ts` (`node:readline` → Go helper).

If you need a new capability in transpilable code, add the mapping (transpiler + `types/` shim) first, then use it.

## Code style

- Prettier config is in [.prettierrc.json](.prettierrc.json): 100-char width, 2-space indent, single quotes, semicolons, no trailing commas.
- Match surrounding code. Small, focused diffs beat refactors — don't reformat unrelated files.
- Comment *why*, not *what*. The codebase already documents module roles in file headers (`src/parse-node.ts`, `tsparser/main.go`, …) — update the header if you change a module's role.

## Testing

```sh
npm run build                  # must pass: tsc with strict mode
npm run conformance            # full suite via Node CLI — must be 100% green
node scripts/conformance.mjs <filter>          # iterate on one area
node scripts/conformance.mjs --native <filter> # parity via self-hosted binary
```

If you touched anything transpilable, also verify self-hosting:

```sh
npm run build:native            # builds native/tsparser + native/typenative
node scripts/conformance.mjs --native  # full suite through your new binary
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs `npm ci` → `npm run build` → `npm run conformance` on Ubuntu (Node 24 + Go). Match it locally before pushing.

## Pull requests

1. Fork, branch from `main` (`feat/<probe-name>`, `fix/<what>`, `docs/<what>`).
2. One feature per PR. Include: probe + types + transpiler + `conformance.md` row.
3. Describe: what TypeScript now transpiles, sample input/output Go if non-obvious, and conformance results (`total x/y`, plus `--native` if applicable).
4. Keep CI green — a red suite is the fastest way to get a review delayed.

## Releases

Releases are cut from `TypeNative_*` tags via trusted publishing ([release workflow](.github/workflows/npm-publish-github-packages.yml)). Don't bump `package.json` versions in PRs — the tag drives the version.

## License

By contributing, you agree your changes are MIT-licensed like the rest of the project. See [LICENSE](LICENSE).
