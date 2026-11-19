# Getting Started

This guide walks through installing TypeNative, running your first TypeScript program as a native binary, and configuring a TypeNative project.

## Requirements

- **[Node.js](https://nodejs.org/) v26** or newer (for the npm CLI; self-hosted native binaries do not require Node.js at runtime).
- **[Go](https://go.dev/doc/install) 1.26** or newer on your `PATH`.

TypeNative checks the installed Go version before compiling.

## Installation

You can run TypeNative directly with `npx` without installing it:

```sh
npx typenative --source main.ts --script
```

Or add it to your project as a dev dependency:

```sh
npm install typenative -D
```

## Quick Start

### 1. Run a script directly (`--script`)

Create `hello.ts`:

```ts
console.log('Hello, native world!');
```

Compile and execute it in one step:

```sh
npx typenative --source hello.ts --script
```

TypeNative type-checks `hello.ts`, transpiles it to `dist/code.go`, compiles `dist/native` (or `dist/native.exe` on Windows), runs it with inherited stdio, and forwards its exit code.

### 2. Build a standalone executable (`--output`)

```sh
npx typenative --source main.ts --output ./bin/myapp
# Windows:
npx typenative --source main.ts --output ./bin/myapp.exe
```

For a smaller production binary with symbols and file paths stripped, add `--release`:

```sh
npx typenative --source main.ts --output ./bin/myapp --release
```

### 3. Interactive mode

Run `typenative` without flags to be prompted for the entry file and output path:

```sh
npx typenative
```

Or run in interactive script mode to write and execute a snippet in your editor without saving a file:

```sh
npx typenative --script
```

### 4. Scaffold a new project (`--new`)

```sh
npx typenative --new
```

This prompts for a project name and whether to run `npm install`, then creates:

- `main.ts` — Starter entry point
- `package.json` — Pinned `typenative` dev dependency with `execute` and `build` scripts
- `tsconfig.json` — Configured for the TypeNative type surface
- `README.md` and `.gitignore`

The generated `package.json` scripts are:

```json
{
  "scripts": {
    "execute": "npx typenative --source main.ts --script",
    "build": "npx typenative --source main.ts --output bin/<name>"
  }
}
```

## TypeScript Configuration (`tsconfig.json`)

TypeNative type-checks your code before transpiling using the nearest `tsconfig.json` (or its built-in defaults if none is found). The recommended configuration is:

```json
{
  "compilerOptions": {
    "target": "es2025",
    "useDefineForClassFields": false,
    "lib": [],
    "types": ["typenative", "typenative/go", "typenative/npm"],
    "strict": true
  }
}
```

### Why these options matter

- **`"lib": []`** — Disables TypeScript's default browser/ES library declarations so that TypeNative's own declarations define the exact API surface that transpiles. Anything unsupported fails early during type-checking instead of producing invalid Go.
- **`"types"`** — Loads TypeNative's ambient type declarations:
  - `"typenative"` (`index.d.ts` → `types/typenative.d.ts`): Core JavaScript standard library and Web globals.
  - `"typenative/npm"` (`npm.d.ts` → `types/typenative-npm.d.ts`): Node.js built-in modules (`node:*` and bare names) and `@webviewjs/webview`.
  - `"typenative/go"` (`go.d.ts` → `types/typenative-go.d.ts`): Go standard library bridges (`go:*`).
- **`"useDefineForClassFields": false`** — Preserves classic TypeScript class-field initialization order (`super()`, then parameter properties, then field initializers, then constructor body), which matches how TypeNative compiles classes. Without it, field initializers referencing parameter properties (e.g., `doubled = this.k * 2` with `constructor(public k: number)`) become TypeScript errors on ES2022+ targets.

## Running Programs Under Both Node.js and TypeNative

Programs using standard TypeScript and `node:*` built-ins run unchanged under both Node.js and TypeNative:

```sh
# Run with Node.js (v26+ runs TypeScript directly)
node main.ts

# Run as a native binary with TypeNative
npx typenative main.ts --script
```

See the [examples/](../examples/) directory for complete dual-runtime projects and benchmarks.

## Next Steps

- Read the [CLI Reference](cli.md) for cross-compilation, asset embedding, and profiling flags.
- Explore the [Language Guide](language-guide.md) to learn how TypeScript constructs map to Go.
- Browse the [Standard Library](standard-library.md), [Node.js Built-ins](node-builtins.md), and [Go Interop](go-interop.md) references.
