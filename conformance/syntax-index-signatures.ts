interface Scores { [name: string]: number }
const s: Scores = { a: 1 };
s['b'] = 2;
assert(s['a'] + s['b'] === 3, 'index signature');
const counts: { [word: string]: number } = {};
for (const w of ['x', 'y', 'x']) counts[w] = (counts[w] ?? 0) + 1;
assert(counts['x'] === 2 && Object.keys(counts).length === 2, 'inline index signature');
