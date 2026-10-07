// Untyped array literals + Math.max/min with spread and variadic args
const nums = [3, 1, 4, 1, 5];
assert(Math.max(...nums) === 5, 'Math.max spread failed');
assert(Math.min(...nums) === 1, 'Math.min spread failed');
assert(Math.max(2, 9, 4) === 9, 'Math.max variadic failed');
assert(Math.min(2, 9, 4) === 2, 'Math.min variadic failed');

const more = [...nums, 9];
assert(more.length === 6 && more[5] === 9, 'array spread failed');

const words = ['a', 'b', 'c'];
assert(words.join('-') === 'a-b-c', 'string array join failed');
