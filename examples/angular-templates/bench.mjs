// Benchmark: Node.js vs TypeNative for the Angular template compiler, both
// compiling a template to Ivy instructions (`ng-compile template.html`).
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then measures:
//   (a) per-call latency: complete process runs (spawn to exit) on the
//       built-in demo template (control flow, bindings, pipes, listeners,
//       @let, ng-content), about one component's worth;
//   (b) scaling: generated templates of growing size (8 to 64 KB by
//       default), each a dashboard of cards with @if/@for/@switch, @defer,
//       @let, property/class/style/attr bindings, listeners, two-way
//       bindings, pipes, i18n attributes and ICUs, ng-template references and
//       ng-content. Each card is its own embedded view (`@if (panels.x)`), as
//       sections of a real template are, so its @let and #refs stay local.
// Runs alternate Node and native, so drift on the machine hits both alike.
// Both runtimes' output must be identical, or the benchmark stops.
//
// Usage:  node bench.mjs [runs=30] [sizeRuns=5] [kilobytes=8,16,32,64]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const exePath = path.join(cache, process.platform === 'win32' ? 'ng-compile.exe' : 'ng-compile');
const bigPath = path.join(cache, 'generated.component.html');
const runs = Number(process.argv[2] ?? '30') || 30;
const sizeRuns = Number(process.argv[3] ?? '5') || 5;
const sizes = (process.argv[4] ?? '8,16,32,64').split(',').map(Number).filter((n) => n > 0);

// Deterministic pseudo-random numbers (a fixed-seed LCG): the same template
// on every run and every machine
let seed = 42;
function rand(n) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return Math.floor(seed / 65536) % n;
}

const WORDS = ['user', 'order', 'item', 'price', 'label', 'status', 'owner', 'total', 'title', 'count', 'tag', 'note'];
const PIPES = ['uppercase', 'lowercase', 'titlecase', 'json', 'async'];

function word() {
  return WORDS[rand(WORDS.length)];
}

function card(i) {
  const a = word();
  const b = word();
  const lines = [`@if (panels.${a}${i}) {`, `<article class="card card-${i}" [class.selected]="selected === ${i}" [style.width.px]="width + ${rand(100)}">`];
  lines.push(`  <h2 i18n-title title="Card ${a}" [attr.data-id]="${a}.id">{{ ${a}.${b} | ${PIPES[rand(PIPES.length)]} }} #${i}</h2>`);
  lines.push(`  @let ${a}Total${i} = ${a}.items.length * ${1 + rand(9)};`);
  switch (rand(5)) {
    case 0:
      lines.push(`  @if (${a}.${b} && ${a}Total${i} > ${rand(50)}) {`, `    <p class="hint">{{ ${a}.${b} }} of {{ ${a}Total${i} }}</p>`,
        `  } @else if (${a}.loading) {`, `    <spinner size="${rand(4)}" />`, `  } @else {`, `    <p>Nothing for {{ ${b} }}</p>`, `  }`);
      break;
    case 1:
      lines.push(`  <ul>`, `    @for (row of ${a}.rows; track row.id; let idx = $index, odd = $odd) {`,
        `      <li [class.odd]="odd" (click)="select(row, idx, $event)">{{ idx + 1 }}. {{ row.${b} }} ({{ row.price | currency }})</li>`,
        `    } @empty {`, `      <li i18n>No ${b} rows</li>`, `    }`, `  </ul>`);
      break;
    case 2:
      lines.push(`  @switch (${a}.mode) {`, `    @case ('edit') { <input [(ngModel)]="${a}.${b}" (keyup.enter)="save(${a})" [disabled]="busy" /> }`,
        `    @case ('view') { <span>{{ ${a}.${b} ?? 'n/a' }}</span> }`, `    @default { <em>{{ ${a}.mode }}</em> }`, `  }`);
      break;
    case 3:
      lines.push(`  @defer (on viewport; prefetch on idle) {`, `    <heavy-chart [data]="${a}.series" [title]="'${b} ' + ${i}" />`,
        `  } @placeholder (minimum 100ms) {`, `    <div class="skeleton"></div>`, `  } @loading {`, `    <p>Loading…</p>`, `  }`);
      break;
    default:
      lines.push(`  <span i18n>{${a}Total${i}, plural, =0 {no ${b}s} =1 {one ${b}} other {{{ ${a}Total${i} }} ${b}s}}</span>`,
        `  <ng-template #tpl${i} let-value="value"><b>{{ value }}</b></ng-template>`,
        `  <ng-container *ngTemplateOutlet="tpl${i}; context: { value: ${a}.${b} }" />`);
  }
  lines.push(`  <button type="button" (click)="remove(${i})" [attr.aria-label]="'Remove ' + ${a}.${b}">Remove</button>`, `</article>`, `}`);
  return lines.join('\n');
}

