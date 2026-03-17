// findIndex, forEach, every, reduce, Object.entries for...of

// findIndex
const items: number[] = [10, 20, 30, 40, 50];
const idx1: number = items.findIndex((n) => n === 30);
const idx2: number = items.findIndex((n) => n === 99);
assert(idx1 === 2, `findIndex found: ${idx1}`);
assert(idx2 === -1, `findIndex not found: ${idx2}`);

// every
const allPositive: boolean = items.every((n) => n > 0);
const allAbove20: boolean = items.every((n) => n > 20);
assert(allPositive === true, `every allPositive: ${allPositive}`);
assert(allAbove20 === false, `every allAbove20: ${allAbove20}`);

// forEach with block body
let forEachSum: number = 0;
items.forEach((n) => {
  forEachSum = forEachSum + n;
});
assert(forEachSum === 150, `forEach sum: ${forEachSum}`);

// reduce with initial value
const nums2: number[] = [1, 2, 3, 4, 5];
const reducedSum: number = nums2.reduce((acc, n) => acc + n, 0);
assert(reducedSum === 15, `reduce sum: ${reducedSum}`);

const reducedProduct: number = nums2.reduce((acc, n) => acc * n, 1);
assert(reducedProduct === 120, `reduce product: ${reducedProduct}`);

// Map for...of with both key and value used
const scores = new Map<string, number>([
  ['alice', 90],
  ['bob', 85],
  ['carol', 92]
]);
let mapTotal: number = 0;
let keyConcat: string = '';
for (const [k, v] of scores) {
  mapTotal = mapTotal + v;
  keyConcat = keyConcat + k;
}
assert(mapTotal === 267, `Map for...of total: ${mapTotal}`);
assert(keyConcat.length === 13, `Map for...of keys: ${keyConcat}`);
