// Parity check: Node.js vs the TypeNative build of the full TypeScript compiler (`tsc` v6.0.3).
//
// Compiles main.ts to a native binary (unless --no-build is passed), builds the
// Node baseline (run-node.mjs --build), and runs a comprehensive suite of tsc
// workloads through both runtimes in identical directory layouts.
//
// For every case, stdout, stderr, exit code, and every emitted file (.js, .d.ts,
// .js.map, .d.ts.map, .tsbuildinfo) must match byte for byte. Failures are written
// to .cache/failures/.
//
// Usage:  node parity.mjs [--no-build] [filter]

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyLibFiles, nodeMain } from './run-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const exePath = path.join(cache, process.platform === 'win32' ? 'tsc.exe' : 'tsc');
const failuresDir = path.join(cache, 'failures');
const workDir = path.join(cache, 'parity-work');

const argv = process.argv.slice(2);
const noBuild = argv.includes('--no-build');
const filter = argv.find((a) => !a.startsWith('--')) ?? '';

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

function runTsc(runtime, args, cwd, timeoutMs = 120_000) {
  const cmd = runtime === 'node' ? process.execPath : exePath;
  const fullArgs = runtime === 'node' ? [nodeMain, ...args] : args;
  const res = spawnSync(cmd, fullArgs, {
    cwd,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutMs,
    env: { ...process.env, FORCE_COLOR: undefined },
  });
  return {
    stdout: res.stdout ?? Buffer.alloc(0),
    stderr: res.stderr ?? Buffer.alloc(0),
    code: res.signal ? `signal:${res.signal}` : res.status,
  };
}

function compareSnapshots(a, b) {
  const diffs = [];
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  for (const key of [...allKeys].sort()) {
    const va = a.get(key);
    const vb = b.get(key);
    if (!va) diffs.push(`file only in native: ${key}`);
    else if (!vb) diffs.push(`file only in node: ${key}`);
    else if (!va.equals(vb)) {
      diffs.push(
        `file differs: ${key} (node ${va.length}B vs native ${vb.length}B)\n` +
        `--- node\n${va.toString('utf8').slice(0, 2000)}\n` +
        `--- native\n${vb.toString('utf8').slice(0, 2000)}`
      );
    }
  }
  return diffs;
}

