// node:test 'test:interrupted' event (Node 26):
// - tap and spec reporters format interrupted tests like Node
// - a child test runner receiving SIGINT mid-run reports the running test(s)
// - run({ files }) receiving SIGINT emits 'test:interrupted' on its TestsStream
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { run, test } from 'node:test';
import { tap, spec } from 'node:test/reporters';
import path from 'node:path';

let failures = 0;
function check(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log('FAIL ' + label);
  }
}

const plain = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '');

function runInterruptedChild(reporter: string): Promise<{ code: number | null; signal: string | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      env: { ...process.env, TN_INTERRUPTED_CHILD: '1', NODE_OPTIONS: `--test-reporter=${reporter}`, NO_COLOR: '1' }
    });
    let stdout = '';
    let stderr = '';
    let sent = false;
    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += String(chunk);
      if (!sent && stdout.includes('CHILD_RUNNING')) {
        sent = true;
        child.kill('SIGINT');
      }
    });
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.on('close', (code: number | null, signal: string | null) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

async function main(): Promise<void> {
  process.env.NO_COLOR = '1';

  // 1. Reporters: tap and spec on test:interrupted events
  const events: any[] = [
    { type: 'test:start', data: { name: 'slow test', nesting: 0, file: 'a.test.ts', line: 1, column: 1 } },
    {
      type: 'test:interrupted',
      data: {
        tests: [
          { name: 'slow test', nesting: 0, file: 'a.test.ts', line: 1, column: 1 },
          { name: 'nested test', nesting: 1, file: 'a.test.ts', line: 5, column: 3 }
        ]
      }
    }
  ];

  let tapOut = '';
  for await (const chunk of tap(events)) tapOut += chunk;
  check(
    tapOut ===
      'TAP version 13\n# Subtest: slow test\n# Interrupted while running: slow test at a.test.ts:1:1\n# Interrupted while running: nested test at a.test.ts:5:3\n',
    `tap reporter: ${JSON.stringify(tapOut)}`
  );

  let specOut = '';
  for await (const chunk of Readable.from(events).compose(spec)) specOut += chunk;
  check(
    plain(specOut) === '\nInterrupted while running:\n\n\u26a0 slow test (a.test.ts:1:1)\n  \u26a0 nested test (a.test.ts:5:3)\n',
    `spec reporter: ${JSON.stringify(plain(specOut))}`
  );

  // 2. Child process receiving SIGINT mid-run (tap & spec)
  const tapChild = await runInterruptedChild('tap');
  check(
    tapChild.stdout.includes('# Interrupted while running: slow inner at '),
    `tap child SIGINT: ${JSON.stringify(tapChild.stdout)}`
  );

  const specChild = await runInterruptedChild('spec');
  const specPlain = plain(specChild.stdout);
  check(
    specPlain.includes('Interrupted while running:') && specPlain.includes('\u26a0 slow inner ('),
    `spec child SIGINT: ${JSON.stringify(specPlain)}`
  );

  // 3. run({ files }) receiving SIGINT mid-run emits 'test:interrupted'
  process.env.TN_INTERRUPTED_SLOW = '1';
  const stream = run({ files: [path.join(__dirname, 'interrupted-child-helper.ts')] });
  const interrupted: Array<{ name: string; file: string; nesting: number }> = [];
  let sentRun = false;
  stream.on('test:stdout', (e: unknown) => {
    const d = e as { message?: string };
    if (!sentRun && d.message && d.message.includes('HELPER_RUNNING')) {
      sentRun = true;
      (process as any).emit('SIGINT', 'SIGINT');
    }
  });
  stream.on('test:interrupted', (e: unknown) => {
    const d = e as { tests?: Array<{ name: string; file: string; nesting: number }> };
    for (const t of d.tests ?? []) {
      interrupted.push({ name: t.name, file: t.file, nesting: t.nesting });
    }
  });
  let runTap = '';
  for await (const chunk of stream.compose(tap)) runTap += chunk;
  delete process.env.TN_INTERRUPTED_SLOW;

  check(interrupted.length === 1, `run() emitted one interrupted test (${interrupted.length})`);
  if (interrupted.length === 1) {
    check(
      interrupted[0].name.endsWith('interrupted-child-helper.ts'),
      `run() interrupted name (${interrupted[0].name})`
    );
    check(interrupted[0].nesting === 0, `run() interrupted nesting (${interrupted[0].nesting})`);
  }
  check(
    runTap.includes('# Interrupted while running:') && runTap.includes('interrupted-child-helper.ts'),
    `run() TAP output: ${JSON.stringify(runTap)}`
  );

  if (failures > 0) {
    process.exitCode = 1;
  } else {
    console.log('test interrupted ok');
  }
}

if (process.env.TN_INTERRUPTED_CHILD === '1') {
  test('outer', async (t) => {
    await t.test('slow inner', async () => {
      console.log('CHILD_RUNNING');
      await new Promise((r) => setTimeout(r, 10000));
    });
  });
} else {
  main();
}
