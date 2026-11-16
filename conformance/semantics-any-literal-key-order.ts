// An any-typed object literal keeps its keys in insertion order (a Go map's
// keys come out sorted; JS's Object.keys keeps the source order)
const o: any = { b: 1, a: 2 };
assert(Object.keys(o).join(',') === 'b,a', `keys keep insertion order: ${Object.keys(o).join(',')}`);
const order: string[] = [];
for (const k in o) order.push(k);
assert(order.join(',') === 'b,a', `for-in keeps insertion order: ${order.join(',')}`);
const entries = Object.entries(o);
assert(entries.map((e) => e[0]).join(',') === 'b,a', `entries too: ${entries.map((e) => e[0]).join(',')}`);
const spread: any = { ...o, c: 3 };
assert(Object.keys(spread).join(',') === 'b,a,c', `spread keeps order: ${Object.keys(spread).join(',')}`);
const empty: any = {};
empty.z = 1;
empty.y = 2;
assert(Object.keys(empty).join(',') === 'z,y', `a grown object keeps order: ${Object.keys(empty).join(',')}`);
assert(JSON.stringify(o) === '{"b":1,"a":2}', `stringify keeps order: ${JSON.stringify(o)}`);
console.log('semantics-any-literal-key-order ok');
