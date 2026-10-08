let s = 0;
for (const [i, v] of ['a', 'b'].entries()) s += i;
assert(s === 1, 'entries');
