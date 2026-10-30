// String positions on non-ASCII text agree everywhere: length, indexing,
// indexOf / slice / substring, regex match indices and lastIndex all count
// the same units (BMP characters: one each, as in JS)
const s = 'héllo wörld — ñ';
assert(s.length === 15, 'length');
assert(s[1] === 'é' && s.charAt(7) === 'ö' && s.at(-1) === 'ñ', 'indexing');
assert(s.indexOf('w') === 6 && s.lastIndexOf('l') === 9 && s.indexOf('—') === 12, 'indexOf');
assert(s.slice(1, 5) === 'éllo' && s.substring(6, 11) === 'wörld' && s.slice(-1) === 'ñ', 'slice');
assert(s.charCodeAt(1) === 0xe9 && s.codePointAt(12) === 0x2014, 'char codes');
const m = /w\S+/.exec(s);
assert(m !== null && m.index === 6 && m[0] === 'wörld', 'match index');
const re = /[öñ]/g;
const found: number[] = [];
while (re.exec(s) !== null) found.push(re.lastIndex);
assert(found.join() === '8,15', 'lastIndex');
assert(s.split('').length === 15 && [...s].length === 15, 'splitting');
assert(s.padEnd(17, '·').length === 17 && 'ñ'.repeat(3).length === 3, 'padding');
let count = 0;
for (let i = 0; i < s.length; i++) if (s[i] === 'l') count++;
assert(count === 3, 'loop over positions');
console.log(s.length, s.indexOf('—'), m && m.index, found.join());
