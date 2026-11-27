// Runs main.ts under Node.js, compiled to JavaScript.
//
// Upstream TypeScript sources use `enum` / `const enum` and namespaces, which
// Node's built-in type-stripping rejects. This compiles main.ts and vendor/
// once into .cache/node/ using the repository's `typescript` package, copies
// lib.*.d.ts from node_modules/typescript/lib/ into .cache/lib/ (shared with
// the native binary so .tsbuildinfo paths match byte-for-byte), and runs
// .cache/node/main.js with the forwarded CLI arguments.
//
// Usage:  node run-node.mjs [tsc args...]
//         node run-node.mjs --build-only  (build only; used by parity.mjs and bench.mjs)

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const outDir = path.join(here, '.cache', 'node');
export const nodeMain = path.join(outDir, 'main.js');
export const tsLibSrc = path.join(repoRoot, 'node_modules', 'typescript', 'lib');

function newestSource(dir, newest = 0) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) newest = newestSource(full, newest);
    else newest = Math.max(newest, fs.statSync(full).mtimeMs);
  }
  return newest;
}

export function copyLibFiles(destLibDir) {
  if (fs.existsSync(path.join(destLibDir, 'lib.es5.d.ts')) && fs.existsSync(path.join(destLibDir, 'lib.d.ts'))) return;
  fs.mkdirSync(destLibDir, { recursive: true });
  for (const name of fs.readdirSync(tsLibSrc)) {
    if (name.startsWith('lib.') && name.endsWith('.d.ts')) {
      fs.copyFileSync(path.join(tsLibSrc, name), path.join(destLibDir, name));
    }
  }
}

export function buildNode() {
  const sources = Math.max(fs.statSync(path.join(here, 'main.ts')).mtimeMs, newestSource(path.join(here, 'vendor')));
  const libDir = path.join(here, '.cache', 'lib');
  const staleNodeLib = path.join(outDir, 'lib');
  if (fs.existsSync(staleNodeLib)) fs.rmSync(staleNodeLib, { recursive: true, force: true });
  copyLibFiles(libDir);
  if (fs.existsSync(nodeMain) && fs.statSync(nodeMain).mtimeMs >= sources) {
    return;
  }

  const ts = createRequire(path.join(repoRoot, 'package.json'))('typescript');
  fs.rmSync(outDir, { recursive: true, force: true });
  const program = ts.createProgram([path.join(here, 'main.ts')], {
    target: ts.ScriptTarget.ES2024,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    rewriteRelativeImportExtensions: true,
    allowImportingTsExtensions: true,
    esModuleInterop: true,
    useDefineForClassFields: false,
    preserveConstEnums: true,
    lib: [],
    types: [],
    noLib: true,
    noCheck: true,
    skipLibCheck: true,
    rootDir: here,
    outDir,
  });
  const result = program.emit();
  for (const d of result.diagnostics) {
    console.error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  }
  fs.writeFileSync(path.join(outDir, 'package.json'), '{ "type": "module" }\n');
  copyLibFiles(libDir);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildNode();
  if (process.argv[2] !== '--build-only') {
    process.argv = [process.argv[0], nodeMain, ...process.argv.slice(2)];
    await import(pathToFileURL(nodeMain).href);
  }
}
