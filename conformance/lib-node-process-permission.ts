// process.permission (`has`, `drop`) under --permission: grants come from
// NODE_OPTIONS; without the flag process.permission is undefined; the model
// gates fs / child_process / worker access with ERR_ACCESS_DENIED
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const self = process.argv[1];
const mode = process.env.TN_ROLE ?? '';
const perm = (process as any).permission;

if (mode === 'gc') {
  process.exit(0);
} else if (mode === 'nop') {
  assert(perm === undefined, `permission without --permission: ${String(perm)}`);
  console.log('nop ok');
} else if (mode === 'deny') {
  assert(perm !== undefined, 'permission exists under --permission');
  assert(perm.has('fs.read') === false && perm.has('fs.write') === false, 'fs denied');
  assert(perm.has('fs.read', process.cwd()) === false, 'fs.read of a path denied');
  assert(perm.has('child') === false && perm.has('worker') === false && perm.has('addon') === false, 'child/worker/addon denied');
  assert(perm.has('bogus') === false, 'unknown permission denied');
  const target = path.join(os.tmpdir(), 'tn-perm-target.txt');
  try {
    fs.readFileSync(target);
    assert(false, 'readFileSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `readFileSync ${e.code}`);
    assert(String(e.message).includes('Access to this API has been restricted'), e.message);
  }
  try {
    fs.writeFileSync(path.join(os.tmpdir(), 'tn-perm-denied.txt'), 'x');
    assert(false, 'writeFileSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `writeFileSync ${e.code}`);
  }
  try {
    fs.openSync(target, 'r');
    assert(false, 'openSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `openSync ${e.code}`);
  }
  try {
    fs.mkdirSync(path.join(os.tmpdir(), 'tn-perm-denied-dir'));
    assert(false, 'mkdirSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `mkdirSync ${e.code}`);
  }
  try {
    spawnSync(process.execPath, ['--version']);
    assert(false, 'spawnSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `spawnSync ${e.code}`);
    assert(String(e.message).includes('--allow-child-process'), e.message);
  }
  // drop() at runtime
  perm.drop('child');
  assert(perm.has('child') === false, 'drop is idempotent');
  perm.drop('fs.read');
  assert(perm.has('fs.read') === false && perm.has('fs.read', self) === false, 'drop fs.read');
  console.log('deny ok');
} else if (mode === 'allow') {
  // --permission --allow-fs-read=<dir> --allow-child-process
  const dir = process.env.TN_PERM_DIR!;
  assert(perm.has('fs.read') === false, 'a scoped fs.read grant is not the wildcard');
  assert(perm.has('fs.read', path.join(dir, 'probe.txt')) === true, 'a path under the grant');
  assert(perm.has('fs.read', path.join(dir, 'nope.txt')) === true, 'any path under the granted dir');
  assert(perm.has('fs.read', 'C:/Windows/system32') === false, 'a path outside the grant');
  assert(perm.has('fs.write') === false, 'writes still denied');
  assert(perm.has('child') === true, 'child allowed');
  assert(perm.has('worker') === false, 'worker still denied');
  const data = fs.readFileSync(path.join(dir, 'probe.txt'), 'utf8');
  assert(data === 'granted\n', `readFileSync under the grant: ${JSON.stringify(data)}`);
  const r = spawnSync(process.execPath, [self], { env: { ...process.env, TN_ROLE: 'gc' }, encoding: 'utf8' });
  assert(r.status === 0, `spawnSync allowed: ${r.status} ${r.stderr}`);
  try {
    fs.writeFileSync(path.join(dir, 'no.txt'), 'x');
    assert(false, 'writeFileSync should still be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `writeFileSync ${e.code}`);
  }
  // dropping one path keeps others granted
  perm.drop('fs.read', path.join(dir, 'probe.txt'));
  assert(perm.has('fs.read', path.join(dir, 'other.txt')) === true, 'other paths stay granted');
  console.log('allow ok');
} else {
  // the parent: run this program again under three permission configurations
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-perm-'));
  fs.writeFileSync(path.join(dir, 'probe.txt'), 'granted\n');
  fs.writeFileSync(path.join(dir, 'other.txt'), 'other\n');
  fs.writeFileSync(path.join(os.tmpdir(), 'tn-perm-target.txt'), 'target\n');
  const run = (role: string, nodeOptions: string) => {
    const r = spawnSync(process.execPath, [self], {
      env: { ...process.env, TN_ROLE: role, NODE_OPTIONS: nodeOptions, TN_PERM_DIR: dir },
      encoding: 'utf8'
    });
    return { code: r.status, out: r.stdout, err: r.stderr };
  };
  const nop = run('nop', '');
  assert(nop.out === 'nop ok\n' && nop.code === 0, `no permission: ${JSON.stringify(nop)}`);
  const deny = run('deny', '--permission');
  assert(deny.out === 'deny ok\n' && deny.code === 0, `denied model: ${JSON.stringify(deny)}`);
  const allow = run('allow', `--permission --allow-fs-read=${dir} --allow-child-process`);
  assert(allow.out === 'allow ok\n' && allow.code === 0, `granted model: ${JSON.stringify(allow)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('process.permission ok');
}
