// node:test --test-coverage-include-all: the working directory's source files
// that never ran appear in the coverage report with their whole file uncovered
// (Node's **/*.{cjs,cts,js,mjs,mts,ts} walk, without node_modules). The probe
// writes fixture files into a temp directory and runs itself again as a child
// with that directory as its working directory
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it } from 'node:test';

let failures = 0;
function assert(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log('FAIL ' + label);
  }
}

if (process.env.TN_TEST_COVER_ALL_CHILD) {
  it('runs', () => {});
} else {
  const dir = mkdtempSync(path.join(tmpdir(), 'tn-cover-all-'));
  writeFileSync(path.join(dir, 'unused-fixture.mjs'), 'export function a() {\n  return 1;\n}\n');
  writeFileSync(path.join(dir, 'one-liner.js'), 'const x = 1;\n');
  const nested = path.join(dir, 'deep');
  mkdirSync(nested);
  writeFileSync(path.join(nested, 'in-deep.mjs'), 'export function b() { return 2; }\nexport function c() { return 3; }\n');
  writeFileSync(path.join(dir, 'skipped.json'), '{}');

  const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    cwd: dir,
    env: { ...process.env, TN_TEST_COVER_ALL_CHILD: '1', NODE_OPTIONS: '--experimental-test-coverage --test-coverage-include-all' },
    encoding: 'utf8'
  });
  const out = child.stdout;
  console.log('CHILD OUT:', JSON.stringify(out.slice(0, 600)));

  assert(out.includes('unused-fixture.mjs'), 'the unloaded module is listed');
  assert(/unused-fixture\.mjs\s*\|\s*0\.00\s*\|\s*100\.00\s*\|\s*100\.00\s*\|\s*1-3/.test(out), `its whole file is uncovered: ${out.split('\n').filter((l) => l.includes('unused-fixture')).join(' / ')}`);
  assert(/one-liner\.js\s*\|\s*0\.00\s*\|\s*100\.00\s*\|\s*100\.00\s*\|\s*1/.test(out), 'the one-liner reports line 1');
  assert(/in-deep\.mjs\s*\|\s*0\.00/.test(out), 'a nested file is listed');
  assert(!out.includes('skipped.json'), 'non-source files are not listed');
  assert(out.includes('all files'), 'the totals row is there');

  rmSync(dir, { recursive: true, force: true });
  console.log(failures === 0 ? 'ok' : `failures: ${failures}`);
}
