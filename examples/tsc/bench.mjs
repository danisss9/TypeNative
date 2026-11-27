// Benchmark: Node.js vs TypeNative for the full TypeScript compiler (`tsc` v6.0.3).
//
// Compiles main.ts to a native binary (unless --no-build is passed), builds the
// Node baseline (run-node.mjs --build), and times complete process runs (spawn
// to exit) alternating Node and native across:
//   (a) cold startup (`tsc --version`)
//   (b) single-file strict compile (.js + .d.ts + .js.map)
//   (c) medium multi-file strict project (20 generated modules, .js + .d.ts)
//   (d) incremental warm no-op & single-file edit rebuild on the 20-module project
//   (e) real-world large project (`tsc --noEmit` on TypeNative's own `src/`)
//
// Every run verifies stdout, stderr, exit code, and emitted files match byte for byte.
//
// Usage:  node bench.mjs [--no-build] [runs=15] [projectRuns=5] [largeRuns=3]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyLibFiles, nodeMain } from './run-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const exePath = path.join(cache, process.platform === 'win32' ? 'tsc.exe' : 'tsc');
const benchWork = path.join(cache, 'bench-work');

const argv = process.argv.slice(2);
const noBuild = argv.includes('--no-build');
const numArgs = argv.filter((a) => !a.startsWith('--')).map(Number);
const coldRuns = numArgs[0] || 15;
const projectRuns = numArgs[1] || 5;
const largeRuns = numArgs[2] || 3;

function runOrDie(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed (exit ${result.status})`);
    process.exit(1);
  }
}

function writeFiles(root, files) {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
}

function snapshotDir(root) {
  const out = new Map();
  if (!fs.existsSync(root)) return out;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (entry.isDirectory()) walk(full);
      else out.set(rel, fs.readFileSync(full));
    }
  };
  walk(root);
  return out;
}

function assertSnapshotsEqual(label, a, b) {
  if (a.size !== b.size) {
    console.error(`[${label}] emitted file count differs: node=${a.size} native=${b.size}`);
    process.exit(1);
  }
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (!vb || !va.equals(vb)) {
      console.error(`[${label}] emitted file differs: ${k}`);
      process.exit(1);
    }
  }
}

function runTsc(runtime, args, cwd) {
  const cmd = runtime === 'node' ? process.execPath : exePath;
  const fullArgs = runtime === 'node' ? [nodeMain, ...args] : args;
  const t0 = performance.now();
  const res = spawnSync(cmd, fullArgs, {
    cwd,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: undefined },
  });
  const elapsed = performance.now() - t0;
  return {
    elapsed,
    stdout: res.stdout ?? Buffer.alloc(0),
    stderr: res.stderr ?? Buffer.alloc(0),
    code: res.status,
  };
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(1)} ms`.padStart(11);
}

function printTable(title, nodeStats, nativeStats) {
  const ratio = nodeStats.median / nativeStats.median;
  const summary = ratio >= 1 ? `${ratio.toFixed(2)}x faster` : `${(1 / ratio).toFixed(2)}x slower (${ratio.toFixed(2)}x)`;
  console.log(`\n### ${title} — TypeNative is ${summary} (median)\n`);
  console.log('| Runtime    | min        | median     | mean       | max        |');
  console.log('|------------|------------|------------|------------|------------|');
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
}

