// Template Literals
const name: string = 'world';
const str1: string = `hello ${name}`;
console.log(str1);
assert(str1 === 'hello world', 'template literal — simple');

const x: number = 5;
const str2: string = `value: ${x + 2}`;
console.log(str2);
assert(str2 === 'value: 7', 'template literal — expression');

const aa: string = 'A';
const bb: string = 'B';
const str3 = `${aa}-${bb}-${1 + 2}`;
console.log(str3);
assert(str3 === 'A-B-3', 'template literal — multiple parts');

const raw = `line\nanother`;
assert(raw === 'line\nanother', 'no-substitution / multiline template');
