// Runs main.ts under Node.js, compiled to JavaScript.
//
// The vendored mongodb and bson packages use extensionless relative imports
// and TypeScript features (parameter properties, enums, namespaces) that
// Node's strip-only mode rejects. Compiling them once to .cache/node/ with
// the repo's TypeScript compiler matches how the published npm packages run
// under Node.js (dist/lib JavaScript).
//
// Usage:  node run-node.mjs [args...]
//         node run-node.mjs --build   (compile only; used by parity.mjs and bench.mjs)

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

// Node ESM requires explicit `.js` / `/index.js` on relative specifiers.
// TypeScript's `moduleResolution: "bundler"` leaves extensionless specifiers
// as written in upstream `mongodb` / `bson`, so resolve them once after emit.
function fixRelativeImports(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixRelativeImports(full);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    const src = fs.readFileSync(full, 'utf8');
    const fixed = src.replace(
      /(\b(?:from|import)\s+['"])(\.\.?\/[^'"]*|\.\.?)(['"])/g,
      (match, pre, spec, post) => {
        if (spec.endsWith('.js') || spec.endsWith('.mjs') || spec.endsWith('.cjs') || spec.endsWith('.json')) {
          return match;
        }
        const resolved = path.resolve(dir, spec);
        if (fs.existsSync(resolved + '.js')) return `${pre}${spec}.js${post}`;
        if (fs.existsSync(path.join(resolved, 'index.js'))) {
          const clean = spec.endsWith('/') ? spec : `${spec}/`;
          return `${pre}${clean}index.js${post}`;
        }
        return match;
      }
    );
    if (fixed !== src) fs.writeFileSync(full, fixed);
  }
}

export function buildNode() {
  const sources = Math.max(
    fs.statSync(path.join(here, 'main.ts')).mtimeMs,
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
  fixRelativeImports(outDir);
  fs.writeFileSync(path.join(outDir, 'package.json'), '{ "type": "module" }\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildNode();
  if (process.argv[2] !== '--build') {
    process.argv = [process.argv[0], nodeMain, ...process.argv.slice(2)];
    await import(pathToFileURL(nodeMain).href);
  }
}
