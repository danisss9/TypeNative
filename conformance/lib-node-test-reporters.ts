// node:test/reporters: tap / dot / junit as generator functions over an event
// source, spec / lcov as Transform streams for compose(), with Node's output;
// --test-reporter-destination pairs with --test-reporter (a file, or stdout).
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { tap, spec, dot, junit, lcov } from 'node:test/reporters';
import assert from 'node:assert';
import { readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A passing test as the runner's events tell it (what run() streams, or a
// hand-made array)
const events: any[] = [
  { type: 'test:start', data: { name: 'x', nesting: 0 } },
  { type: 'test:pass', data: { name: 'x', nesting: 0, testNumber: 1, details: { duration_ms: 1.5, type: 'test' } } },
  { type: 'test:plan', data: { count: 1, nesting: 0 } },
  { type: 'test:diagnostic', data: { message: 'tests 1', nesting: 0 } }
];

// A test:coverage event, as the runner emits it after a covered run
const coverage: any[] = [
  ...events.slice(0, 3),
  {
    type: 'test:coverage',
    data: {
      nesting: 0,
      summary: {
        workingDirectory: '',
        files: [
          {
            path: 'lib.ts',
            totalLineCount: 2,
            totalBranchCount: 0,
            totalFunctionCount: 1,
            coveredLineCount: 1,
            coveredBranchCount: 0,
            coveredFunctionCount: 1,
            functions: [{ name: 'f', line: 1, count: 1 }],
            branches: [],
            lines: [
              { line: 1, count: 1 },
              { line: 2, count: 0 }
            ]
          }
        ],
        totals: {
          totalLineCount: 2,
          totalBranchCount: 0,
          totalFunctionCount: 1,
          coveredLineCount: 1,
          coveredBranchCount: 0,
          coveredFunctionCount: 1,
          coveredLinePercent: 50,
          coveredBranchPercent: 100,
          coveredFunctionPercent: 100
        }
      }
    }
  }
];

// The reporters color their output on a terminal; strip the escapes either way
const plain = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '');

async function main(): Promise<void> {
  process.env.NO_COLOR = '1';

  let out = '';
  for await (const text of tap(events)) out += text;
  assert(
    out === "TAP version 13\n# Subtest: x\nok 1 - x\n  ---\n  duration_ms: 1.5\n  type: 'test'\n  ...\n1..1\n# tests 1\n",
    `tap: ${JSON.stringify(out)}`
  );

  out = '';
  for await (const text of Readable.from(events).compose(tap)) out += text;
  assert(out.startsWith('TAP version 13\n') && out.includes('ok 1 - x'), 'compose(tap) runs the generator');

  out = '';
  for await (const text of dot(events)) out += text;
  assert(out === '.\n', `dot: ${JSON.stringify(out)}`);

  out = '';
  for await (const text of junit(events)) out += text;
  assert(
    out ===
      '<?xml version="1.0" encoding="utf-8"?>\n<testsuites>\n\t<testcase name="x" time="0.001500" classname="test"/>\n\t<!-- tests 1 -->\n</testsuites>\n',
    `junit: ${JSON.stringify(out)}`
  );

  out = '';
  for await (const text of Readable.from(events).compose(spec)) out += text;
  assert(plain(out) === '\u2714 x (1.5ms)\n\u2139 tests 1\n', `spec: ${JSON.stringify(plain(out))}`);

  out = '';
  for await (const text of Readable.from(coverage).compose(lcov)) out += text;
  assert(
    out === 'TN:\nSF:lib.ts\nFN:1,f\nFNDA:1,f\nFNF:1\nFNH:1\nBRF:0\nBRH:0\nDA:1,1\nDA:2,0\nLH:1\nLF:2\nend_of_record\n',
    `lcov: ${JSON.stringify(out)}`
  );

  // --test-reporter-destination: the reporter's text goes to the file
  const dest = path.join(os.tmpdir(), `tn-reporter-${process.pid}.txt`);
  const child = (options: string): { status: number | null; stdout: string; stderr: string } => {
    const result = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      env: { ...process.env, TN_REPORTERS_CHILD: '1', NODE_OPTIONS: options },
      encoding: 'utf8'
    });
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  };
  const toFile = child(`--test-reporter=tap --test-reporter-destination=${dest}`);
  assert(toFile.status === 0, `destination child passes: ${toFile.stderr}`);
  const written = readFileSync(dest, 'utf8');
  assert(written.startsWith('TAP version 13\n') && written.includes('ok 1 - child test'), `destination file: ${written}`);
  assert(toFile.stdout === '', 'the reporter no longer writes to stdout');
  rmSync(dest);

  // one destination per reporter
  const unpaired = child('--test-reporter=tap --test-reporter-destination=a --test-reporter-destination=b');
  assert(unpaired.status !== 0, 'unpaired destinations fail the run');
  assert(unpaired.stderr.includes("must match the number of specified '--test-reporter-destination'"), 'the pairing error');

  console.log('test reporters ok');
}

if (process.env.TN_REPORTERS_CHILD) {
  // the child's reporter writes to the destination, not stdout
  test('child test', () => {});
} else {
  main();
}
