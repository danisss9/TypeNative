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

## Remaining
- [ ] Phase 3: Go TypeScript parser binding (replace the `typescript` npm package at
      transpile time — evaluate Go TS parsers vs embedding a JS runtime like goja)
- [ ] Phase 4: dogfood src/transpiler.ts (2.6k lines): regex /g semantics,
      String.replace with function replacer, JSON.parse result typing, object spread,
      Array.includes on untyped values, default-import namespace stripping (ts.x → x)
- [ ] import.meta.url lowering
- [ ] Phase 5: stage-1/stage-2 bootstrap + run test suite through the native binary
- [ ] Phase 5: CI self-hosting job; README/CHANGELOG updates
