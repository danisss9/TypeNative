# yaml CLI

The [`yaml`](https://github.com/eemeli/yaml) package's own command-line tool,
compiled from its **unmodified** upstream TypeScript source: about 11,000
lines across 78 files, vendored as is in [vendor/yaml/](vendor/yaml/) (see
[VENDOR.md](vendor/yaml/VENDOR.md): no patches). [main.ts](main.ts) ports
upstream's `bin.js` to TypeScript. It hands stdin and the arguments to the
library's `cli()` and turns the error it reports into an exit code.

This is a test of TypeNative on real code nobody wrote for it: a lexer and
parser driven by sticky regexes, class hierarchies with overrides (an
`Array` subclass among them), structural object types passed between
modules, `Object.assign` and `Object.defineProperty` on class instances,
Maps keyed by nodes, and JSON output whose key order and number formatting
must match V8's.

## Usage

```sh
yaml < in.yaml             # re-emit the YAML stream
yaml --json < in.yaml      # print it as JSON
yaml valid < in.yaml       # exit 1 on the first error
yaml lex < in.yaml         # print the lexer's tokens
yaml cst < in.yaml         # print the concrete syntax tree
yaml --help                # all options (--indent, --single, --strict, …)
```

## Run it

With Node.js (24 or later runs the TypeScript directly):

```sh
node main.ts --json < docker-compose.yml
```

With TypeNative:

```sh
npx typenative --source main.ts --output dist/yaml
./dist/yaml --json < docker-compose.yml
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/yaml-cli/main.ts --output dist/yaml
```

## Parity with Node.js

Reproduce with `node parity.mjs [filter]`. The script fetches the
[yaml-test-suite](https://github.com/yaml/yaml-test-suite) at tag
`data-2022-01-17` into `.cache/` (it isn't committed) and compiles `main.ts`.
It then feeds each test's `in.yaml` to both runtimes in each of four modes:
default (re-emit), `--json`, `valid` and `lex`. stdout, stderr and the exit
code must match byte for byte. The only normalization is on stderr: Node's
`    at …` stack frames are dropped (a native binary has no JS frames to
print), and warnings' `(node:PID)` becomes `(node)`. Failures are written to
`.cache/failures/`.

```
1608/1608 cases match (100.00%)
```

That's 402 inputs × 4 modes. They include the error cases: invalid YAML
reports the same `YAMLParseError`s (message, code, positions and the
source excerpt with its caret line) and exits with the same code. Warnings
such as `Keys with collection values will be stringified…` print the same
`process.emitWarning` lines.

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=30] [throughputRuns=5] [megabytes=10]`.
The script compiles `main.ts`, then times **complete process runs** (spawn to
exit) of `yaml --json` under both runtimes, alternating Node and native runs,
and checks that the two JSON outputs are identical:

- **(a) per-call latency:** a 1.4 KB docker-compose.yml (five services,
  anchors, flow collections, a folded scalar), the kind of file a script or a
  git hook converts once.
- **(b) throughput:** 10 MB of generated Kubernetes manifests (13,140
  Deployments, Services and ConfigMaps in one stream, from a fixed-seed
  generator, so every machine gets the same input).

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U (6 cores, 12 threads),
Node v24.19.0, Go 1.26.0, TypeNative 0.5.0 (unreleased changes), default
(non-`--release`) build. The binary is 7.6 MB.

(a) `yaml --json < docker-compose.yml`, 30 runs each:

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 257.78 ms | 270.89 ms | 270.09 ms | 289.13 ms |
| TypeNative | 15.29 ms  | 16.89 ms  | 17.84 ms  | 33.25 ms  |

(b) `yaml --json < manifests.yaml` (10.0 MB), 5 runs each:

| Runtime    | min      | median   | mean     | max      | MB/s (median) |
| ---------- | -------- | -------- | -------- | -------- | ------------- |
| Node.js    | 2,487 ms | 2,576 ms | 2,720 ms | 3,406 ms | 3.88          |
| TypeNative | 6,051 ms | 6,065 ms | 6,214 ms | 6,517 ms | 1.65          |

**Per call, TypeNative is 16x faster** (17 ms vs 271 ms, median). Node's
cost here is mostly startup. It loads and type-strips the 78 TypeScript
files on every run before it reads a byte of input. That's what you feel
when a tool calls the converter once per file.

**On bulk throughput, TypeNative is 2.4x slower.** Once V8's JIT has warmed
up on a long input, it runs this code faster than the compiled Go does, in
every phase rather than in one bad spot: lexing, parsing and composing each
take about twice as long as under Node. The library passes its values around as
structural object types and unions (`Scalar | YAMLMap | YAMLSeq | Pair`, CST
tokens), which TypeNative holds as `interface{}`, so the cost is spread across
property reads, conversions between object types and allocation, which alone
takes about a fifth of the main thread. Garbage collection runs on other cores
and hardly affects the wall clock. These costs grow linearly with input size,
while Node's head start is fixed, so the native binary finishes first up to
about 1 MB of YAML per process:

| Input  | Node.js | TypeNative |
| ------ | ------- | ---------- |
| 512 KB | 459 ms  | 334 ms     |
| 1 MB   | 610 ms  | 632 ms     |
| 2 MB   | 865 ms  | 1,235 ms   |

(Medians of 5 full process runs each, same generator.)

Getting here fixed performance bugs in TypeNative's runtime, all general:

- Long strings' code-point indexes were evicted by the many short slices a
  lexer takes, so every sticky-regex match rebuilt the index of the whole
  input. That made lexing quadratic.
- Properties of objects held as any are read and written through plans cached
  per type and key, with no lock, string hash or reflection on a hit. A read
  that's consumed on the spot, such as a comparison, doesn't box the value.
- `obj.list.push(x)` on an object held as any appends in place. It used to
  convert the whole array on every push, which made building a list quadratic.
- Conversions between object types are compiled once per pair of types.
- `switch` on a value held as any compiles to a string switch when its cases
  are string literals.
- Regexes run on a VM that works on byte offsets, so a sticky match on a 10 MB
  input costs no more than one on a short string.
- `typeof f` types are func types, so the composer's callbacks are called
  directly instead of through reflection.
