// node:test coverage (--experimental-test-coverage): the program's functions,
// branches and lines with their counts, as lcov records and as the tap/spec
// coverage table; node:coverage ignore comments exclude ranges, and
// --test-coverage-lines / -branches / -functions thresholds can fail the run.
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert';

function twice(n: number): number {
  return n * 2;
}

function kind(n: number): string {
  if (n > 0) {
    return 'positive';
  }
  return 'other';
}

function neverCalled(): number {
  return twice(2);
}

/* node:coverage ignore next */
function ignoredAlways(): number { return 3; }

if (process.env.TN_COVERAGE_CHILD) {
  test('covers a function', () => {
    assert.strictEqual(twice(2), 4);
  });
  test('covers one branch', () => {
    assert.strictEqual(kind(1), 'positive');
  });
} else {
  const run = (options: string): { out: string; status: number | null } => {
    const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      env: { ...process.env, TN_COVERAGE_CHILD: '1', NODE_OPTIONS: options },
      encoding: 'utf8'
    });
    return { out: child.stdout ?? '', status: child.status };
  };

  // lcov: functions with counts, the untaken branch, uncovered lines
  const lcov = run('--experimental-test-coverage --test-reporter=lcov');
  assert(lcov.status === 0, `coverage run passes: ${lcov.out}`);
  assert(lcov.out.startsWith('TN:\n'), `lcov header: ${JSON.stringify(lcov.out.slice(0, 20))}`);
  assert(/^SF:.*lib-node-test-coverage\.ts$/m.test(lcov.out), `lcov file: ${lcov.out}`);
  assert(/^FN:\d+,twice$/m.test(lcov.out) && /^FN:\d+,kind$/m.test(lcov.out), `functions listed: ${lcov.out}`);
  assert(/^FNDA:1,twice$/m.test(lcov.out) && /^FNDA:1,kind$/m.test(lcov.out), `called functions count: ${lcov.out}`);
  assert(/^FNDA:0,neverCalled$/m.test(lcov.out), `an uncalled function counts 0: ${lcov.out}`);
  assert(/^FNDA:0,ignoredAlways$/m.test(lcov.out), `an ignored function is listed as in Node: ${lcov.out}`);
  assert(/^BRDA:\d+,\d+,0,1$/m.test(lcov.out) && /^BRDA:\d+,\d+,0,0$/m.test(lcov.out), `branch counts: ${lcov.out}`);
  assert(/^BRF:\d+$/m.test(lcov.out) && /^BRH:\d+$/m.test(lcov.out), `branch totals: ${lcov.out}`);
  assert(/^DA:1,1$/m.test(lcov.out) && /^DA:\d+,0$/m.test(lcov.out), `line counts: ${lcov.out}`);
  assert(/^LH:\d+$/m.test(lcov.out) && /^LF:\d+$/m.test(lcov.out), `line totals: ${lcov.out}`);
  assert(lcov.out.trimEnd().endsWith('end_of_record'), `record end: ${lcov.out.slice(-40)}`);

  // the coverage table the tap and spec reporters print
  const table = run('--experimental-test-coverage --test-reporter=tap');
  assert(table.out.includes('# start of coverage report') && table.out.includes('# end of coverage report'), `table bounds: ${table.out}`);
  assert(/#\s*lib-node-test-coverage\.ts\s*\|/.test(table.out), `table file row: ${table.out}`);
  assert(/# all files\s*\|/.test(table.out), `table totals: ${table.out}`);

  // thresholds below the actual coverage pass, above fail the run
  const threshold = run('--experimental-test-coverage --test-coverage-lines=100 --test-reporter=tap');
  assert(threshold.status === 1, `an unmet threshold fails: ${threshold.status}`);
  assert(threshold.out.includes('line coverage does not meet threshold of 100%'), `threshold error: ${threshold.out}`);

  console.log('test coverage ok');
}
