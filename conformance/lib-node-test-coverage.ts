// node:test coverage (--experimental-test-coverage): the program's functions,
// branches and lines with their counts, as lcov records and as the tap/spec
// coverage table; node:coverage ignore comments exclude ranges, and
// --test-coverage-lines / -branches / -functions thresholds can fail the run.
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert';
import { Counter, classify, safe, double, outer, loopy, pick, label } from './node-test-coverage-helper';

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

if (process.env.TN_COVERAGE_CHILD === 'helper') {
  // the calls whose coverage of the helper Node 24 reports below
  test('helper', () => {
    const c = new Counter(1);
    c.inc(3);
    void c.value;
    classify(1);
    classify(5);
    safe(() => 2);
    double(2);
    outer();
    loopy([1, -1, 2]);
    pick(false, false);
    label('a');
  });
} else if (process.env.TN_COVERAGE_CHILD) {
  test('covers a function', () => {
    assert.strictEqual(twice(2), 4);
  });
  test('covers one branch', () => {
    assert.strictEqual(kind(1), 'positive');
  });
} else {
  const run = (options: string, mode = '1'): { out: string; status: number | null } => {
    const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      env: { ...process.env, TN_COVERAGE_CHILD: mode, NODE_OPTIONS: options },
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

  // Node 24's record for the helper (classes, field initializers, loops, switch,
  // try / catch / finally, ternaries, && / || / ?? operands, nested and uncalled
  // functions, an ignore comment), --test-coverage-include keeping only it
  const exact = run('--experimental-test-coverage --test-coverage-include=**/node-test-coverage-helper.ts --test-reporter=lcov', 'helper');
  const expected = [
    'TN:',
    'SF:conformance/node-test-coverage-helper.ts',
    'FN:4,<instance_members_initializer>',
    'FN:5,Counter',
    'FN:8,inc',
    'FN:14,get value',
    'FN:17,reset',
    'FN:22,classify',
    'FN:34,safe',
    'FN:44,double',
    'FN:46,outer',
    'FN:47,inner',
    'FN:54,unusedHelper',
    'FN:60,ignored',
    'FN:62,loopy',
    'FN:72,pick',
    'FN:78,label',
    'FNDA:1,<instance_members_initializer>',
    'FNDA:1,Counter',
    'FNDA:3,inc',
    'FNDA:1,get value',
    'FNDA:0,reset',
    'FNDA:2,classify',
    'FNDA:1,safe',
    'FNDA:1,double',
    'FNDA:1,outer',
    'FNDA:1,inner',
    'FNDA:0,unusedHelper',
    'FNDA:0,ignored',
    'FNDA:3,loopy',
    'FNDA:1,pick',
    'FNDA:1,label',
    'FNF:15',
    'FNH:13',
    'BRDA:1,0,0,1',
    'BRDA:4,1,0,1',
    'BRDA:5,2,0,1',
    'BRDA:8,3,0,1',
    'BRDA:9,4,0,3',
    'BRDA:14,5,0,1',
    'BRDA:22,6,0,2',
    'BRDA:24,7,0,1',
    'BRDA:26,8,0,0',
    'BRDA:28,9,0,1',
    'BRDA:34,10,0,1',
    'BRDA:37,11,0,0',
    'BRDA:44,12,0,1',
    'BRDA:46,13,0,1',
    'BRDA:47,14,0,1',
    'BRDA:48,15,0,0',
    'BRDA:62,16,0,1',
    'BRDA:64,17,0,3',
    'BRDA:65,18,0,1',
    'BRDA:65,19,0,2',
    'BRDA:68,20,0,0',
    'BRDA:69,21,0,0',
    'BRDA:72,22,0,1',
    'BRDA:73,23,0,0',
    'BRDA:78,24,0,1',
    'BRDA:79,25,0,0',
    'BRF:26',
    'BRH:19',
    'DA:1,1',
    'DA:2,1',
    'DA:3,1',
    'DA:4,1',
    'DA:5,1',
    'DA:6,1',
    'DA:7,1',
    'DA:8,1',
    'DA:9,1',
    'DA:10,3',
    'DA:11,3',
    'DA:12,1',
    'DA:13,1',
    'DA:14,1',
    'DA:15,1',
    'DA:16,1',
    'DA:17,1',
    'DA:18,0',
    'DA:19,0',
    'DA:20,1',
    'DA:21,1',
    'DA:22,1',
    'DA:23,2',
    'DA:24,2',
    'DA:25,1',
    'DA:26,2',
    'DA:27,0',
    'DA:28,2',
    'DA:29,1',
    'DA:30,2',
    'DA:31,2',
    'DA:32,1',
    'DA:33,1',
    'DA:34,1',
    'DA:35,1',
    'DA:36,1',
    'DA:37,1',
    'DA:38,0',
    'DA:39,1',
    'DA:40,1',
    'DA:41,1',
    'DA:42,1',
    'DA:43,1',
    'DA:44,1',
    'DA:45,1',
    'DA:46,1',
    'DA:47,1',
    'DA:48,1',
    'DA:49,1',
    'DA:50,1',
    'DA:51,1',
    'DA:52,1',
    'DA:53,1',
    'DA:54,1',
    'DA:55,0',
    'DA:56,0',
    'DA:57,0',
    'DA:58,1',
    'DA:59,1',
    'DA:61,1',
    'DA:62,1',
    'DA:63,1',
    'DA:64,1',
    'DA:65,3',
    'DA:66,2',
    'DA:67,2',
    'DA:68,1',
    'DA:69,1',
    'DA:70,1',
    'DA:71,1',
    'DA:72,1',
    'DA:73,1',
    'DA:74,1',
    'DA:75,1',
    'DA:76,1',
    'DA:77,1',
    'DA:78,1',
    'DA:79,1',
    'DA:80,1',
    'LH:73',
    'LF:80',
    'end_of_record'
  ];
  const record = exact.out.split('\\').join('/').trimEnd().split('\n');
  // (SF is relative to the working directory)
  assert(record[1].startsWith('SF:') && record[1].endsWith('conformance/node-test-coverage-helper.ts'), `lcov file: ${record[1]}`);
  record[1] = expected[1];
  for (let i = 0; i < Math.max(record.length, expected.length); i++) {
    assert(record[i] === expected[i], `lcov line ${i + 1}: ${JSON.stringify(record[i])}, Node: ${JSON.stringify(expected[i])}`);
  }

  console.log('test coverage ok');
}
