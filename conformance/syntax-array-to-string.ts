// Arrays convert to strings by joining their elements with commas
const words = ['x', 'y'];
const nums = [1, 2.5];
const nested = [[1, 2], [3]];
assert(String(words) === 'x,y', 'String(array)');
assert(words.toString() === 'x,y', 'array.toString()');
assert(`${nums}` === '1,2.5', 'array in a template');
assert('' + words === 'x,y', 'array concatenation');
assert(String(nested) === '1,2,3', 'nested arrays flatten');
assert(String([true, false]) === 'true,false', 'boolean arrays');
