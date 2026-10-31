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

BENCH_RESULTS
