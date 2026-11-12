// Runs main.ts under Node.js, compiled to JavaScript.
//
// Node runs TypeScript itself only by stripping types (Node 26 removed
// --experimental-transform-types), and Angular's compiler source uses enums
// and other syntax that mode rejects. So this compiles main.ts and every file
// it imports to JavaScript with the `typescript` package of this repository
// (into .cache/node/, rebuilt when a source file is newer than the build),
// then runs .cache/node/main.js with the given arguments. That is also how the
// compiler runs for Node users: the published @angular/compiler is JavaScript.
//
// Usage:  node run-node.mjs [template.html]
//         node run-node.mjs --build      (build only; used by parity.mjs and bench.mjs)

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '.cache', 'node');
export const nodeMain = path.join(outDir, 'main.js');

function newestSource(dir, newest = 0) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) newest = newestSource(full, newest);
    else newest = Math.max(newest, fs.statSync(full).mtimeMs);
  }
  return newest;
}

export function buildNode() {
  const sources = Math.max(
    fs.statSync(path.join(here, 'main.ts')).mtimeMs,
    fs.statSync(path.join(here, 'dom-type-stubs.ts')).mtimeMs,
    newestSource(path.join(here, 'vendor'))
  );
  if (fs.existsSync(nodeMain) && fs.statSync(nodeMain).mtimeMs >= sources) return;

  const ts = createRequire(path.join(here, '..', '..', 'package.json'))('typescript');
  fs.rmSync(outDir, { recursive: true, force: true });
  const program = ts.createProgram([path.join(here, 'main.ts')], {
    target: ts.ScriptTarget.ES2024,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    rewriteRelativeImportExtensions: true,
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    lib: [],
    types: [],
    noLib: true,
    noCheck: true,
    skipLibCheck: true,
    rootDir: here,
    outDir,
  });
  const result = program.emit();
  for (const d of result.diagnostics) console.error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  fs.writeFileSync(path.join(outDir, 'package.json'), '{ "type": "module" }\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildNode();
  if (process.argv[2] !== '--build') {
    process.argv = [process.argv[0], nodeMain, ...process.argv.slice(2)];
    await import(pathToFileURL(nodeMain).href);
  }
}
