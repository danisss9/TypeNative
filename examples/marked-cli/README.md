# marked CLI

The [`marked`](https://github.com/markedjs/marked) package's own command-line
tool, compiled from its **unmodified** upstream TypeScript source: about 4,000
lines across 13 files, vendored as is in [vendor/marked/](vendor/marked/) (see
[VENDOR.md](vendor/marked/VENDOR.md): no patches). [main.ts](main.ts) ports
upstream's `bin/main.js` to TypeScript. It parses the same options, reads the
markdown from a string, a file or stdin, and prints the HTML or the lexer's
token list.

This is the second test of TypeNative on real code nobody wrote for it. marked
is a markdown parser built on regexes: 66 definitions in `rules.ts`, with GFM
and pedantic variants, many composed at run time by a fluent
`edit(…).replace(…)` builder (44 `edit` calls). Many use lookarounds or backreferences, which
Go's RE2 engine doesn't support, so they run on TypeNative's backtracking
engine. Tokens are structural object types, arrays of tokens are
filled in later through a queue that holds the same arrays, and the `--tokens`
JSON must match V8's key order and leave out `undefined` fields, such as the
title of a link definition that has none.

## Usage

```sh
marked < in.md                  # render markdown to HTML
marked -s '*hi*'                # render a string
marked -i in.md -o out.html     # read a file, write a file
marked --tokens < in.md         # print the token list as JSON
marked --no-gfm --pedantic      # any boolean option of marked.defaults
marked --help                   # all options
```

Differences from `bin/main.js` (listed in main.ts's header): `--help` prints an
option summary instead of opening the man page, `--version` prints the vendored
version, and a config file (`-c`, `~/.marked.json`) must be JSON. A JavaScript
config is a module Node would import and run, which a native binary can't. The
HTML is also flushed before the process exits, under Node too: `bin/main.js`
exits right after writing, which cuts output to a pipe off at 64 KB.

## Run it

With Node.js (24 or later runs the TypeScript directly):

```sh
node main.ts < README.md
```

With TypeNative:

```sh
npx typenative --source main.ts --output dist/marked
./dist/marked < README.md
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/marked-cli/main.ts --output dist/marked
```

## Parity with Node.js

Reproduce with `node parity.mjs [filter]`. The script fetches marked's own spec
suites (`test/specs` at tag `v18.1.2`) into `.cache/` (it isn't committed) and
compiles `main.ts`. It then feeds each case's markdown on stdin to both
runtimes in three modes: default (GFM), `--no-gfm` and `--tokens`. A case's
front matter (`gfm`, `pedantic`, `breaks`) becomes CLI flags, as marked's test
runner turns it into options. stdout, stderr and the exit code must match byte
for byte. The only normalization is on stderr: Node's `    at …` stack frames
are dropped (a native binary has no JS frames to print). Each run has a 10 s
timeout. Failures are written to `.cache/failures/`.

```
2859/2859 cases match (100.00%)
```

That's 953 inputs × 3 modes: CommonMark 0.31.2 (652 examples), GFM 0.29 (28),
marked's own `new` (223) and `original` (22) tests, and its 28 ReDoS
regression inputs. The ReDoS inputs are pathological on purpose, such as 10,000
underscores in a row. Every one of them finishes within the timeout natively
too (see the benchmark notes below for how long they take).

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=30] [throughputRuns=5] [megabytes=10]`.
The script compiles `main.ts`, then times **complete process runs** (spawn to
exit) of `marked` under both runtimes, alternating Node and native runs, and
checks that the two HTML outputs are identical:

- **(a) per-call latency:** marked's own README.md (3.5 KB), the kind of file
  a docs build or a git hook renders once per file.
- **(b) throughput:** 10 MB of generated markdown (headings, paragraphs with
  emphasis, links and code spans, lists, tables, code fences and block quotes,
  from a fixed-seed generator, so every machine gets the same input).

**Environment:** Linux 6.18 container, 4 vCPUs of an Intel Xeon @ 2.10GHz,
Node v24.22.1, Go 1.26.0, TypeNative 0.4.2 (unreleased changes), default
(non-`--release`) build. The binary is 6.3 MB.

(a) `marked < README.md` (3.5 KB), 30 runs each:

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 127.45 ms | 142.92 ms | 143.80 ms | 176.68 ms |
| TypeNative | 17.25 ms  | 20.00 ms  | 20.51 ms  | 29.36 ms  |

(b) `marked < generated.md` (10.0 MB, 114,893 lines), 5 runs each:

| Runtime    | min       | median    | mean      | max       | MB/s (median) |
| ---------- | --------- | --------- | --------- | --------- | ------------- |
| Node.js    | 1,868 ms  | 1,974 ms  | 2,153 ms  | 2,811 ms  | 5.07          |
| TypeNative | 10,113 ms | 10,439 ms | 10,476 ms | 10,951 ms | 0.96          |

**Per call, TypeNative is 7.1x faster** (20 ms vs 143 ms, median). Node's
cost here is mostly startup: it loads and type-strips the 13 TypeScript files
and compiles marked's regexes on every run. That's what you feel when a docs
build or a hook renders one file per process.

**On bulk throughput, TypeNative is 5.3x slower.** On a long input V8's JIT
and its regex engine (Irregexp compiles hot patterns to machine code) run
marked faster than the compiled Go does. In a profile of the native run on
1 MB, lexing takes half the CPU and TypeNative's backtracking regex engine
about a third of it: marked's patterns use lookarounds and backreferences, so
most of them can't run on Go's RE2, and the backtracker interprets them node
by node. Garbage collection takes about a third more on the other cores (each
token is an object, each match a few strings). Both costs grow linearly with
the input, while Node's head start is fixed, so the native binary finishes
first up to about 150–200 KB of markdown per process:

| Input  | Node.js | TypeNative |
| ------ | ------- | ---------- |
| 16 KB  | 153 ms  | 37 ms      |
| 64 KB  | 167 ms  | 96 ms      |
| 128 KB | 182 ms  | 149 ms     |
| 256 KB | 215 ms  | 287 ms     |
| 1 MB   | 377 ms  | 1,051 ms   |

(Medians of 5 full process runs each, same generator.)

The ReDoS inputs show the same split. The 28 of them take 3.4 s natively in
total and 4.1 s under Node, but the worst one, 10,000 underscores
(`quadratic_emstrong_delim`), takes 1.4 s natively against Node's 0.25 s. Each
underscore restarts a pattern that scans the rest of the run, so the work is
quadratic in both engines and the backtracker's constant factor shows.

Getting here fixed performance bugs in TypeNative's runtime and compiler, all
general:

- The backtracking engine converted the whole input to runes on every match
  attempt, making a lexer that matches at each position quadratic. It now
  works on byte offsets.
- A greedy repeat of one character class no longer allocates, and ASCII is
  tested against a table, which took the worst ReDoS input from 6.3 s to 1.4 s.
- A regex whose match must start with certain bytes skips ahead to them, and
  an anchored one fails at once, instead of RE2 scanning the rest of a long
  input on every call.
- Strings built with `+=` in a loop are `strings.Builder`s, so rendering a
  long document is linear.
- Type inference is memoized per query. marked's
  `edit(re).replace(…).replace(…)…` chains took exponential time to compile.
