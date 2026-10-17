const s = 'hello world';
assert(s.includes('wor') && s.startsWith('he') && s.endsWith('ld') && s.indexOf('o') === 4, 'string search');
assert(s.indexOf('o', 5) === 7 && s.indexOf('o', 99) === -1 && s.indexOf('h', -3) === 0, 'indexOf fromIndex');
