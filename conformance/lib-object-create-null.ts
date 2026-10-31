const dict = Object.create(null);
dict['a'] = 1;
dict.b = 2;
assert(dict['a'] === 1 && dict.b === 2 && Object.keys(dict).length === 2, 'Object.create(null)');
