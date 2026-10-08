const a = [3, 1, 2].sort((x, y) => x - y);
assert(a.join() === '1,2,3', 'sort');
