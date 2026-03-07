**index.ts needs:**

| Feature                         | Example                                                             |
| ------------------------------- | ------------------------------------------------------------------- |
| Default imports                 | `import inquirer from 'inquirer'`, `import fs from 'fs-extra'`      |
| `process` global                | `process.argv`, `process.platform`                                  |
| Array `findIndex`               | `process.argv.findIndex(a => a === '--script')`                     |
| `JSON.parse` / `JSON.stringify` | `JSON.parse(fs.readFileSync(...))`, `JSON.stringify(pckg, null, 2)` |
| Named async IIFE                | `(async function main() { ... })()`                                 |

**transpiler.ts additionally needs:**

| Feature                             | Example                                             |
| ----------------------------------- | --------------------------------------------------- |
| Default imports                     | `import ts from 'typescript'`                       |
| Spread in array literals            | `[...importedPackages]`, `[...arr1, ...arr2]`       |
| `for...of` with tuple destructuring | `for (const [funcName, fn] of Object.entries(...))` |
| `Object.entries()`                  | `Object.entries(mapping.functions)`                 |
| Arrow function IIFE                 | `(() => { ... })()`                                 |
| Array `findIndex`                   | `parameters.findIndex(p => !!p.initializer)`        |

**Priority order** (most blocking first):

1. **Default imports** — used at the top of both files, nothing runs without this
2. **Spread in array literals** — used throughout transpiler.ts for array construction
3. **`for...of` with tuple destructuring + `Object.entries`** — used for iterating import mappings
4. **`process` global** — core to CLI argument parsing in index.ts
5. **IIFE** — the entire entry point of index.ts is an async IIFE
6. **`findIndex`**, **`JSON.parse/stringify`** — utility methods used in both files
