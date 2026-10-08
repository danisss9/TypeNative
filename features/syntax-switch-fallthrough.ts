let r = '';
const x: number = 1;
switch (x) { case 1: r += 'a'; case 2: r += 'b'; break; default: r += 'c'; }
assert(r === 'ab', 'fallthrough');
