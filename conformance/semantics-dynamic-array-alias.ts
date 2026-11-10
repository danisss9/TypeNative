// An array stored into a dynamic object is shared: a push through any
// binding of the value mutates the object's entry (Babel builds maps with
// (ids[name] = ids[name] || []); ids[name].push(…) — Scope's binding tables
// live on this)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// (the map an Object.create(null) makes)
const ids: any = {};

function collect(name: string): any {
  const _ids = (ids[name] = ids[name] || []);
  _ids.push(name);
  return _ids;
}

const a = collect('C');
assert(ids['C'].length === 1, `push through the binding reached the object (${ids['C'].length})`);
assert(a.length === 1, 'the binding sees it too');

const b = collect('C');
assert(ids['C'].length === 2, 'the second push reached the same array');
assert(b === a || b.length === 2, 'both bindings see both entries');
assert(a[0] === 'C' && a[1] === 'C', 'the entries are the pushed values');

// (a direct push on the object's entry as well)
ids['D'] = [];
ids['D'].push('x');
assert(ids['D'].length === 1 && ids['D'][0] === 'x', 'direct push on the entry works');

// (reads of the entry behave as the array: length, index, iteration)
assert(ids['C'].length === 2, 'length reads through');
assert(ids['C'][0] === 'C', 'index reads through');
let seen = 0;
for (const _ of ids['C']) seen++;
assert(seen === 2, 'iteration reads through');

// (a plain assignment replaces the entry)
ids['C'] = [1, 2, 3];
assert(ids['C'].length === 3 && ids['C'][2] === 3, 'plain assignment stores the value');

// (an any binding of the new value: push reaches the entry again)
const c = ids['C'];
c.push(4);
assert(ids['C'].length === 4, 'push through an any binding of the entry reaches it');
console.log('ok');
