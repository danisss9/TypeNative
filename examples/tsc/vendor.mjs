// Re-creates vendor/ from the pinned upstream TypeScript v6.0.3 sources.
//
// Fetches microsoft/TypeScript at commit 050880ce59e30b356b686bd3144efe24f875ebc8
// (the exact gitHead of typescript@6.0.3 in package.json) into .cache/upstream/,
// generates diagnosticInformationMap.generated.ts using TypeScript's own
// processDiagnosticMessages.mjs script, crawls every file reachable from
// src/tsc/tsc.ts, and copies them into vendor/typescript/ with mechanical ESM
// edits only:
//
//   * relative `.js` import/export specifiers become `.ts`;
//   * Node host dynamic `require("fs" | "path" | "os" | "crypto" | "perf_hooks")`
//     in sys.ts, tracing.ts, and performanceCore.ts become static `node:*` imports;
//   * `isNodeLikeSystem()` drops the CJS-only `typeof require !== "undefined"` check;
//   * CJS `__filename`/`__dirname` and optional dynamic `require("inspector" |
//     "source-map-support" | modulePath)` in sys.ts degrade cleanly for ESM and
//     native compilation.
//
// No compiler logic (scanner, parser, binder, checker, transformers, emitter,
// builder, watch, tsbuild) is modified.
//
// Usage:  node vendor.mjs

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const ts = createRequire(path.join(repoRoot, 'package.json'))('typescript');
const upstream = path.join(here, '.cache', 'upstream', 'typescript');
const vendor = path.join(here, 'vendor', 'typescript');

