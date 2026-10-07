// continue statement, and for-of tuple destructuring over a Map
let sumSmall = 0;
for (let i = 0; i < 10; i++) {
  if (i >= 5) continue;
  sumSmall += i;
}
assert(sumSmall === 10, `sumSmall should be 10 (0+1+2+3+4), got ${sumSmall}`);

// continue inside a for...of
const nums: number[] = [1, 2, 3, 4, 5, 6];
let sumBig = 0;
for (const n of nums) {
  if (n < 4) continue;
  sumBig += n;
}
assert(sumBig === 15, `sumBig should be 15 (4+5+6), got ${sumBig}`);

// for-of tuple destructuring over a Map (key/value iteration)
const scores: Map<string, number> = new Map<string, number>();
scores.set('a', 10);
scores.set('b', 20);
let total = 0;
for (const [, v] of scores) {
  total += v;
}
assert(total === 30, `total should be 30, got ${total}`);
