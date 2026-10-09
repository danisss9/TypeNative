let r = '';
for (const ch of 'abc') r = ch + r;
assert(r === 'cba', 'for of string');