function generateMediumProject(moduleCount = 20) {
  const files = {
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        declaration: true,
        sourceMap: true,
        incremental: true,
        rootDir: 'src',
        outDir: 'dist',
      },
      include: ['src/**/*'],
    }, null, 2) + '\n',
    'src/types.ts': `export type Status = 'idle' | 'pending' | 'done' | 'failed';
export interface Entity<T> {
  readonly id: number;
  readonly name: string;
  readonly status: Status;
  readonly payload: T;
  readonly tags: readonly string[];
}
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
export function ok<T>(value: T): Result<T, never> { return { ok: true, value }; }
export function err<E>(error: E): Result<never, E> { return { ok: false, error }; }
`,
  };
  for (let i = 0; i < moduleCount; i++) {
    const prevImport = i > 0 ? `import { compute${i - 1}, Record${i - 1} } from './mod${i - 1}';\n` : '';
    const prevUse = i > 0 ? `const prev = compute${i - 1}(items.length);\n  ` : 'const prev = 0;\n  ';
    files[`src/mod${i}.ts`] = `import { Entity, Result, Status, ok, err } from './types';
${prevImport}
export interface Record${i} extends Entity<{ score: number; weight: number }> {
  readonly level: ${i};
}

export class Service${i}<T extends { score: number }> {
  readonly #cache = new Map<number, T>();
  constructor(private readonly bias: number = ${i + 1}) {}
  upsert(id: number, item: T): number {
    this.#cache.set(id, item);
    return item.score + this.bias;
  }
  total(): number {
    let sum = 0;
    for (const v of this.#cache.values()) sum += v.score + this.bias;
    return sum;
  }
}

export function filterByStatus${i}(items: readonly Record${i}[], status: Status): Record${i}[] {
  return items.filter((item) => item.status === status && item.payload.score > 0);
}

export function compute${i}(seed: number): number {
  const svc = new Service${i}(seed);
  for (let k = 0; k < 5; k++) svc.upsert(k, { score: k * ${i + 1} + seed });
  return svc.total();
}

export function evaluate${i}(items: readonly Record${i}[]): Result<number> {
  ${prevUse}if (items.length === 0) return err('empty-${i}');
  const active = filterByStatus${i}(items, 'done');
  const sum = active.reduce((acc, it) => acc + it.payload.score * it.payload.weight, prev);
  return ok(sum);
}
`;
  }
  const imports = Array.from({ length: moduleCount }, (_, i) => `import { compute${i} } from './mod${i}';`).join('\n');
  const calls = Array.from({ length: moduleCount }, (_, i) => `compute${i}(${i + 1})`).join(' + ');
  files['src/index.ts'] = `${imports}\nexport const summary = ${calls};\n`;
  return files;
}

// Build both targets unless --no-build
fs.mkdirSync(cache, { recursive: true });
if (!noBuild) {
  console.log('Compiling examples/tsc/main.ts to native binary with TypeNative ...');
  runOrDie(process.execPath, [cli, '--source', path.join(here, 'main.ts'), '--output', exePath], { cwd: repoRoot });
}
copyLibFiles(path.join(cache, 'lib'));
runOrDie(process.execPath, [path.join(here, 'run-node.mjs'), '--build-only'], { cwd: here });

// (a) Cold startup: tsc --version
{
  const nodeSamples = [];
  const nativeSamples = [];
  for (let i = 0; i < coldRuns; i++) {
    const a = runTsc('node', ['--version'], here);
    const b = runTsc('native', ['--version'], here);
    if (a.code !== b.code || !a.stdout.equals(b.stdout) || !a.stderr.equals(b.stderr)) {
      console.error('cold --version output differs');
      process.exit(1);
    }
    nodeSamples.push(a.elapsed);
    nativeSamples.push(b.elapsed);
  }
  printTable(`Cold CLI startup (\`tsc --version\`, ${coldRuns} runs)`, stats(nodeSamples), stats(nativeSamples));
}

// (b) Single-file compile (.js + .d.ts + .js.map)
{
  const dir = path.join(benchWork, 'single');
  const files = {
    'tsconfig.json': JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', strict: true, declaration: true, sourceMap: true, outDir: 'dist' },
    }, null, 2) + '\n',
    'index.ts': `export interface User { id: number; name: string; roles: readonly string[]; }
export class Registry<T extends { id: number }> {
  #items = new Map<number, T>();
  add(item: T): this { this.#items.set(item.id, item); return this; }
  get(id: number): T | undefined { return this.#items.get(id); }
  list(): T[] { return [...this.#items.values()]; }
}
export function summarize(users: readonly User[]): string {
  return users.map((u) => \`\${u.id}:\${u.name}(\${u.roles.join(',')})\`).join('; ');
}
`,
  };
  const nodeSamples = [];
  const nativeSamples = [];
  for (let i = 0; i < projectRuns; i++) {
    writeFiles(dir, files);
    const a = runTsc('node', [], dir);
    const snapA = snapshotDir(dir);

    writeFiles(dir, files);
    const b = runTsc('native', [], dir);
    const snapB = snapshotDir(dir);

    if (a.code !== b.code || !a.stdout.equals(b.stdout) || !a.stderr.equals(b.stderr)) {
      console.error('single-file output differs');
      process.exit(1);
    }
    assertSnapshotsEqual('single-file', snapA, snapB);
    nodeSamples.push(a.elapsed);
    nativeSamples.push(b.elapsed);
  }
  printTable(`Single-file strict compile (\`.js\` + \`.d.ts\` + \`.js.map\`, ${projectRuns} runs)`, stats(nodeSamples), stats(nativeSamples));
}

