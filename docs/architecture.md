# Architecture & Self-Hosting

This document describes how TypeNative compiles TypeScript to native executables, how the self-hosted native compiler works, and how the repository is organized.

## Compilation Pipeline

```text
main.ts ──► Type-check ──► Parse (normalized JSON AST) ──► transpileToNative() ──► dist/*.go + go.mod ──► go build ──► native binary
```

1. **Type-check**
   - **Node CLI (`src/typecheck-node.ts`):** Builds a TypeScript program using the `typescript` npm package against the nearest `tsconfig.json` (or TypeNative's defaults: `lib: []` + `types/`).
   - **Self-hosted binary (`tsparser/check.go`):** Invokes `tsparser --check`, running the same type-check on `typescript-go`.
   - Any type error prints `file.ts:line:col: error TSxxxx: ...` and exits with code `1`.

2. **Parse**
   - **Node CLI (`src/parse-node.ts`):** Parses source with `typescript` and serializes a normalized JSON AST (`{ kind: "Xxx", line, column, ... }`).
   - **Self-hosted binary (`src/parse-native.ts`):** Spawns the Go `tsparser` binary (`tsparser/main.go`), which emits the exact same JSON AST schema.
   - Because both parsers produce the same JSON shape, a single transpiler consumes either without depending on the `typescript` npm package.

3. **Transpile (`src/transpiler.ts`)**
   - `transpileToNative(code, options)` walks the normalized AST and lowers it to Go, resolving relative imports, npm packages, `node:*` built-ins (`src/node/`), and `go:*` bridges (`src/go/`).
   - Emits `/*line file.ts:line:col*/` directives so Go compiler errors and runtime stack traces map back to your `.ts` lines.
   - Returns `TranspileResult`:
     ```ts
     export type TranspileResult = {
       main: string;
       files: Map<string, string>;
       diagnostics: TranspileDiagnostic[];
       embeds: string[];
     };
     ```
   - Unsupported syntax produces a diagnostic and stops the build before invoking Go.

4. **Build & Offline Vendoring (`src/index.ts`)**
   - `run(opts)` writes `dist/code.go` (plus one `.go` file per imported module), `dist/go.mod`, any `//go:embed` files, and optional `tn_sea.go` (`--sea-config`) or CPU profile hooks (`--profile`).
   - Third-party pure-Go modules needed by the program (such as `modernc.org/sqlite` for `node:sqlite`, Brotli for `node:zlib`, `fsnotify` for `fs.watch`, `wazero` for WebAssembly/WASI, `purego` for `node:ffi`, `golang.org/x/net` for `node:http2`, and `golang.org/x/text` for `Intl`) are copied from `govendor/` (or `GOROOT`) into `dist/tnvendor` and wired via `replace` directives in `dist/go.mod`. Builds stay **100% offline** and require **no cgo**.
   - Invokes `go build -C dist` (with `GOOS`/`GOARCH` for `--target`, `-trimpath -ldflags="-s -w"` for `--release`, `-H=windowsgui` for `--gui`, `-cover -covermode=atomic` for `--cover`).
   - Executes the binary (`--script`) or copies it to `--output`.

## Repository Layout

| Path | Role |
| --- | --- |
| `src/cli.ts` | Node.js CLI entry point (handles `inquirer` interactive prompts and delegates to `src/index.ts`). |
| `src/main.ts` | Self-hosted native CLI entry point (uses `src/prompt.ts` and `src/parse-native.ts`). |
| `src/index.ts` | Core compiler orchestration (`run`, `createProject`, `parseCliArgs`, `usage`, `checkGo`). |
| `src/transpiler.ts` | AST-to-Go transpiler (`transpileToNative`) and core JS runtime helpers. |
| `src/regex_vm.ts` | Backtracking regex VM for JS features RE2 does not support (lookahead, lookbehind, backreferences). |
| `src/node/` | `node:*` module implementations and `registry.ts` (maps JS/Node APIs to Go helpers). |
| `src/go/` | `go:*` bridge (`bridge.ts`, `convert.ts`, `metadata.ts`, `overrides.ts`, `stdlib.generated.ts`). |
| `tsparser/` | Go parser and type-checker binary (`main.go`, `check.go`) used by the self-hosted compiler. |
| `types/` | Ambient `.d.ts` contract (`typenative.d.ts`, `typenative-npm.d.ts`, `typenative-go.d.ts`). |
| `govendor/` | Offline vendored pure-Go third-party modules (managed by `scripts/vendor-go.mjs`). |
| `conformance/` | Runnable TypeScript probes backing [conformance.md](../conformance.md). |
| `performance/` | Micro-benchmark probes backing [performance/README.md](../performance/README.md). |
| `examples/` | Full dual-runtime example apps and benchmarks. |
| `scripts/` | Build, conformance, bootstrap, performance, and codegen scripts. |

## Self-Hosted Native Compiler

TypeNative compiles itself. `src/main.ts` (along with `src/index.ts`, `src/transpiler.ts`, `src/node/*`, and `src/go/*`) transpiles to Go and builds into a standalone `typenative` binary that needs no Node.js at runtime and emits identical Go to the npm CLI.

### Building the native compiler

```sh
npm run build           # Compile TypeScript -> bin/
npm run build:native    # Builds native/tsparser and native/typenative
```

Run it directly:

```sh
./native/typenative --source app.ts --script
```

If you relocate the binaries separately, set `TYPENATIVE_TSPARSER=/path/to/tsparser` to override parser discovery.

### Verifying parity and bootstrap fixpoint

```sh
npm run bootstrap:check                       # Verifies native/typenative reproduces its own Go
node scripts/conformance.mjs --native         # Runs conformance suite through native/typenative
node scripts/conformance-parallel.mjs --native
```

### The Transpilability Rule

Because the compiler self-hosts, `src/index.ts`, `src/transpiler.ts`, `src/main.ts`, `src/prompt.ts`, `src/parse-native.ts`, `src/node/*`, and `src/go/*` must remain transpilable by TypeNative itself. Node-only dependencies (such as `inquirer` and `typescript`) live strictly in `src/cli.ts`, `src/parse-node.ts`, and `src/typecheck-node.ts` and are injected via `RunOptions`.

## Testing & Performance

- **Conformance suite:** `npm test` (or `npm run conformance:parallel`) type-checks, transpiles, builds, and executes every probe in `conformance/` plus builds all `examples/*/main.ts`. Filter with `node scripts/conformance.mjs <substring>`.
- **Go type-check:** `npm run check:go-types` validates `lib-go-*` probes against `types/typenative-go.d.ts`.
- **Performance suite:** `npm run perf` runs interleaved Node.js vs. TypeNative micro-benchmarks in `performance/` and verifies matching checksums. See [performance/README.md](../performance/README.md) for profiling tips.
