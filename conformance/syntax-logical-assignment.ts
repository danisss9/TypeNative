let a: number | null = null;
a ??= 1;
let b = 0;
b ||= 2;
let c = 1;
c &&= 3;
assert(a === 1 && b === 2 && c === 3, 'logical assignment');
