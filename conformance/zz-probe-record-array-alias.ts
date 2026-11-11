// Temporary probe: a record of arrays built with the aliasing idiom Babel's
// getBindingIdentifiers uses: const list = (ids[name] = ids[name] || []); list.push(id)
interface Id {
  name: string;
}
const ids: Record<string, Id[]> = {};
const id: Id = { name: 'g' };
const list = (ids[id.name] = ids[id.name] || []);
list.push(id);
assert(ids['g'] !== undefined, 'the record has the name');
assert(ids['g'].length === 1, `the pushed id is in the record (got ${ids['g'] && ids['g'].length})`);

const id2: Id = { name: 'g' };
const list2 = (ids[id2.name] = ids[id2.name] || []);
list2.push(id2);
assert(ids['g'].length === 2, 'a second push appends to the same array');
console.log('ok');
