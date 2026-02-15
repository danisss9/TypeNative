// Standard object methods: String, Array, Math

// --- String methods ---
const greeting: string = 'Hello, World!';

const upperTest: string = greeting.toUpperCase();
assert(upperTest === 'HELLO, WORLD!', 'toUpperCase failed');

const lower: string = greeting.toLowerCase();
assert(lower === 'hello, world!', 'toLowerCase failed');

const padded: string = '  hello  ';
const trimmed: string = padded.trim();
assert(trimmed === 'hello', 'trim failed');

const csv: string = 'a,b,c';
const parts: string[] = csv.split(',');
assert(parts.length === 3, 'split should produce 3 parts');
assert(parts[0] === 'a', 'split first element');

assert(greeting.includes('World') === true, 'includes failed');
assert(greeting.startsWith('Hello') === true, 'startsWith failed');
assert(greeting.endsWith('!') === true, 'endsWith failed');

const idx: number = greeting.indexOf('World');
assert(idx === 7, 'indexOf should be 7');

const replaced: string = greeting.replace('World', 'Go');
assert(replaced === 'Hello, Go!', 'replace failed');

const multi: string = 'aaa';
const allReplaced: string = multi.replaceAll('a', 'b');
assert(allReplaced === 'bbb', 'replaceAll failed');

const ch: string = greeting.charAt(0);
assert(ch === 'H', 'charAt failed');

const sub: string = greeting.substring(0, 5);
assert(sub === 'Hello', 'substring failed');

const ab: string = 'ab';
const rep: string = ab.repeat(3);
assert(rep === 'ababab', 'repeat failed');

// --- Array methods ---
let nums: number[] = [3, 1, 2];
nums.push(4);
assert(nums.length === 4, 'push should make length 4');

const words: string[] = ['hello', 'world'];
const joined: string = words.join(' ');
assert(joined === 'hello world', 'join failed');

const sliced: number[] = nums.slice(1, 3);
assert(sliced.length === 2, 'slice should produce 2 elements');
assert(sliced[0] === 1, 'slice first element should be 1');

// --- Math methods ---
const ceiled: number = Math.ceil(1.2);
assert(ceiled === 2, 'ceil failed');

const rounded: number = Math.round(1.5);
assert(rounded === 2, 'round failed');

const abs: number = Math.abs(-5);
assert(abs === 5, 'abs failed');

const sq: number = Math.sqrt(9);
assert(sq === 3, 'sqrt failed');

const pw: number = Math.pow(2, 10);
assert(pw === 1024, 'pow failed');

const mn: number = Math.min(3, 7);
assert(mn === 3, 'min failed');

const mx: number = Math.max(3, 7);
assert(mx === 7, 'max failed');

// --- parseInt ---
const numStr: string = '42';
const parsed: number = parseInt(numStr);
assert(parsed === 42, 'parseInt failed');

console.log('All standard method tests passed!');
