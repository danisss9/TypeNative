type Greeting = `hello ${string}`;
const g: Greeting = 'hello world';
assert(g === 'hello world', 'template literal type');