// Each case runs node then native in the EXACT SAME directory (reset between runs)
// so absolute paths in diagnostics, sourcemaps, and .tsbuildinfo are byte-identical.
const cases = [
  {
    id: 'cli-version',
    files: {},
    steps: [{ args: ['--version'] }],
  },
  {
    id: 'cli-help',
    files: {},
    steps: [{ args: ['--help'] }],
  },
  {
    id: 'cli-showConfig',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          declaration: true,
          sourceMap: true,
          outDir: 'dist',
        },
        include: ['src/**/*'],
      }, null, 2) + '\n',
      'src/index.ts': 'export const answer = 42;\n',
    },
    steps: [{ args: ['--showConfig'] }],
  },
  {
    id: 'emit-es2022',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'index.ts': `export class Counter {
  #value: number;
  static defaultStep = 1;
  constructor(initial = 0) { this.#value = initial; }
  inc(step = Counter.defaultStep): number {
    this.#value += step;
    return this.#value;
  }
  get value(): number { return this.#value; }
}
export const pick = <T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> => {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
};
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-commonjs',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          esModuleInterop: true,
          strict: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'math.ts': `export const PI = 3.14159;\nexport default function square(x: number): number { return x * x; }\n`,
      'main.ts': `import square, { PI } from './math';\nexport const area = (r: number) => PI * square(r);\n`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-downlevel-es2015',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2015',
          module: 'CommonJS',
          strict: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'async.ts': `export async function fetchAll(xs: number[]): Promise<number> {
  let sum = 0;
  for (const x of xs) {
    sum += await Promise.resolve(x * 2);
  }
  return sum;
}
export const merge = (a: Record<string, number>, b: Record<string, number>) => ({ ...a, ...b, extra: 1 });
export const rest = ({ a, ...others }: { a: number; b: number; c: number }) => ({ a, others });
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-downlevel-es5',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES5',
          module: 'CommonJS',
          downlevelIteration: true,
          ignoreDeprecations: '6.0',
          strict: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'downlevel.ts': `export class Base {
  constructor(public readonly name: string) {}
  greet(): string { return \`Hello, \${this.name}!\`; }
}
export class Derived extends Base {
  constructor(name: string, public count: number) { super(name); }
  override greet(): string { return \`\${super.greet()} (\${this.count})\`; }
}
export function* range(n: number): Generator<number> {
  for (let i = 0; i < n; i++) yield i;
}
export const spread = (xs: number[]) => [0, ...xs, 99];
export const [first, ...tail] = [1, 2, 3, 4];
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-jsx-react',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          jsx: 'react',
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'jsx.d.ts': `declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any; }
}
declare const React: { createElement(type: any, props: any, ...children: any[]): any; Fragment: any };
`,
      'app.tsx': `export function Card(props: { title: string; items: string[] }) {
  return (
    <section className="card" data-count={props.items.length}>
      <h1>{props.title}</h1>
      <>
        {props.items.map((item, i) => <p key={i}>{item}</p>)}
      </>
    </section>
  );
}
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-jsx-react-jsx',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          jsx: 'react-jsx',
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'jsx.d.ts': `declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }\n`,
      'app.tsx': `export const Badge = ({ label, active }: { label: string; active?: boolean }) => (
  <span data-active={active}>{label}</span>
);
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-jsx-preserve',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          jsx: 'preserve',
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'jsx.d.ts': `declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }\n`,
      'app.tsx': `export const Box = ({ id }: { id: string }) => <div id={id}><slot /></div>;\n`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-decorators-tc39',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'dec.ts': `function logged<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
  const name = String(context.name);
  return function (this: This, ...args: Args): Return {
    return target.call(this, ...args);
  };
}
export class Service {
  @logged
  compute(x: number): number {
    return x * 2;
  }
}
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-decorators-experimental',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strict: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'exp.ts': `function Injectable(): ClassDecorator { return () => {}; }
function Track(): MethodDecorator { return () => {}; }
export class Repo {}
@Injectable()
export class Controller {
  constructor(public repo: Repo) {}
  @Track()
  handle(id: string, count: number): boolean {
    return id.length > count;
  }
}
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-declarations-sourcemaps',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'lib.ts': `export interface Result<T, E = Error> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: E;
}
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}
export function mapResult<T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> {
  return r.ok ? { ok: true, value: fn(r.value as T) } : { ok: false, error: r.error };
}
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'emit-inline-sourcemap',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          inlineSourceMap: true,
          inlineSources: true,
          outDir: 'dist',
        },
      }, null, 2) + '\n',
      'a.ts': 'export const double = (n: number): number => n * 2;\n',
    },
    steps: [{ args: [] }],
  },
  {
    id: 'diagnostics-plain',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          noEmit: true,
        },
      }, null, 2) + '\n',
      'errors.ts': `interface User { id: number; profile: { email: string; tags: string[] } }
const u: User = { id: 1, profile: { email: 123, tags: ['a', 2], extra: true } };

type Shape = { kind: 'circle'; r: number } | { kind: 'rect'; w: number; h: number };
function area(s: Shape): number {
  if (s.kind === 'circle') return s.w;
  return s.w * s.h;
}

function wrap<T extends { id: string }>(x: T): T { return x; }
wrap({ id: 42 });

type Deep = { a: { b: { c: { d: string } } } };
const deep: Deep = { a: { b: { c: { d: 99 } } } };
export { u, area, deep };
`,
    },
    steps: [{ args: ['--pretty', 'false'] }],
  },
  {
    id: 'diagnostics-pretty',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          noEmit: true,
        },
      }, null, 2) + '\n',
      'errors.ts': `const n: number = 'oops';
function greet(name: string): number {
  return name.toUpperCase();
}
export { n, greet };
`,
    },
    steps: [{ args: ['--pretty', 'true'] }],
  },
  {
    id: 'module-resolution-nodenext',
    files: {
      'package.json': JSON.stringify({ name: 'app', type: 'module' }, null, 2) + '\n',
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          declaration: true,
          rootDir: 'src',
          outDir: 'dist',
        },
        include: ['src/**/*'],
      }, null, 2) + '\n',
      'node_modules/pkg-a/package.json': JSON.stringify({
        name: 'pkg-a',
        type: 'module',
        exports: {
          '.': { types: './dist/index.d.ts', import: './dist/index.js' },
          './sub': { types: './dist/sub.d.ts', import: './dist/sub.js' },
        },
      }, null, 2) + '\n',
      'node_modules/pkg-a/dist/index.d.ts': 'export declare function alpha(x: number): string;\n',
      'node_modules/pkg-a/dist/sub.d.ts': 'export interface Sub { flag: boolean; }\nexport declare const makeSub: () => Sub;\n',
      'src/barrel/index.ts': "export * from './helper.js';\n",
      'src/barrel/helper.ts': 'export const format = (s: string) => `[${s}]`;\n',
      'src/index.ts': `import { alpha } from 'pkg-a';
import { makeSub, type Sub } from 'pkg-a/sub';
import { format } from './barrel/index.js';
export function run(n: number): { text: string; sub: Sub } {
  return { text: format(alpha(n)), sub: makeSub() };
}
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'module-resolution-bundler-paths',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          paths: { '@core/*': ['./src/core/*'] },
          strict: true,
          rootDir: 'src',
          outDir: 'dist',
        },
        include: ['src/**/*'],
      }, null, 2) + '\n',
      'src/core/id.ts': 'export type Id = string & { readonly __brand: unique symbol };\nexport const makeId = (s: string): Id => s as Id;\n',
      'src/app.ts': "import { makeId, type Id } from '@core/id';\nexport const rootId: Id = makeId('root');\n",
    },
    steps: [{ args: [] }],
  },
  {
    id: 'project-multifile-strict',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          declaration: true,
          sourceMap: true,
          rootDir: 'src',
          outDir: 'dist',
        },
        include: ['src/**/*'],
      }, null, 2) + '\n',
      'src/enums.ts': `export enum Color { Red = 'RED', Green = 'GREEN', Blue = 'BLUE' }
