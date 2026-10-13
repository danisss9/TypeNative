const a = [1, 2, 3, 4, 5];
a.copyWithin(0, 3);
assert(a.join() === '4,5,3,4,5', 'copyWithin');
