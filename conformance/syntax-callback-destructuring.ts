// Destructured callback parameters ([k, v]) / ({ a }), Map spreads and
// entries(), record spreads, and + on two dynamic values
const scores = new Map<string, number>([['ada', 3], ['bob', 5]]);
const pairs: [string, number][] = [['x', 1], ['y', 2]];
const record: Record<string, number> = { a: 1, b: 2 };

assert(pairs.map(([name, n]) => name + n).join(',') === 'x1,y2', 'tuple callbacks');
assert([...scores].map(([name, n]) => `${name}:${n}`).join(' ') === 'ada:3 bob:5', 'Map spread pairs');
assert([...scores.entries()].filter(([, n]) => n > 4).length === 1, 'entries() with an elided element');
assert(Object.entries(record).map(([k, v]) => k + '=' + v).join('&') === 'a=1&b=2', 'Object.entries callbacks');

const people = [{ name: 'ada', age: 36 }, { name: 'bob', age: 25 }];
assert(people.filter(({ age }) => age > 30).map(({ name }) => name).join() === 'ada', 'object patterns');
assert(people.some(({ name, age }) => name === 'bob' && age === 25), 'two fields');

const untyped = new Map([['k', 1]]);
assert([...untyped].map(([k, v]) => k + v).join() === 'k1', 'an untyped Map: + decides at run time');

const merged = { ...record, c: 3, a: 10 };
assert(Object.keys(merged).join() === 'a,b,c' && merged.a === 10, 'a record spread keeps key order');
const env = { ...process.env, TN_PROBE_EXTRA: 'yes' };
assert(env.TN_PROBE_EXTRA === 'yes' && 'PATH' in env, 'spreading process.env');

const one: any = 1;
const two: any = 2;
const text: any = 'x';
assert(one + two === 3 && one + text === '1x' && text + two === 'x2', 'dynamic +');
console.log('callback destructuring ok');
