# CLI Reference

```sh
typenative [options] [file.ts]
```

Every option accepts both `--flag value` and `--flag=value`. The entry file can be passed with `--source <file>` or as a single bare positional argument (`typenative main.ts --script`). Unknown options exit with code `2`.

## Options

| Flag | Mode | Description |
| --- | --- | --- |
| `--source <file>` | build / script | TypeScript entry file (`.ts` or `.tsx`). Relative imports and npm packages are resolved from its directory. |
| `--output <file>` | build | Destination path for the compiled executable. |
| `--script` | run | Compile to `dist/native` (or `dist/native.exe`) and execute immediately with inherited stdio. Omit `--source` to open an editor prompt. |
| `--new` | scaffold | Create a new TypeNative project directory, check Node.js and Go versions (warning and asking to continue if missing or outdated), and automatically run `npm install`. Pass a positional name or omit it to be prompted. |
| `--skip-checks` | scaffold / build | Skip Node.js and Go version checks. |
| `--skip-install` | scaffold | Skip running `npm install` after scaffolding a new project (`--new`). |
| `--target <os/arch>` | build | Cross-compile for another OS and architecture (e.g., `linux/amd64`, `linux/arm64`, `darwin/arm64`, `windows/amd64`). Run `go tool dist list` for all valid pairs. Not supported with `--script` unless matching the host. |
| `--release` | build / script | Produce a smaller binary by stripping debug symbols and file paths (`-trimpath -ldflags="-s -w"`). |
| `--gui` | build / script | Build as a windowed application on Windows with no console window (`-ldflags=-H=windowsgui`). Ignored on non-Windows targets. |
| `--emit-go <dir>` | build | Write generated Go source files, `go.mod`, embedded assets, and vendored modules to `<dir>` instead of invoking `go build`. You can build manually with `go build -C <dir>`. |
| `--sea-config <file>` | build / script | Embed `node:sea` assets defined in a JSON config file (`{ "assets": { "key": "path" } }`, paths relative to the config file). |
| `--cover` | build / script | Build with Go coverage instrumentation (`-cover -covermode=atomic`) for use with `go:runtime/coverage`. Set `GOCOVERDIR` at runtime to write coverage data on exit. |
| `--profile` | build / script | Instrument the binary to write a Go CPU profile (`runtime/pprof`) on exit to `$TYPENATIVE_CPUPROFILE` (default: `cpu.pprof`). Inspect with `go tool pprof`. |
| `--no-typecheck` | build / script | Skip the TypeScript type-checking pass before transpilation. |
| `-h`, `--help` | info | Print usage information and exit. |
| `-v`, `--version` | info | Print the TypeNative version and exit. |

## Common Workflows

### Cross-compilation

Build a stripped Linux ARM64 binary from macOS, Windows, or Linux:

```sh
npx typenative --source main.ts --output bin/app-linux-arm64 --target linux/arm64 --release
```

Because TypeNative's runtime and vendored Go dependencies are pure Go (no cgo), cross-compilation works out of the box across platforms.

### Inspecting generated Go (`--emit-go`)

```sh
npx typenative --source main.ts --emit-go ./out-go
go build -C ./out-go -o ../myapp
```

This is useful for debugging, auditing generated code, or integrating with custom Go build pipelines.

### Embedding Single Executable Application assets (`--sea-config`)

Create a `sea-config.json`:

```json
{
  "assets": {
    "template": "./assets/index.html",
    "config": "./config.json"
  }
}
```

Build with `--sea-config`:

```sh
npx typenative --source main.ts --output ./bin/app --sea-config sea-config.json
```

At runtime, read embedded assets using `node:sea` (`getAsset`, `getRawAsset`, `getAssetAsBlob`).

### CPU Profiling (`--profile`)

```sh
npx typenative --source main.ts --output ./app --profile
TYPENATIVE_CPUPROFILE=run.pprof ./app
go tool pprof -top -cum ./app run.pprof
```

Combine with `--emit-go` if you want to inspect the exact Go lines referenced in the profile.

### Code Coverage (`--cover`)

```sh
npx typenative --source main.ts --output ./app --cover
mkdir -p covdata
GOCOVERDIR=covdata ./app
go tool covdata percent -i=covdata
```

### Desktop GUI Applications (`--gui`)

```sh
npx typenative --source app.ts --output ./app.exe --gui --release
```

See [Desktop Apps (`@webviewjs/webview`)](desktop-webview.md) for details.

## Diagnostics, Line Directives, and Exit Codes

- **Type errors:** Reported before transpilation in standard TypeScript format (`main.ts:4:7: error TS2322: ...`) with exit code `1`.
- **Unsupported syntax:** Reported with exact source locations (`main.ts:2:1: error: Unsupported syntax: ...`) and exit code `1` before invoking Go.
- **Go build errors & runtime panics:** Generated Go files include `/*line file.ts:line:col*/` directives so `go build` diagnostics and runtime panic stack traces point back to your `.ts` files and line numbers.
- **Script exit codes:** In `--script` mode, the CLI exits with the exact exit code returned by your compiled program.
- **CLI argument errors:** Invalid flags or missing option values exit with code `2`.
