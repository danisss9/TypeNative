// Destructuring past the end of an array gives undefined (the element's zero
// value only fills a binding with a default)
const empty: number[] = [];
const [a] = empty;
assert(a === undefined, `a is undefined, got ${a}`);
const [b = 42] = empty;
assert(b === 42, 'a default fills a missing element');
const pair: number[] = [1, 10];
const [, , extra] = pair;
assert(extra === undefined, `past a filled array, got ${extra}`);
const words: string[] = [];
const [w] = words;
assert(w === undefined, `string arrays too, got '${w}'`);
const [x = 'dflt'] = words;
assert(x === 'dflt', `string default, got '${x}'`);
console.log('semantics-destructure-past-end ok');
