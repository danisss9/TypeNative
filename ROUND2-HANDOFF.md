# Round 2 handoff: marked

You're picking up round 2 of 3 in a series of "flagship examples" for
TypeNative (a TypeScript-to-Go transpiler, repo `danisss9/TypeNative`). Each
round compiles a real, unmodified npm package's TypeScript source to a native
binary and proves its output matches Node byte for byte. Round 1 (the `yaml`
CLI) is done; round 3 is the Angular template parser. This round is
[marked](https://github.com/markedjs/marked).

If the original plan specifies something for round 2 that differs from this
brief, the plan wins.

## Where things stand

- Round 1 is on branch `claude/brave-ride-d67lzw`, PR
  [danisss9/TypeNative#30](https://github.com/danisss9/TypeNative/pull/30),
  open and already merged with current `main`. Each round ships as its own
  PR. If #30 hasn't merged when you start, branch from it (round 2 needs its
  transpiler fixes); otherwise branch from `main`. Don't open a PR unless the
  user asks.
- Use `examples/yaml-cli/` as the template for everything:
  [main.ts](examples/yaml-cli/main.ts), [parity.mjs](examples/yaml-cli/parity.mjs),
  [bench.mjs](examples/yaml-cli/bench.mjs), [README.md](examples/yaml-cli/README.md),
  [vendor/yaml/VENDOR.md](examples/yaml-cli/vendor/yaml/VENDOR.md).
- State at handoff: conformance 523/523 under both the Node CLI and the
  self-hosted native compiler; yaml parity 1608/1608; `bootstrap:check`
  holds (56 Go files identical).

## The target

| | |
| --- | --- |
| Upstream | https://github.com/markedjs/marked |
| Tag | `v18.1.2` (latest when this was written; use it unless the plan pins another) |
| Commit | `5beecae42b0beb07eaccc3a732560f56867a8301` |
| Source | `src/*.ts`, 11 files, about 4,070 lines, imports use `.ts` extensions |
| CLI | `bin/main.js` (JavaScript; imports the built `lib/marked.esm.js`) |
| License | MIT |

Things in the source that will matter:

- `src/rules.ts` is a large set of regexes (22 of them, two with lookbehind),
  many composed at run time with `.replace()` on their `.source`. Expect the
  regex translation and the backtracking engine to get a workout.
- `Lexer` / `Tokenizer` / `Parser` / `Renderer` classes, hooks and
  extensions (`Instance.ts`), with `this`-bound callbacks.
- `bin/main.js` uses `fs.promises`, `createRequire`, `pathToFileURL`, dynamic
  imports of `child_process` / `url`, and spawns `man` for `--help`.

## Deliverables (same rules as round 1)

Layout: `examples/marked-cli/`

- `vendor/marked/`: `src/` and `LICENSE` copied byte for byte, plus
  `VENDOR.md` with the tag, the commit and the patch list. The target is an
  empty patch list.
- `main.ts`: a TypeScript port of `bin/main.js`, importing
  `./vendor/marked/src/marked.ts` instead of the built bundle. It must run
  under both `node main.ts` and TypeNative. For `--help`, matching Node's
  behavior (spawning `man`) isn't required for parity; just keep it working.
- `parity.mjs`: runs every corpus case through Node and the native binary,
  compares stdout, stderr and exit code byte for byte, prints the pass rate
  and writes failures to `.cache/failures/`. Copy yaml-cli's, including its
  `withoutStackFrames()` normalization (Node prints JS stack frames; a native
  binary has none).
- `bench.mjs`: (a) per-call latency, (b) throughput, alternating Node and
  native runs, checking the outputs are identical.
- `README.md` in the yaml-cli style. Report losses honestly too: yaml-cli is
  27x faster per call but 3.6x slower on 10 MB, and its README says so.

Corpora are fetched into a gitignored `.cache/` (`examples/*/.cache` is
already ignored), never committed.

**Proposed corpus** (confirm against the plan): marked's own spec suites at
the vendored tag.

- `test/specs/commonmark/commonmark.0.31.2.json`: 652 cases.
- `test/specs/gfm/gfm.0.29.json`: 28 cases.
- `test/specs/new/*.md`: about 223 cases.
- `test/specs/original/*.md`: 22 cases.
- `test/specs/redos/*`: 36 inputs, worth including with the 10 s timeout,
  since they will expose any super-linear regex path.

Feed each case's markdown on stdin, in at least the default (GFM) mode and
with `--no-gfm` if the CLI supports it. Parity means native vs Node, not
native vs the spec's expected HTML; spec cases marked failing in marked
don't matter.

**Proposed benchmarks**:

- (a) A typical README (e.g. marked's own `README.md`) to HTML, 30 runs.
- (b) About 10 MB of generated markdown (headings, lists, tables, code
  fences, links, emphasis) from a fixed-seed generator, 5 runs.

## Hard rules

- No patches to upstream code. When a construct doesn't compile or behaves
  differently, fix the transpiler generally. The only exception is something
  `conformance.md` marks 🚫, documented in `VENDOR.md` with the reason.
- Every fix gets a probe in `conformance/` (it runs under TypeNative with an
  `assert` global) and a row in `conformance.md` (✅ with the probe link; ❌
  rows for gaps you find but don't fix).
- The self-hosted compiler must keep working: `npm run build:native &&
  npm run bootstrap:check`.
- Docs per round: a row in `examples/README.md`, a line in the root README's
  Examples section, and a CHANGELOG entry under `[Unreleased]`.
- Commit trailer, and never put a model name in commits, PRs or code:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_012GsG7QUSC36HGJ9rohJ7A7
  ```

## Verification (run all of it before pushing)

1. `npm run build`
2. Compile the example: `node bin/cli.js --source examples/marked-cli/main.ts --output …`
3. `cd examples/marked-cli && node parity.mjs` must report 100%.
4. `node bench.mjs`
5. `npm run conformance:parallel`
6. `npm run build:native && npm run bootstrap:check`
7. `node scripts/conformance.mjs --native`

## Environment

```bash
export PATH=/opt/nvm/versions/node/v24.22.2/bin:$PATH
export GOTOOLCHAIN=go1.26.0
```

Without these you get "TypeNative needs Go 1.26 or newer" or an old Node.
Timings in this container: conformance:parallel about 7 min,
`conformance --native` about 5 min, bootstrap:check about 75 s,
build:native about 3 min.

## Lessons from round 1 (read these; they will save hours)

**Working method**

- Write a small `tn.sh file.ts` that runs a snippet under Node and natively
  and prints both. Most bugs reduce to five lines this way.
- `node bin/cli.js --source x.ts --emit-go DIR` writes the Go. Strip the
  line directives with `sed 's#/\*line[^*]*\*/##g'` to read it.
- For a native panic, the recovered error loses the stack. Patch the
  emitted Go's `TnCaught` to print `runtime/debug.Stack()`; import it under
  an alias (`rtdbg`), since vendored code may already have a `debug`.
- Don't rebuild `bin/` while conformance runs: probes compile with it and
  fail spuriously.
- Parity flakes are rare. If a parallel conformance job fails once but passes
  alone (fs-watch timing, the big example build under load), rerun it alone
  before chasing it.

**Self-hosting traps.** These cost the most time in round 1. The native
compiler (the transpiler compiled by itself) has known semantic gaps. Code
you add to `src/transpiler.ts` must avoid them, or `bootstrap:check` fails:

- `map.get(k)` on a missing key returns the zero value (`''`, `0`, `false`),
  not `undefined`. So `m.get(k) ?? fallback` and `if (m.get(k) !== undefined)`
  are wrong natively. Use `m.has(k) ? m.get(k) : undefined`. The same goes for
  `Record` lookups (`Object.hasOwn(rec, k) ? rec[k] : undefined`) and for
  `arr.find()`, which returns `''` for no match (use `filter()[0]` with a
  length check).
- `bool || string` evaluates to a bool, not the string operand. Don't mix
  types in `||` / `&&` value positions.
- A function returning `string | undefined` can yield `''` where JS yields
  `undefined`; prefer `||` over `??` when `''` is never a valid value (Go
  types never are).
- Object literals assigned into `any` slots become Go maps; those can now be
  Map/Set keys (by identity), but don't rely on struct identity for them.
- To find a divergence: emit the same program's Go with both compilers
  (`./native/typenative --emit-go` vs `node bin/cli.js --emit-go`) and diff
  them, after stripping line directives. The first differing line usually
  names the faulty inference rule.
- Helpers `untypedVariable()`, `declaredMemberType()` and
  `getObjectFieldGoType()` already encode the `has()`-first pattern; reuse
  them.

**Transpiler areas you'll likely touch for marked**

- Regexes: `TnRegex` (RE2, with a backtracking engine for lookarounds and
  backreferences), sticky/global flags, `$` replacement patterns, replacer
  callbacks (match, groups…, offset, input) and unmatched groups as
  `undefined` all work now. `new RegExp(src, flags)` with `g`/`y` is
  stateful. Composed regexes (`.source` edited with `.replace`) are new
  territory.
- String positions are code points (UTF-16 units in the BMP), with a cached
  index per long string. Long inputs scanned by regexes were quadratic until
  round 1 fixed the cache eviction; watch for similar hotspots with a
  profiler.
- Profiling: patch the emitted Go's `main()` to call
  `pprof.StartCPUProfile` and `TnProcessExit` to stop it, then `go tool pprof
  -top`. Round 1's wins were the string index cache, cached struct field
  lookups, and resolving `typeof f` as a func type (direct calls instead of
  reflection).

**Known gaps left open (❌ rows)**: a local alias of an array field doesn't
share pushes; an array read from an `any` object into a variable isn't
shared; `x?.m()` on an `any` value with a primitive result gives the zero
value instead of `undefined`; reading a missing `Record` / `Map` key of
primitives gives the zero value. Fix them if marked needs them, with
probes.