const TS_COMMIT = '050880ce59e30b356b686bd3144efe24f875ebc8';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed`);
    process.exit(1);
  }
}

function fetchUpstream() {
  if (fs.existsSync(path.join(upstream, '.done'))) return;
  fs.rmSync(upstream, { recursive: true, force: true });
  fs.mkdirSync(upstream, { recursive: true });
  console.log(`Fetching microsoft/TypeScript @ ${TS_COMMIT.slice(0, 10)} ...`);
  const git = (...args) => run('git', ['-C', upstream, ...args]);
  git('init', '--quiet');
  git('remote', 'add', 'origin', 'https://github.com/microsoft/TypeScript.git');
  git(
    'sparse-checkout',
    'set',
    '--no-cone',
    '/src/compiler/',
    '/src/tsc/',
    '/scripts/processDiagnosticMessages.mjs',
    '/LICENSE.txt',
    '/package.json',
  );
  git('fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', TS_COMMIT);
  git('checkout', '--quiet', 'FETCH_HEAD');
  fs.writeFileSync(path.join(upstream, '.done'), '');
}

fetchUpstream();

// Generate diagnosticInformationMap.generated.ts using TypeScript's own script
const diagInput = path.join(upstream, 'src', 'compiler', 'diagnosticMessages.json');
const diagGenerated = path.join(upstream, 'src', 'compiler', 'diagnosticInformationMap.generated.ts');
if (!fs.existsSync(diagGenerated)) {
  run(process.execPath, [path.join(upstream, 'scripts', 'processDiagnosticMessages.mjs'), diagInput], {
    cwd: upstream,
  });
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveRelative(specifier, fromFile) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base.replace(/\.js$/, '.ts'),
    base,
    base + '.ts',
    path.join(base, 'index.ts'),
  ];
  const found = candidates.find(isFile);
  if (!found) throw new Error(`Cannot resolve ${specifier} from ${fromFile}`);
  return found;
}

function collectSpecifiers(sourceFile) {
  const found = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      found.push(node.moduleSpecifier);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      found.push(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

function replaceExact(text, from, to, label) {
  const normText = text.replace(/\r\n/g, '\n');
  const normFrom = from.replace(/\r\n/g, '\n');
  if (!normText.includes(normFrom)) {
    throw new Error(`Patch target not found (${label})`);
  }
  return normText.replace(normFrom, to.replace(/\r\n/g, '\n'));
}

// Crawl all reachable files starting from src/tsc/tsc.ts
const entry = path.join(upstream, 'src', 'tsc', 'tsc.ts');
const queue = [entry];
const visited = new Set();

fs.rmSync(vendor, { recursive: true, force: true });
fs.mkdirSync(vendor, { recursive: true });
fs.copyFileSync(path.join(upstream, 'LICENSE.txt'), path.join(vendor, 'LICENSE.txt'));

while (queue.length > 0) {
  const file = queue.shift();
  if (visited.has(file)) continue;
  visited.add(file);

  let text = fs.readFileSync(file, 'utf-8');
  const relFromUpstream = path.relative(upstream, file).split(path.sep).join('/');
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false);

  // Rewrite relative `.js` specifiers to `.ts` and enqueue targets
  const edits = [];
  for (const lit of collectSpecifiers(sourceFile)) {
    const spec = lit.text;
    if (!spec.startsWith('.')) continue;
    const target = resolveRelative(spec, file);
    if (target) {
      queue.push(target);
      const rewritten = spec.endsWith('.js') ? spec.replace(/\.js$/, '.ts') : spec.endsWith('.ts') ? spec : spec + '.ts';
      if (rewritten !== spec) {
        const quote = text[lit.getStart(sourceFile)];
        edits.push({ start: lit.getStart(sourceFile), end: lit.getEnd(), text: `${quote}${rewritten}${quote}` });
      }
    }
  }
  text = applyEdits(text, edits).replace(/\r\n/g, '\n');

  // Minimal mechanical ESM/host adaptations (no compiler logic modified)
  if (relFromUpstream === 'src/compiler/core.ts') {
    text = replaceExact(
      text,
      `    return typeof process !== "undefined"
        && !!process.nextTick
        && !(process as any).browser
        && typeof require !== "undefined";`,
      `    return typeof process !== "undefined"
        && !!process.nextTick
        && !(process as any).browser;`,
      'core.ts:isNodeLikeSystem',
    );
  } else if (relFromUpstream === 'src/compiler/performanceCore.ts') {
    text = `import { performance as _nodePerformance } from "node:perf_hooks";\n` + text;
    text = replaceExact(
      text,
      `            const { performance } = require("perf_hooks") as Partial<typeof import("perf_hooks")>;
            if (performance) {
                return {
                    shouldWriteNativeEvents: false,
                    performance,
                };
            }`,
      `            const perf: Performance = {
                now: () => _nodePerformance.now(),
                timeOrigin: _nodePerformance.timeOrigin,
                mark: (name: string) => _nodePerformance.mark(name),
                measure: (name: string, startMark?: string, endMark?: string) => _nodePerformance.measure(name, startMark, endMark),
                clearMarks: (name?: string) => _nodePerformance.clearMarks(name),
                clearMeasures: (name?: string) => _nodePerformance.clearMeasures(name),
            };
            return {
                shouldWriteNativeEvents: false,
                performance: perf,
            };`,
      'performanceCore.ts:perf_hooks',
    );
    text = replaceExact(
      text,
      `    if (typeof performance === "object") {
        // For now we always write native performance events when running in the browser. We may
        // make this conditional in the future if we find that native web performance hooks
        // in the browser also slow down compilation.
        return {
            shouldWriteNativeEvents: true,
            performance,
        };
    }`,
      `    // Browser performance fallback unused in Node/native builds`,
      'performanceCore.ts:browser-fallback',
    );
  } else if (relFromUpstream === 'src/compiler/tracing.ts') {
    text = `import * as fs from "node:fs";\n` + text;
    text = replaceExact(
      text,
      `    let fs: typeof import("fs");`,
      `    // fs is statically imported at module top level`,
      'tracing.ts:let-fs',
    );
    text = replaceExact(
      text,
      `        if (fs === undefined) {
            try {
                fs = require("fs");
            }
            catch (e) {
                throw new Error(\`tracing requires having fs\\n(original error: \${e.message || e})\`);
            }
        }`,
      `        // fs is statically imported`,
      'tracing.ts:fs',
    );
  } else if (relFromUpstream === 'src/compiler/debug.ts') {
    // Use TypeScript's own non-setPrototypeOf debugger-display fallback branches
    // (only reachable when Debug.isDebugging / isDebugInfoEnabled is active).
    text = replaceExact(
      text,
      `            if (typeof Object.setPrototypeOf === "function") {
                // if we're in es2015, attach the method to a shared prototype for \`FlowNode\`
                // so the method doesn't show up in the watch window.
                if (!flowNodeProto) {
                    flowNodeProto = Object.create(Object.prototype) as FlowNode;
                    attachFlowNodeDebugInfoWorker(flowNodeProto);
                }
                Object.setPrototypeOf(flowNode, flowNodeProto);
            }
            else {
                // not running in an es2015 environment, attach the method directly.
                attachFlowNodeDebugInfoWorker(flowNode);
            }`,
      `            attachFlowNodeDebugInfoWorker(flowNode);`,
      'debug.ts:flowNodeProto',
    );
    text = replaceExact(
      text,
      `            if (typeof Object.setPrototypeOf === "function") {
                // if we're in es2015, attach the method to a shared prototype for \`NodeArray\`
                // so the method doesn't show up in the watch window.
                if (!nodeArrayProto) {
                    nodeArrayProto = Object.create(Array.prototype) as NodeArray<Node>;
                    attachNodeArrayDebugInfoWorker(nodeArrayProto);
                }
                Object.setPrototypeOf(array, nodeArrayProto);
            }
            else {
                // not running in an es2015 environment, attach the method directly.
                attachNodeArrayDebugInfoWorker(array);
            }`,
      `            attachNodeArrayDebugInfoWorker(array);`,
      'debug.ts:nodeArrayProto',
    );
    text = replaceExact(
      text,
      `    export function attachDebugPrototypeIfDebug(mapper: TypeMapper): TypeMapper {
        if (isDebugging) {
            return Object.setPrototypeOf(mapper, DebugTypeMapper.prototype);
        }
        return mapper;
    }`,
      `    export function attachDebugPrototypeIfDebug(mapper: TypeMapper): TypeMapper {
        return mapper;
    }`,
      'debug.ts:attachDebugPrototypeIfDebug',
    );
  } else if (relFromUpstream === 'src/compiler/sys.ts') {
    text =
      `import * as _fs from "node:fs";\n` +
      `import * as _path from "node:path";\n` +
      `import * as _os from "node:os";\n` +
      `import * as _crypto from "node:crypto";\n` +
      `import { Buffer } from "node:buffer";\n` +
      text;
    text = replaceExact(
      text,
      `        const _fs: typeof import("fs") = require("fs");
        const _path: typeof import("path") = require("path");
        const _os = require("os");
        // crypto can be absent on reduced node installations
        let _crypto: typeof import("crypto") | undefined;
        try {
            _crypto = require("crypto");
        }
        catch {
            _crypto = undefined;
        }`,
      `        // _fs, _path, _os, _crypto are statically imported at module top level`,
      'sys.ts:static-imports',
    );
    text = replaceExact(
      text,
      `        const fsRealpath = !!_fs.realpathSync.native ? process.platform === "win32" ? fsRealPathHandlingLongPath : _fs.realpathSync.native : _fs.realpathSync;`,
      `        const fsRealpath = process.platform === "win32" ? fsRealPathHandlingLongPath : (p: string) => _fs.realpathSync(p);`,
      'sys.ts:fsRealpath',
    );
    text = replaceExact(
      text,
      `            createHash: _crypto ? createSHA256Hash : generateDjb2Hash,
            createSHA256Hash: _crypto ? createSHA256Hash : undefined,`,
      `            createHash: createSHA256Hash,
            createSHA256Hash: createSHA256Hash,`,
      'sys.ts:crypto-hash',
    );
    text = replaceExact(
      text,
      `        const executingFilePath = __filename.endsWith("sys.js") ? _path.join(_path.dirname(__dirname), "__fake__.js") : __filename;`,
      `        const _entryFile = process.argv[1] || process.execPath || _path.resolve("tsc.js");
        const executingFilePath = _entryFile.endsWith("sys.js") ? _path.join(_path.dirname(_path.dirname(_entryFile)), "__fake__.js") : _entryFile;`,
      'sys.ts:executingFilePath',
    );
    text = replaceExact(
      text,
      `            getMemoryUsage() {
                if (global.gc) {
                    global.gc();
                }
                return process.memoryUsage().heapUsed;
            },`,
      `            getMemoryUsage() {
                const gcFn = (globalThis as any).gc;
                if (gcFn) {
                    gcFn();
                }
                return process.memoryUsage().heapUsed;
            },`,
      'sys.ts:global.gc',
    );
    text = replaceExact(
      text,
      `            tryEnableSourceMapsForHost() {
                try {
                    (require("source-map-support") as typeof import("source-map-support")).install();
                }
                catch {
                    // Could not enable source maps.
                }
            },`,
      `            tryEnableSourceMapsForHost() {
                // source-map-support is optional and unused in native builds
            },`,
      'sys.ts:source-map-support',
    );
    text = replaceExact(
      text,
      `            require: (baseDir, moduleName) => {
                try {
                    const modulePath = resolveJSModule(moduleName, baseDir, nodeSystem);
                    return { module: require(modulePath), modulePath, error: undefined };
                }
                catch (error) {
                    return { module: undefined, modulePath: undefined, error };
                }
            },`,
      `            require: (_baseDir, moduleName) => {
                return { module: undefined, modulePath: undefined, error: new Error(\`Dynamic require("\${moduleName}") is not supported in this build\`) };
            },`,
      'sys.ts:dynamic-require',
    );
    text = replaceExact(
      text,
      `        function enableCPUProfiler(path: string, cb: () => void) {
            if (activeSession) {
                cb();
                return false;
            }
            const inspector: typeof import("inspector") = require("inspector");
            if (!inspector || !inspector.Session) {
                cb();
                return false;
            }
            const session = new inspector.Session();
            session.connect();

            session.post("Profiler.enable", () => {
                session.post("Profiler.start", () => {
                    activeSession = session;
                    profilePath = path;
                    cb();
                });
            });
            return true;
        }`,
      `        function enableCPUProfiler(_path: string, cb: () => void) {
            cb();
            return false;
        }`,
      'sys.ts:inspector',
    );
    text = replaceExact(
      text,
      `            // If this file exists under a different case, we must be case-insensitve.
            return !fileExists(swapCase(__filename));`,
      `            // If the current directory exists under a different case, the filesystem is case-insensitive.
            return !directoryExists(swapCase(process.cwd()));`,
      'sys.ts:isFileSystemCaseSensitive',
    );
  }

  const dest = path.join(vendor, relFromUpstream);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
}

console.log(`Vendored ${visited.size} TypeScript v6.0.3 source files into ${path.relative(repoRoot, vendor)}`);
