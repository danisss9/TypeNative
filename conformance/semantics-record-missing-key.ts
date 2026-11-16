// A missing key of a Record or Map whose values are primitives reads
// undefined (the key's presence is the comparison; a stored value never is)
const rec: Record<string, number> = { a: 1 };
assert(rec['a'] === 1, 'a present key reads its value');
assert(rec['zz'] === undefined, `rec['zz'] is undefined, got ${rec['zz']}`);
assert(rec['zz'] == undefined, 'loose == too');
assert(!(rec['zz'] !== undefined), '!== undefined is false');
const key = 'nope';
assert(rec[key] === undefined, `rec[key] with a variable key, got ${rec[key]}`);
assert(rec.absent !== undefined === false, 'rec.absent !== undefined is false');
const strs: Record<string, string> = { k: 'v' };
assert(strs['nope'] === undefined, `missing string value, got '${strs['nope']}'`);
assert(strs['k'] === 'v', 'present string value');
const flags: Record<string, boolean> = {};
assert(flags['nope'] === undefined, `missing boolean value, got ${flags['nope']}`);
const m = new Map<string, number>();
m.set('k', 1);
assert(m.get('k') === 1, 'Map.get of a present key');
assert(m.get('nope') === undefined, `Map.get of a missing key, got ${m.get('nope')}`);
assert(rec.zzz != null === false, 'rec.zzz != null is false');
// `k in rec` and map.has stay the presence tests
assert(!('zz' in rec), "'zz' in rec");
assert(!m.has('nope'), 'map.has');
console.log('semantics-record-missing-key ok');
