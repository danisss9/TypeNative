// node:test --test-randomize / --test-random-seed: siblings run in a seeded
// random order (Node's Mulberry32 pick among those still waiting), the seed
// reported as a diagnostic before the summary. The probe runs itself again as
// a child with each setting; the child's report is TAP or spec
import { spawnSync } from 'node:child_process';
import { it } from 'node:test';

let failures = 0;
function assert(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log('FAIL ' + label);
  }
}

if (process.env.TN_TEST_RANDOMIZE_CHILD) {
  it('one', () => {});
  it('two', () => {});
  it('three', () => {});
  it('four', () => {});
} else {
  const run = (options: string): string => {
    const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      env: { ...process.env, TN_TEST_RANDOMIZE_CHILD: '1', NODE_OPTIONS: options },
      encoding: 'utf8'
    });
    return child.stdout;
  };
  // the child's report: TAP under a pipe (TypeNative's default) or spec
  const order = (out: string): string => {
    const names: string[] = [];
    for (const line of out.split('\n')) {
      const tap = /^ok \d+ - (.+?)\s*$/.exec(line.trim());
      const spec = /^✔ ([\w-]+) \(/.exec(line.trim());
      if (tap) names.push(tap[1]);
      else if (spec) names.push(spec[1]);
    }
    return names.join(',');
  };

  // seed 1: Node's shuffle picks three, one, four, two
  assert(order(run('--test-randomize --test-random-seed=1')) === 'three,one,four,two', `seed 1: ${order(run('--test-randomize --test-random-seed=1'))}`);
  assert(order(run('--test-randomize --test-random-seed=4')) === 'four,one,two,three', `seed 4: ${order(run('--test-randomize --test-random-seed=4'))}`);
  assert(order(run('--test-randomize --test-random-seed=5')) === 'three,four,one,two', `seed 5: ${order(run('--test-randomize --test-random-seed=5'))}`);

  // the same seed twice: the same order
  assert(order(run('--test-randomize --test-random-seed=7')) === order(run('--test-randomize --test-random-seed=7')), 'a seed is deterministic');

  // --test-random-seed alone turns randomize on
  assert(order(run('--test-random-seed=2')) === 'three,one,two,four', `the seed implies randomize: ${order(run('--test-random-seed=2'))}`);

  // without a seed a random one is generated; every test still runs, once
  const random = run('--test-randomize');
  assert(['one', 'two', 'three', 'four'].every((n) => random.includes(n)), 'every test still runs');
  assert(order(random).split(',').sort().join(',') === 'four,one,three,two', `a permutation: ${order(random)}`);

  console.log(failures === 0 ? 'ok' : `failures: ${failures}`);
}
