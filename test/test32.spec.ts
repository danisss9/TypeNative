// child_process spawnSync mapping + unbraced if/else statements

import * as childProcess from 'node:child_process';

// spawnSync with captured output (same call shape index.ts uses)
const result = (childProcess as any).spawnSync('go', ['version'], { encoding: 'utf-8' });
assert(result.status === 0, `spawnSync status: ${result.status}`);
assert(result.stdout.includes('go version'), `spawnSync stdout: ${result.stdout}`);

// Unbraced if with early return
function classify(n: number): string {
  if (n < 0) return 'negative';
  if (n === 0) return 'zero';
  return 'positive';
}
assert(classify(-5) === 'negative', 'unbraced if return (then)');
assert(classify(0) === 'zero', 'unbraced if return (second)');
assert(classify(7) === 'positive', 'unbraced if fallthrough');

// Unbraced if/else and else-if chains
function parity(n: number): string {
  if (n % 2 === 0) return 'even';
  else return 'odd';
}
assert(parity(4) === 'even', 'unbraced if/else (then)');
assert(parity(9) === 'odd', 'unbraced if/else (else)');

function size(n: number): string {
  if (n < 10) return 'small';
  else if (n < 100) return 'medium';
  else return 'large';
}
assert(size(5) === 'small', 'else-if chain (1)');
assert(size(50) === 'medium', 'else-if chain (2)');
assert(size(500) === 'large', 'else-if chain (3)');

// Unbraced while body with break
function firstIndexOver(nums: number[], limit: number): number {
  let i: number = 0;
  while (i < nums.length) {
    if (nums[i] > limit) break;
    i++;
  }
  return i;
}
const nums: number[] = [1, 5, 20, 3];
assert(firstIndexOver(nums, 10) === 2, `unbraced break: ${firstIndexOver(nums, 10)}`);
