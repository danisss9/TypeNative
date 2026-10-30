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

**Environment:** Linux 6.18 container, 4 vCPUs of an Intel Xeon @ 2.80GHz,
Node v24.22.2, Go 1.26.0, TypeNative 0.4.2 (unreleased changes), default
(non-`--release`) build. The binary is 7.2 MB.

(a) `yaml --json < docker-compose.yml`, 30 runs each:

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 189.77 ms | 213.05 ms | 218.10 ms | 264.74 ms |
| TypeNative | 6.36 ms   | 8.07 ms   | 8.23 ms   | 12.28 ms  |

(b) `yaml --json < manifests.yaml` (10.0 MB), 5 runs each:

| Runtime    | min       | median    | mean      | max       | MB/s (median) |
| ---------- | --------- | --------- | --------- | --------- | ------------- |
| Node.js    | 3,226 ms  | 3,368 ms  | 3,403 ms  | 3,630 ms  | 2.97          |
| TypeNative | 12,477 ms | 12,813 ms | 12,867 ms | 13,141 ms | 0.78          |

**Per call, TypeNative is 26x faster** (8 ms vs 213 ms, median). Node's
cost here is mostly startup. It loads and type-strips the 78 TypeScript
files on every run before it reads a byte of input. That's what you feel
when a tool calls the converter once per file.

**On bulk throughput, TypeNative is 3.8x slower.** Once V8's JIT has warmed
up on a long input, it runs this code faster than the compiled Go does. The
library passes its values around as structural object types and unions
(`Scalar | YAMLMap | YAMLSeq | Pair`, CST tokens), which TypeNative holds as
`interface{}`. Property reads and calls on them go through reflection, and a
value handed to a parameter of a narrower object type is copied field by
field. Garbage collection takes about a fifth of the native run. Both costs
grow linearly with input size, while Node's head start is fixed, so the
native binary finishes first up to about 150–200 KB of YAML per process:

| Input  | Node.js | TypeNative |
| ------ | ------- | ---------- |
| 16 KB  | 265 ms  | 32 ms      |
| 64 KB  | 281 ms  | 98 ms      |
| 128 KB | 313 ms  | 229 ms     |
| 1 MB   | 648 ms  | 1,354 ms   |

(Medians of 5 full process runs each, same generator.)

Getting here fixed three performance bugs in TypeNative's runtime, all
general:

- Long strings' code-point indexes were evicted by the many short slices a
  lexer takes, so every sticky-regex match rebuilt the index of the whole
  input. That made lexing quadratic: about 23 s for 1 MB before (measured on
  a loaded machine), 1.4 s after.
- Struct field lookups by name are cached per type.
- `typeof f` types are func types, so the composer's callbacks are called
  directly instead of through reflection.
