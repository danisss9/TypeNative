// Array methods: includes/indexOf dispatch, sort with comparator, flat, find
const nums = [3, 1, 4, 1, 5, 9];
assert(nums.includes(4), 'includes failed');
assert(nums.indexOf(4) === 2, 'indexOf failed');

const sorted = [...nums].sort((a, b) => a - b);
assert(sorted[0] === 1 && sorted[5] === 9, `sort failed: ${sorted.join(',')}`);

const found = nums.find((n) => n > 4);
assert(found === 5, `find failed: ${found}`);
assert(nums.findIndex((n) => n === 9) === 5, 'findIndex failed');
assert(nums.some((n) => n > 8), 'some failed');
assert(nums.every((n) => n > 0), 'every failed');

const nested = [[1, 2], [3, 4]];
assert(nested.flat().length === 4, 'flat failed');
