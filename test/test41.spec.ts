// Records/objects used as dictionaries: map literals, indexing, Object.keys/values
const scores: Record<string, number> = { a: 1, b: 2, c: 3 };
assert(scores['b'] === 2, `index read failed: ${scores['b']}`);

scores['d'] = 4;
assert(scores['d'] === 4, `index assign failed: ${scores['d']}`);

let sum = 0;
for (const v of Object.values(scores)) sum += v;
assert(sum === 10, `Object.values sum failed: ${sum}`);

assert(Object.keys(scores).length === 4, 'Object.keys length failed');

// String-valued record
const labels: Record<string, string> = { en: 'Hello', pt: 'Ola' };
assert(labels['pt'] === 'Ola', `string record failed: ${labels['pt']}`);

let joined = '';
for (const val of Object.values(labels)) joined += val;
assert(joined.length === 8, `string values failed: ${joined}`);