// (c) + (d) Medium 20-module project: cold build, incremental warm no-op, incremental 1-file edit
{
  const dir = path.join(benchWork, 'medium');
  const files = generateMediumProject(20);
  const coldNode = [], coldNative = [];
  const noopNode = [], noopNative = [];
  const editNode = [], editNative = [];

  for (let i = 0; i < projectRuns; i++) {
    const runSeq = (runtime) => {
      writeFiles(dir, files);
      const r1 = runTsc(runtime, [], dir);
      const s1 = snapshotDir(dir);

      const r2 = runTsc(runtime, [], dir);
      const s2 = snapshotDir(dir);

      const mod19 = path.join(dir, 'src/mod19.ts');
      fs.writeFileSync(mod19, fs.readFileSync(mod19, 'utf8').replace("err('empty-19')", "err('none-19')"));
      const r3 = runTsc(runtime, [], dir);
      const s3 = snapshotDir(dir);
      return { r1, s1, r2, s2, r3, s3 };
    };
    const a = runSeq('node');
    const b = runSeq('native');
    for (const [tag, ra, sa, rb, sb] of [
      ['medium-cold', a.r1, a.s1, b.r1, b.s1],
      ['medium-noop', a.r2, a.s2, b.r2, b.s2],
      ['medium-edit', a.r3, a.s3, b.r3, b.s3],
    ]) {
      if (ra.code !== rb.code || !ra.stdout.equals(rb.stdout) || !ra.stderr.equals(rb.stderr)) {
        console.error(`${tag} output differs`);
        process.exit(1);
      }
      assertSnapshotsEqual(tag, sa, sb);
    }
    coldNode.push(a.r1.elapsed); coldNative.push(b.r1.elapsed);
    noopNode.push(a.r2.elapsed); noopNative.push(b.r2.elapsed);
    editNode.push(a.r3.elapsed); editNative.push(b.r3.elapsed);
  }
  printTable(`Medium project cold build (22 files, \`.js\`+\`.d.ts\`+\`.map\`+\`.tsbuildinfo\`, ${projectRuns} runs)`, stats(coldNode), stats(coldNative));
  printTable(`Medium project incremental warm no-op (${projectRuns} runs)`, stats(noopNode), stats(noopNative));
  printTable(`Medium project incremental 1-file edit rebuild (${projectRuns} runs)`, stats(editNode), stats(editNative));
}

// (e) Real-world large project: TypeNative's own `src/` (`tsc --noEmit`)
{
  const nodeSamples = [];
  const nativeSamples = [];
  for (let i = 0; i < largeRuns; i++) {
    const a = runTsc('node', ['--noEmit'], repoRoot);
    const b = runTsc('native', ['--noEmit'], repoRoot);
    if (a.code !== b.code || !a.stdout.equals(b.stdout) || !a.stderr.equals(b.stderr)) {
      console.error('realworld-noemit output differs');
      process.exit(1);
    }
    nodeSamples.push(a.elapsed);
    nativeSamples.push(b.elapsed);
  }
  printTable(`Large real-world project (\`tsc --noEmit\` on TypeNative's \`src/\`, ${largeRuns} runs)`, stats(nodeSamples), stats(nativeSamples));
}
