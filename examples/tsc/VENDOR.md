# Vendored TypeScript Compiler (`tsc`) Sources

Upstream, pinned:

| Package | Version | Commit | License | Source |
| --- | --- | --- | --- | --- |
| `typescript` | 6.0.3 | `050880ce59e30b356b686bd3144efe24f875ebc8` | Apache-2.0 | https://github.com/microsoft/TypeScript (`src/compiler/`, `src/tsc/`) |

`vendor/typescript/LICENSE.txt` is kept beside `src/`.

## Reproducing (`node vendor.mjs`)

`vendor.mjs` performs a sparse, blobless checkout of the pinned commit, runs
TypeScript's own `scripts/processDiagnosticMessages.mjs` to generate
`src/compiler/diagnosticInformationMap.generated.ts`, crawls all files reachable
from `src/tsc/tsc.ts`, and copies them into `vendor/typescript/src/` with
strictly mechanical ESM/host edits:

1. **Relative import specifiers:** `.js` extensions rewritten to `.ts` so both
   `run-node.mjs` and TypeNative resolve directly.
2. **`src/compiler/core.ts`:** `isNodeLikeSystem()` drops the CJS-only
   `typeof require !== "undefined"` check so ESM (Node and TypeNative) selects
   the Node host.
3. **`src/compiler/performanceCore.ts`:** Static `import { performance } from "node:perf_hooks"`
   instead of `require("perf_hooks")`.
4. **`src/compiler/tracing.ts`:** Static `import * as _tracingFs from "node:fs"`
   instead of `require("fs")`.
5. **`src/compiler/debug.ts`:** Uses TypeScript's own non-`Object.setPrototypeOf`
   fallback branch for debugger-only display helpers (`attachFlowNodeDebugInfo`,
   `attachNodeArrayDebugInfo`, `attachDebugPrototypeIfDebug`).
6. **`src/compiler/sys.ts`:** Static `node:fs`, `node:path`, `node:os`,
   `node:crypto`, and `node:buffer` imports; `globalThis.gc` instead of CJS
   `global.gc`; `process.argv[1] || process.execPath` instead of CJS
   `__filename`/`__dirname`; `isFileSystemCaseSensitive()` checks `process.cwd()`;
   and optional Node-only dynamic `require("inspector")`, `require("source-map-support")`,
   and `sys.require(...)` degrade cleanly.

No compiler logic (scanner, parser, binder, checker, transformers, emitter,
builder, watch, tsbuild, commandLineParser) is modified.

Standard library declarations (`lib.*.d.ts`) are copied from the repository's
installed `node_modules/typescript/lib/` beside the built outputs rather than
duplicated in git.
