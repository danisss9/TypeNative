// Array destructuring with a rest element: `...rest` is a fresh array of the
// remaining elements (empty when the source is shorter)
const args = ['add', 'Buy', 'milk'];
const [command, ...rest] = args;
assert(command === 'add', 'head element');
assert(rest.length === 2 && rest.join(' ') === 'Buy milk', 'rest elements');
rest.push('now');
assert(args.length === 3, 'rest is a copy');

const [a, b, c, ...none] = args;
assert(a === 'add' && b === 'Buy' && c === 'milk', 'positional elements');
assert(none.length === 0, 'rest past the end is empty');

const [first, ...tail] = [1, 2, 3, 4];
assert(first === 1 && tail.reduce((s, x) => s + x, 0) === 9, 'number rest');
