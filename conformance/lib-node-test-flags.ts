// node:test flags read from NODE_OPTIONS, as Node reads them: --test-name-pattern,
// --test-skip-pattern, --test-only and --test-reporter (tap / spec / dot / junit).
// The probe runs itself again as a child with each setting.
import { spawnSync } from 'node:child_process';
import { test, describe, it } from 'node:test';

if (process.env.TN_TEST_FLAGS_CHILD) {
  test('alpha one', () => {});
  describe('group', () => {
    it('inner alpha', () => {});
    it('inner beta', () => {});
  });
  describe('other', () => {
    it.only('focused', () => {});
    it('unfocused', () => {});
  });
  test('fails', () => {
    throw new Error('boom');
  });
} else {
  const run = (options: string): string => {
    const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      env: { ...process.env, TN_TEST_FLAGS_CHILD: '1', NODE_OPTIONS: options },
      encoding: 'utf8'
    });
    return child.stdout;
  };
  const oks = (out: string): string =>
    out
      .split('\n')
      .filter((l) => /^\s*(not )?ok /.test(l))
      .map((l) => l.trim().replace(/ #.*/, ''))
      .join('|');

  const byName = run('--test-name-pattern=alpha');
  assert(oks(byName) === 'ok 1 - alpha one|ok 1 - inner alpha|ok 2 - group', `name pattern: ${oks(byName)}`);
  assert(byName.includes('# tests 2'), 'only matching tests count');

  const bySuite = run('--test-name-pattern=/GROUP/i');
  assert(oks(bySuite) === 'ok 1 - inner alpha|ok 2 - inner beta|ok 1 - group', `a matching suite runs all its tests: ${oks(bySuite)}`);

  const skipped = run('--test-skip-pattern=alpha --test-skip-pattern=fails');
  assert(oks(skipped) === 'ok 1 - inner beta|ok 1 - group|ok 1 - focused|ok 2 - unfocused|ok 2 - other', `skip pattern: ${oks(skipped)}`);
  assert(skipped.includes("# 'only' and 'runOnly' require the --test-only command-line option."), 'the only notice without --test-only');

  const only = run('--test-only');
  assert(oks(only) === 'ok 1 - focused|ok 1 - other', `only: ${oks(only)}`);

  const dots = run('--test-reporter=dot --test-skip-pattern=fails');
  assert(dots.split('\n')[0] === '.......', `dot reporter: ${JSON.stringify(dots.split('\n')[0])}`);
  const failing = run('--test-reporter=dot --test-name-pattern=fails');
  assert(failing.startsWith('X\n\nFailed tests:\n'), `dot failures: ${JSON.stringify(failing.slice(0, 30))}`);

  const junit = run('--test-reporter=junit --test-name-pattern="inner beta"');
  assert(junit.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<testsuites>'), 'junit header');
  assert(
    /<testsuite name="group" time="[0-9.]+" disabled="0" errors="0" tests="1" failures="0" skipped="0" timestamp="\d{4}-\d\d-\d\dT[\d:.]+Z" hostname="[^"]*">/.test(junit),
    'junit suite'
  );
  assert(/<testcase name="inner beta" time="[0-9.]+" classname="test" file="[^"]*lib-node-test-flags\.ts"\/>/.test(junit), 'junit test case');
  console.log('test flags ok');
}
