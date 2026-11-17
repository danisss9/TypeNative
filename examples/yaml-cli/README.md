# yaml CLI

The [`yaml`](https://github.com/eemeli/yaml) package's own command-line tool,
compiled from its **unmodified** upstream TypeScript source: about 11,000
lines across 78 files, vendored as is in [vendor/yaml/](vendor/yaml/) (see
[VENDOR.md](vendor/yaml/VENDOR.md): no patches). [main.ts](main.ts) ports
upstream's `bin.js` to TypeScript. It hands stdin and the arguments to the
library's `cli()` and turns the error it reports into an exit code. For
`yaml --json` on a large, plain stream it splits the input before the `---`
lines that start its documents and composes runs of them in parallel workers,
then joins their JSON arrays; any directive, error, warning, CR line ending or
non-scalar map key sends the whole input back through `cli()`.

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

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600 (6 cores, 12 threads),
Node v26.13.0, Go 1.27.4, TypeNative 0.7.0, default
(non-`--release`) build.

(a) `yaml --json < docker-compose.yml`, 30 runs each:

| Runtime    | min       | median    | mean      | max       |
| ---------- | --------- | --------- | --------- | --------- |
| Node.js    | 104.46 ms | 106.84 ms | 108.99 ms | 121.29 ms |
| TypeNative | 8.84 ms   | 9.43 ms   | 10.51 ms  | 43.75 ms  |

(b) `yaml --json < manifests.yaml` (10.0 MB), 5 runs each:

| Runtime    | min      | median   | mean     | max      | MB/s (median) |
| ---------- | -------- | -------- | -------- | -------- | ------------- |
| Node.js    | 852.59 ms | 862.44 ms | 859.11 ms | 864.16 ms | 11.60        |
| TypeNative | 762.03 ms | 779.90 ms | 776.40 ms | 781.36 ms | 12.83        |

**Per call, TypeNative is 11.3x faster** (9 ms vs 107 ms, median). Node's
cost here is mostly startup. It loads and type-strips the 78 TypeScript
files on every run before it reads a byte of input. That's what you feel
when a tool calls the converter once per file.

**On bulk throughput the two are close** (780 ms vs 862 ms, median; 12.8 vs
11.6 MB/s). Both runtimes take the split-and-workers path for this input, so
Node pays six worker startups while the native binary pays almost none; that
largely cancels the native single-process deficit in this benchmark. Without
the workers, the native process takes about 3.1 s for the same 10 MB against
Node's 1.5 s.
Once V8's JIT has warmed up, it runs this dynamic object-heavy code faster:
the library passes structural object types and unions (`Scalar | YAMLMap |
YAMLSeq | Pair`, CST tokens) that TypeNative holds as `interface{}`, so the
cost is spread across property reads, conversions and allocation. Garbage
collection runs on other cores and hardly affects the wall clock.

Getting here fixed performance bugs in TypeNative's runtime, all general:

- Long strings' code-point indexes were evicted by the many short slices a
  lexer takes, so every sticky-regex match rebuilt the index of the whole
  input. That made lexing quadratic.
- Properties of objects held as any are read and written through plans cached
  per type and key, with no lock, string hash or reflection on a hit. A read
  that's consumed on the spot, such as a comparison, doesn't box the value.
- `obj.list.push(x)` on an object held as any appends in place. It used to
  convert the whole array on every push, which made building a list quadratic.
- Single-value pushes grow the backing slice by 2x, not Go's 1.25x: building
  the lexer's 3.2 million tokens copies the array out about five times over
  otherwise. This alone cuts roughly 40 ms from lexing and 50 ms from compose.
- Conversions between object types are compiled once per pair of types; a
  fresh local object converted once copies without an identity entry, and a
  conversion between two statically known struct types is a struct literal.
  Conversion identity holds one weak pointer per entry and sweeps dead ones
  in batches.
- `Object.assign({ defaults }, typedSource)` sets fields directly instead of
  reflecting over them, `obj[key] = v` on a plain object skips reflection,
  and `s += chunk` for an untyped chunk appends in place.
- An optional call or chain whose value is only tested returns its primitive
  directly instead of boxing it into a pointer first.
- `switch` on a value held as any compiles to a string switch when its cases
  are string literals.
- Regexes run on a VM that works on byte offsets, so a sticky match on a 10 MB
  input costs no more than one on a short string.
- `typeof f` types are func types, so the composer's callbacks are called
  directly instead of through reflection.
