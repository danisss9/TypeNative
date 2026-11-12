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

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600 (6 cores, 12 threads),
Node v26.13.0, Go 1.27.4, TypeNative 0.5.0 (unreleased changes), default
(non-`--release`) build. The binary is 6.5 MB.

(a) `marked < README.md` (3.5 KB), 30 runs each:

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 112.27 ms | 118.78 ms | 119.48 ms | 128.69 ms |
| TypeNative | 13.10 ms  | 14.12 ms  | 20.74 ms  | 210.83 ms |

(b) `marked < generated.md` (10.0 MB, 114,893 lines), 5 runs each:

| Runtime    | min      | median   | mean     | max      | MB/s (median) |
| ---------- | -------- | -------- | -------- | -------- | ------------- |
| Node.js    | 1,187 ms | 1,197 ms | 1,197 ms | 1,206 ms | 8.35          |
| TypeNative | 1,880 ms | 1,890 ms | 1,909 ms | 1,968 ms | 5.29          |

**Per call, TypeNative is 8.4x faster** (14 ms vs 119 ms, median). Node's
cost here is mostly startup: it loads and type-strips the 13 TypeScript files
and compiles marked's regexes on every run. That's what you feel when a docs
build or a hook renders one file per process.

**On bulk throughput, TypeNative is 1.6x slower.** On a long input V8's JIT
and its regex engine (Irregexp compiles hot patterns to machine code) still run
marked faster than the compiled Go does. In a profile of the native run on
10 MB, about 30% of the main thread is TypeNative's regex VM, which interprets
marked's patterns where Irregexp runs them as machine code, and allocation is
about 15%: each token is an object and each match a few strings. Garbage
collection runs on other cores and hardly affects the wall clock. Both costs
grow linearly with the input, while Node's head start is fixed, so the native
binary finishes first up to about 1–1.5 MB of markdown per process:

| Input  | Node.js | TypeNative |
| ------ | ------- | ---------- |
| 512 KB | 162 ms  | 100 ms     |
| 1 MB   | 203 ms  | 186 ms     |
| 2 MB   | 294 ms  | 359 ms     |

(Medians of 5 full process runs each, same generator.)

The ReDoS inputs now favor the native binary: all of them together take 4.7 s
natively and 13 s under Node, though most of Node's time there is starting up
once per input. The slowest native case, `quadratic_inline_masking`, takes
0.7 s against Node's 0.9 s.

Getting here fixed performance bugs in TypeNative's runtime and compiler, all
general:

- Every regex now runs on one engine, a backtracking VM with JS semantics, in
  place of Go's RE2 for simple patterns and a closure-based matcher for the
  rest. A match allocates only its result. First-byte sets, literal prefixes
  and anchors reject most calls without running anything, which matters here
  because 83% of marked's 1.5 million regex calls per MB miss. RE2 remains as a
  fallback: a pattern it can run that exhausts the VM's step budget switches to
  it, so those patterns keep their linear-time guarantee.
- Regex literals are compiled once, however many times they're evaluated.
- `a += b` on a long string held as any is amortized: the string is extended
  in place when it ends where its buffer's written part ends. It used to copy
  on every append, which made the worst ReDoS input take over 10 s.
- Strings built with `+=` in a loop are `strings.Builder`s, so rendering a
  long document is linear.
- Short ASCII strings need no code-point index, and slices of a long non-ASCII
  string share its index instead of rebuilding it.
- Type inference is memoized per query. marked's
  `edit(re).replace(…).replace(…)…` chains took exponential time to compile.
