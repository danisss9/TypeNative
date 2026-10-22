// Array<T> and ReadonlyArray<T> annotations are T[] / readonly T[]
const nums: Array<number> = [1, 2];
const names: ReadonlyArray<string> = ['ada', 'bob'];
const points: Array<{ x: number; y: number }> = [{ x: 1, y: 2 }];
const grid: Array<Array<number>> = [[1, 2], [3]];

function push(xs: Array<number>, n: number): void {
  xs.push(n);
}

function total(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function firsts(rows: ReadonlyArray<Array<number>>): Array<number> {
  return rows.map((row) => row[0]);
}

push(nums, 3);
assert(nums.length === 3 && nums[2] === 3, 'an Array<T> parameter shares the array');
assert(total(nums) === 6, 'readonly T[] parameters');
assert(names.join('+') === 'ada+bob', 'ReadonlyArray<T>');
assert(points[0].y === 2, 'Array of object types');
assert(firsts(grid).join(',') === '1,3', 'nested Array<Array<T>>');
console.log('generic array types ok');
