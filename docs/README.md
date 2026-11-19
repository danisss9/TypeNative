# TypeNative Documentation

Welcome to the **TypeNative** documentation. TypeNative is a TypeScript-to-Go transpiler that compiles TypeScript programs into standalone, single-file native executables with no Node.js runtime and no bundler required.

> **Source of truth for feature support:** Every supported language construct and library API is backed by a runnable probe in [conformance.md](../conformance.md).

## Documentation Index

### Guides & CLI

| Document | Description |
| --- | --- |
| [Getting Started](getting-started.md) | Requirements, installation, quick start, project scaffolding (`--new`), and `tsconfig.json` setup. |
| [CLI Reference](cli.md) | Complete command-line reference: build modes, cross-compilation (`--target`), release builds, `--gui`, `--emit-go`, `--sea-config`, `--profile`, `--cover`, and diagnostics. |
| [Language Guide](language-guide.md) | Supported TypeScript syntax and semantics, TypeScript-to-Go type mappings, npm package imports, and known limitations. |

### Library Reference

| Document | Description |
| --- | --- |
| [Standard Library & Web Globals](standard-library.md) | Built-in JavaScript types (`Array`, `Object`, `String`, `Map`, `Set`, `Promise`, `Date`, `RegExp`, `Temporal`, `Intl`, `WebAssembly`, …) and Web APIs (`fetch`, `WebSocket`, `URLPattern`, Streams, `Blob`, `FormData`, …). |
| [Node.js Built-in Modules (`node:*`)](node-builtins.md) | Reference for all supported `node:*` modules (`fs`, `path`, `http`, `http2`, `crypto`, `sqlite`, `ffi`, `wasi`, `test`, `worker_threads`, `sea`, …), event-loop model, and runtime notes. |
| [Go Interoperability (`go:*`)](go-interop.md) | Calling Go standard library packages directly from TypeScript, type conversions, `GoError`, channels, out-params, Go interfaces, and `//go:embed`. |
| [Desktop Apps (`@webviewjs/webview`)](desktop-webview.md) | Building native GUI applications with embedded WebView2 / browser app mode, IPC, menus, tray icons, notifications, and custom protocols. |

### Internals & Ecosystem

| Document | Description |
| --- | --- |
| [Architecture & Self-Hosting](architecture.md) | Compiler pipeline, AST normalization, Go code generation, offline vendoring, self-hosted native compiler (`tsparser`), and internal APIs. |

---

## Additional Repository Resources

- **[README.md](../README.md)** — Project overview and headline benchmarks.
- **[conformance.md](../conformance.md)** — Full ✅ / ❌ / 🚫 feature matrix linked to runnable probes in [conformance/](../conformance/).
- **[examples/README.md](../examples/README.md)** — Complete runnable apps and Node.js vs. TypeNative benchmarks (from `hello-world` and `json-server` to `desktop-notes`, `yaml-cli`, `marked-cli`, `angular-templates`, and `react-compiler`).
- **[performance/README.md](../performance/README.md)** — Micro-benchmark suite for hot paths, profiling workflow, and optimization findings.
- **[CONTRIBUTION.md](../CONTRIBUTION.md)** — Contributor guide, feature workflow, and the self-hosting transpilability rule.
- **[CHANGELOG.md](../CHANGELOG.md)** — Release history and notable changes.
