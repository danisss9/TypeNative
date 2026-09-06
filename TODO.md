# Self-Hosting Roadmap

Goal: TypeNative transpiles itself into a native Go binary (1.0 milestone).

## Done
- [x] node:fs mappings (read/write/append/exists/mkdir/readdir/copy/rm) via Go helpers
- [x] node:url (fileURLToPath/pathToFileURL), node:os (platform/homedir/tmpdir)
- [x] node:child_process (spawnSync-shaped sync API, stdio-inherit runs)
- [x] node:readline sync `question` (stdin prompts in native binaries)
- [x] Go helper-function registry emitted into the main output file
- [x] Per-file import scoping (imports registered after function-body visits)
- [x] Unbraced if/else-if/else statements, `%`/`%=` → math.Mod
- [x] nanoid/fs-extra/execa removed from src; inquirer isolated in Node-only cli.ts
- [x] Transpilable core: src/index.ts (run/createProject), src/prompt.ts, src/main.ts (self-host entry)

## Done (phase 3a/3b)
- [x] tsparser/ Go tool: parses TS via buke/typescript-go-internal (no JS runtime),
      emits normalized JSON AST (kind + TS-spec field names)
- [x] src/parse-node.ts: Node adapter (typescript npm pkg → same JSON shape)
- [x] Verified byte-identical AST signatures across all 32 test specs AND all
      compiler sources (incl. transpiler.ts, 521k-char signature)

- [x] ts shim converted to plain isX() functions + string kind literals
      (object-literal shim was itself untranspilable)
- [x] Phase 3c: transpiler.ts no longer imports `typescript` — consumes the JSON AST
      via an injected parse function (ts shim keeps predicate call sites); operator
      tokens, process.env, stdin-exec mappings added; verified identical Go output
      via npm parser and Go-parser paths on all 33 test specs
- [ ] Phase 4: dogfood src/transpiler.ts (2.6k lines): regex /g semantics,
      String.replace with function replacer, JSON.parse result typing, object spread,
      Array.includes on untyped values, default-import namespace stripping (ts.x → x)
- [ ] import.meta.url lowering
- [ ] Phase 5: stage-1/stage-2 bootstrap + run test suite through the native binary
- [ ] Phase 5: CI self-hosting job; README/CHANGELOG updates
