// Temporary probe: Babel's getBindingIdentifiers idiom on an Object.create(null)
// table (a dynamic object): the array a key's value is must be shared with the
// table, so a push through the binding lands in it.
type Id = { name: string };
const ids = Object.create(null);
const id: Id = { name: 'g' };
const list = (ids[id.name] = ids[id.name] || []);
list.push(id);
assert(ids['g'] !== undefined, 'the table has the name');
assert(ids['g'].length === 1, `the pushed id is in the table (${ids['g'].length})`);
assert(ids['g'][0] === id, 'the element is the id');

// (a second name)
const other: Id = { name: 'h' };
const list2 = (ids[other.name] = ids[other.name] || []);
list2.push(other);
list2.push(id);
assert(ids['h'].length === 2, `the second array grew (${ids['h'].length})`);
assert(ids['g'].length === 1, 'the first array did not');

// (a read of an absent key: undefined, so the || [] branch makes a fresh array)
const missing = (ids['zz'] = ids['zz'] || []);
missing.push(id);
assert(ids['zz'].length === 1, 'an absent key starts empty');
console.log('ok');
