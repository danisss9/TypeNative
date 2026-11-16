// arr?.length on an absent array is undefined — not 0 (a nil array is not a
// zero-length array, as JS sees it)
type Holder = { arr?: number[] };
const h2: Holder = { arr: [1, 2, 3] };
assert(h2.arr?.length === 3, 'a set array\'s length reads');
assert(h2.arr!.length === 3, 'the plain length too');
const h: Holder = {};
assert(h.arr === undefined, 'the absent array itself is undefined');
const len = h.arr?.length;
assert(len === undefined, `absent arr?.length is undefined, got ${len}`);
assert((h.arr?.length ?? -1) === -1, '?? sees the absent array');
assert(h.arr?.length === undefined, '=== undefined holds');
const grown: Holder = { arr: [] };
assert(grown.arr?.length === 0, 'a set but empty array is 0, not undefined');
console.log('semantics-optional-array-length ok');
