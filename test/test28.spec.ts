// Spread in array literals, rest parameters, spread in function calls

// Spread in array literals
const arr1: number[] = [1, 2, 3];
const arr11: number[] = [4, 5, 6];
const combined: number[] = [...arr1, ...arr11];
assert(combined.length === 6, `spread combined length: ${combined.length}`);
assert(combined[0] === 1, `spread combined[0]: ${combined[0]}`);
assert(combined[5] === 6, `spread combined[5]: ${combined[5]}`);

const withExtra: number[] = [...arr1, 10, 20];
assert(withExtra.length === 5, `spread with extra length: ${withExtra.length}`);
assert(withExtra[3] === 10, `spread with extra [3]: ${withExtra[3]}`);
assert(withExtra[4] === 20, `spread with extra [4]: ${withExtra[4]}`);

const prepended: number[] = [0, ...arr1];
assert(prepended.length === 4, `prepended length: ${prepended.length}`);
assert(prepended[0] === 0, `prepended[0]: ${prepended[0]}`);
assert(prepended[1] === 1, `prepended[1]: ${prepended[1]}`);

// Rest parameters
function sum(...nums: number[]): number {
  let total: number = 0;
  for (const n of nums) {
    total = total + n;
  }
  return total;
}
assert(sum(1, 2, 3) === 6, `rest sum(1,2,3): ${sum(1, 2, 3)}`);
assert(sum(10, 20) === 30, `rest sum(10,20): ${sum(10, 20)}`);
assert(sum() === 0, `rest sum(): ${sum()}`);

// Spread in function calls
const nums3: number[] = [1, 2, 3, 4, 5];
const joined3: string = nums3.join(', ');
assert(joined3 === '1, 2, 3, 4, 5', `joined3: ${joined3}`);
