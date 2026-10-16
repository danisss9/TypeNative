// Console output formats: the probe re-runs itself and checks the child's stdout
import { spawnSync } from 'node:child_process';

if (process.argv.includes('--child')) {
  console.log('%s has %d items', 'cart', 3);
  console.log([1, 2], { a: 'x' });
  console.info('info', 1.5);
  console.debug(1000000);
  console.group('Group');
  console.log('inside');
  console.groupEnd();
  console.log('outside');
  console.count();
  console.count('apples');
  console.count();
  console.dir({ nested: { value: true } });
  console.assert(true, 'not printed');
} else {
  const result = spawnSync(process.execPath, [...process.execArgv, process.argv[1], '--child'], { encoding: 'utf-8' });
  const lines = String(result.stdout).replace(/\r\n/g, '\n').split('\n');
  assert(lines[0] === 'cart has 3 items', 'format string');
  assert(lines[1] === "[ 1, 2 ] { a: 'x' }", 'objects are inspected');
  assert(lines[2] === 'info 1.5', 'console.info');
  assert(lines[3] === '1000000', 'numbers print in JS notation');
  assert(lines[4] === 'Group' && lines[5] === '  inside' && lines[6] === 'outside', 'console.group indents');
  assert(lines[7] === 'default: 1' && lines[8] === 'apples: 1' && lines[9] === 'default: 2', 'console.count');
  assert(lines[10] === '{ nested: { value: true } }', 'console.dir');
  assert(lines[11] === '', 'console.assert(true) prints nothing');
}
