const fns: (() => number)[] = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
assert(fns[0]() === 0 && fns[2]() === 2, 'per-iteration let');
