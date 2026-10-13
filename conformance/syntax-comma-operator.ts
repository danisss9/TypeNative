let a = 0;
for (let i = 0, j = 10; i < j; i++, j--) a++;
assert(a === 5, 'comma in for');