function template(bytes) {
  const out = ['<section class="dashboard">'];
  let size = 0;
  for (let i = 0; size < bytes; i++) {
    const c = card(i);
    out.push(c);
    size += c.length + 1;
  }
  out.push('  <ng-content select="[slot=footer]" />', '</section>', '');
  return out.join('\n');
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(13);
}

function runOnce(command, args) {
  const t0 = performance.now();
  const result = spawnSync(command, args, { cwd: here, maxBuffer: 1 << 30 });
  const elapsed = performance.now() - t0;
  if (result.status !== 0) {
    console.error(`run failed: ${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
    process.exit(1);
  }
  return { elapsed, stdout: result.stdout };
}

// Alternating Node and native runs; the two outputs must match
function timeBoth(args, count) {
  const node = [];
  const native = [];
  for (let i = 0; i < count; i++) {
    const a = runOnce(process.execPath, ['--experimental-transform-types', '--no-warnings', 'main.ts', ...args]);
    const b = runOnce(exePath, args);
    if (!a.stdout.equals(b.stdout)) {
      console.error('Node and native output differ');
      process.exit(1);
    }
    if (a.stdout.toString().startsWith('// error:')) {
      console.error(`the template has errors:\n${a.stdout.toString().slice(0, 2000)}`);
      process.exit(1);
    }
    node.push(a.elapsed);
    native.push(b.elapsed);
  }
  return [stats(node), stats(native)];
}

function table(nodeStats, nativeStats) {
  console.log('| Runtime    | min          | median       | mean         | max          |');
  console.log('|------------|--------------|--------------|--------------|--------------|');
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
}

// 1. Compile the CLI to a native binary.
fs.mkdirSync(cache, { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', exePath], { cwd: here, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
console.log(`Binary: ${(fs.statSync(exePath).size / (1024 * 1024)).toFixed(1)} MB`);

// 2. Per-call latency on the demo template.
console.log(`\n(a) \`ng-compile\` (built-in demo template), ${runs} runs each (full process: spawn -> exit):\n`);
const [nodeCall, nativeCall] = timeBoth([], runs);
table(nodeCall, nativeCall);
console.log(`\nTypeNative is ${(nodeCall.median / nativeCall.median).toFixed(1)}x faster per call (median).`);

// 3. Scaling on generated templates.
console.log(`\n(b) \`ng-compile generated.component.html\`, ${sizeRuns} runs per size (medians):\n`);
console.log('| Template          | Node.js      | TypeNative   | TypeNative vs Node |');
console.log('|-------------------|--------------|--------------|--------------------|');
for (const size of sizes) {
  seed = 42;
  const big = template(size * 1024);
  fs.writeFileSync(bigPath, big);
  const [nodeBig, nativeBig] = timeBoth([bigPath], sizeRuns);
  const ratio = nodeBig.median / nativeBig.median;
  const label = `${(big.length / 1024).toFixed(0)} KB, ${big.split('\n').length} lines`.padEnd(17);
  console.log(`| ${label} |${fmt(nodeBig.median)} |${fmt(nativeBig.median)} | ${(ratio >= 1 ? `${ratio.toFixed(1)}x faster` : `${(1 / ratio).toFixed(1)}x slower`).padEnd(18)} |`);
}
