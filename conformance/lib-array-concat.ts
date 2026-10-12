const a = [1, 2].concat([3], [4, 5]);
assert(a.length === 5 && a[4] === 5, 'concat');