export const enum Flags { None = 0, Read = 1, Write = 2, ReadWrite = Read | Write }
`,
      'src/ns.ts': `export namespace Geometry {
  export interface Point { x: number; y: number; }
  export function dist(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
`,
      'src/generics.ts': `export type DeepReadonly<T> = T extends (...args: any[]) => any ? T : { readonly [K in keyof T]: DeepReadonly<T[K]> };
export function identity<const T>(value: T): T { return value; }
`,
      'src/main.ts': `import { Color, Flags } from './enums';
import { Geometry } from './ns';
import { identity, type DeepReadonly } from './generics';
export interface Scene { color: Color; flags: Flags; origin: Geometry.Point; }
export const scene: DeepReadonly<Scene> = identity({
  color: Color.Green,
  flags: Flags.ReadWrite,
  origin: { x: 0, y: 0 },
});
export const d = Geometry.dist(scene.origin, { x: 3, y: 4 });
`,
    },
    steps: [{ args: [] }],
  },
  {
    id: 'incremental',
    files: {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          incremental: true,
          declaration: true,
          rootDir: 'src',
          outDir: 'dist',
        },
        include: ['src/**/*'],
      }, null, 2) + '\n',
      'src/a.ts': 'export function add(x: number, y: number): number { return x + y; }\n',
      'src/b.ts': "import { add } from './a';\nexport const total = add(10, 20);\n",
    },
    steps: [
      { label: 'cold', args: [] },
      { label: 'warm-noop', args: [] },
      {
        label: 'edit-rebuild',
        mutate: (dir) => {
          fs.writeFileSync(path.join(dir, 'src/a.ts'), 'export function add(x: number, y: number): number { return x + y + 1; }\n');
        },
        args: [],
      },
    ],
  },
  {
    id: 'build-references',
    files: {
      'tsconfig.json': JSON.stringify({
        files: [],
        references: [{ path: './packages/core' }, { path: './packages/app' }],
      }, null, 2) + '\n',
      'packages/core/tsconfig.json': JSON.stringify({
        compilerOptions: {
          composite: true,
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          outDir: 'dist',
          rootDir: 'src',
        },
        include: ['src/**/*'],
      }, null, 2) + '\n',
      'packages/core/src/index.ts': 'export function twice(n: number): number { return n * 2; }\n',
      'packages/app/tsconfig.json': JSON.stringify({
        compilerOptions: {
          composite: true,
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          outDir: 'dist',
          rootDir: 'src',
        },
        references: [{ path: '../core' }],
        include: ['src/**/*'],
      }, null, 2) + '\n',
      'packages/app/src/index.ts': "import { twice } from '../../core/src/index';\nexport const result = twice(21);\n",
    },
    steps: [
      { label: 'build', args: ['--build'] },
      { label: 'noop', args: ['--build'] },
      { label: 'clean', args: ['--build', '--clean'] },
    ],
  },
  {
    id: 'realworld-noemit',
    // Runs --noEmit typecheck against TypeNative's own tsconfig.json in repoRoot
    externalCwd: repoRoot,
    files: null,
    steps: [{ args: ['--noEmit', '--pretty', 'false'] }],
  },
];

// Watch-mode smoke test (separate because it runs a long-lived child process)
async function runWatchSmoke(runtime) {
  const dir = path.join(workDir, `watch-${runtime}`);
  writeFiles(dir, {
    'tsconfig.json': JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', strict: true, rootDir: 'src', outDir: 'dist' },
      include: ['src/**/*'],
    }, null, 2) + '\n',
    'src/index.ts': 'export const x: number = 1;\n',
  });

  const cmd = runtime === 'node' ? process.execPath : exePath;
  const fullArgs = runtime === 'node'
    ? [path.join(here, 'run-node.mjs'), '--watch', '--preserveWatchOutput', '--pretty', 'false']
    : ['--watch', '--preserveWatchOutput', '--pretty', 'false'];

  return new Promise((resolve) => {
    const child = spawn(cmd, fullArgs, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let stage = 0;
    const stages = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ ok: false, reason: `timeout at stage ${stage}`, stdout, stderr, stages });
    }, 30_000);

    const onChunk = (chunk) => {
      stdout += chunk.toString('utf8');
      if (stage === 0 && /Found 0 errors\. Watching for file changes\./.test(stdout)) {
        stages.push('initial-ok');
        stage = 1;
        setTimeout(() => {
          fs.writeFileSync(path.join(dir, 'src/index.ts'), "export const x: number = 'bad';\n");
        }, 300);
      } else if (stage === 1 && /Found 1 error\. Watching for file changes\./.test(stdout)) {
        stages.push('error-detected');
        stage = 2;
        setTimeout(() => {
          fs.writeFileSync(path.join(dir, 'src/index.ts'), 'export const x: number = 2;\n');
        }, 300);
      } else if (stage === 2 && (stdout.match(/Found 0 errors\. Watching for file changes\./g) ?? []).length >= 2) {
        stages.push('recovered-ok');
        stage = 3;
        clearTimeout(timer);
        child.kill();
        const emitted = fs.existsSync(path.join(dir, 'dist/index.js'))
          ? fs.readFileSync(path.join(dir, 'dist/index.js'), 'utf8')
          : '';
        resolve({ ok: emitted.includes('x = 2'), reason: emitted.includes('x = 2') ? '' : `unexpected dist/index.js: ${emitted}`, stdout, stderr, stages });
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('exit', (code) => {
      if (stage < 3) {
        clearTimeout(timer);
        resolve({ ok: false, reason: `exited early with code ${code} at stage ${stage}`, stdout, stderr, stages });
      }
    });
  });
}

// Build both targets unless --no-build
fs.mkdirSync(cache, { recursive: true });
if (!noBuild) {
  console.log('Compiling examples/tsc/main.ts to native binary with TypeNative ...');
  runOrDie(process.execPath, [cli, '--source', path.join(here, 'main.ts'), '--output', exePath], { cwd: repoRoot });
}
copyLibFiles(path.join(cache, 'lib'));
runOrDie(process.execPath, [path.join(here, 'run-node.mjs'), '--build-only'], { cwd: here });

fs.rmSync(failuresDir, { recursive: true, force: true });
fs.mkdirSync(failuresDir, { recursive: true });

const selected = cases.filter((c) => c.id.includes(filter));
let passed = 0;
let total = selected.length;
const failed = [];

for (const c of selected) {
  const caseDir = c.externalCwd ?? path.join(workDir, c.id);
  const results = {};

  for (const runtime of ['node', 'native']) {
    if (c.files !== null) writeFiles(caseDir, c.files);
    const stepOutputs = [];
    for (const step of c.steps) {
      if (step.mutate) step.mutate(caseDir);
      const res = runTsc(runtime, step.args, caseDir);
      const snap = c.files !== null ? snapshotDir(caseDir) : new Map();
      stepOutputs.push({ label: step.label ?? 'run', res, snap });
    }
    results[runtime] = stepOutputs;
  }

  const diffs = [];
  for (let i = 0; i < c.steps.length; i++) {
    const a = results.node[i];
    const b = results.native[i];
    const tag = `[${a.label}]`;
    if (a.res.code !== b.res.code) diffs.push(`${tag} exit code: node=${a.res.code} native=${b.res.code}`);
    if (!a.res.stdout.equals(b.res.stdout)) {
      diffs.push(`${tag} stdout differs:\n--- node (${a.res.stdout.length}B)\n${a.res.stdout.toString('utf8').slice(0, 4000)}\n--- native (${b.res.stdout.length}B)\n${b.res.stdout.toString('utf8').slice(0, 4000)}`);
    }
    if (!a.res.stderr.equals(b.res.stderr)) {
      diffs.push(`${tag} stderr differs:\n--- node (${a.res.stderr.length}B)\n${a.res.stderr.toString('utf8').slice(0, 4000)}\n--- native (${b.res.stderr.length}B)\n${b.res.stderr.toString('utf8').slice(0, 4000)}`);
    }
    for (const fd of compareSnapshots(a.snap, b.snap)) {
      diffs.push(`${tag} ${fd}`);
    }
  }

  if (diffs.length === 0) {
    console.log(`PASS ${c.id}`);
    passed++;
  } else {
    console.log(`FAIL ${c.id} (${diffs[0].split('\n')[0]})`);
    failed.push(c.id);
    fs.writeFileSync(path.join(failuresDir, `${c.id}.txt`), diffs.join('\n\n') + '\n', 'utf8');
  }
}

if ('watch-smoke'.includes(filter)) {
  total++;
  const nodeWatch = await runWatchSmoke('node');
  const nativeWatch = await runWatchSmoke('native');
  if (nodeWatch.ok && nativeWatch.ok) {
    console.log('PASS watch-smoke');
    passed++;
  } else {
    console.log(`FAIL watch-smoke (node=${nodeWatch.ok ? 'ok' : nodeWatch.reason}, native=${nativeWatch.ok ? 'ok' : nativeWatch.reason})`);
    failed.push('watch-smoke');
    fs.writeFileSync(
      path.join(failuresDir, 'watch-smoke.txt'),
      `node: ${JSON.stringify(nodeWatch, null, 2)}\n\nnative: ${JSON.stringify(nativeWatch, null, 2)}\n`,
      'utf8'
    );
  }
}

console.log(`\n${passed}/${total} parity cases match byte-for-byte (${((100 * passed) / Math.max(1, total)).toFixed(1)}%)`);
process.exitCode = failed.length > 0 ? 1 : 0;
