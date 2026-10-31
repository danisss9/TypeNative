// Plain objects list integer-like keys first, ascending, then the other keys
// in insertion order (Maps keep plain insertion order)
const o: Record<string, number> = {};
o.b = 1;
o['10'] = 2;
o.a = 3;
o['2'] = 4;
assert(Object.keys(o).join(',') === '2,10,b,a', 'integer keys first');
assert(JSON.stringify(o) === '{"2":4,"10":2,"b":1,"a":3}', 'JSON order');
const parsed = JSON.parse('{"z":1,"5":2,"y":3,"1":4}');
assert(Object.keys(parsed).join(',') === '1,5,z,y', 'parsed object order');
const m = new Map<string, number>([['b', 1], ['10', 2], ['2', 3]]);
assert([...m.keys()].join(',') === 'b,10,2', 'Map keeps insertion order');
console.log(Object.keys(o), Object.keys(parsed));
