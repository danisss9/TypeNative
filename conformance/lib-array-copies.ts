const a = [3, 1, 2];
const sorted = a.toSorted((x, y) => x - y);
const reversed = a.toReversed();
assert(sorted.join() === '1,2,3' && reversed.join() === '2,1,3' && a.join() === '3,1,2', 'copies');
