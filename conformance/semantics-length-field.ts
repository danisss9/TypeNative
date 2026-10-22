// An object's own `length` field is a field, not an array length
function measure(): { name: string; length: number } | undefined { return { name: 'a', length: 3 }; }
const r = measure();
assert(r !== undefined && r.length === 3, 'nullable object');
const o = { length: 4 };
assert(o.length === 4, 'object literal');
interface Segment { start: number; length: number }
const seg: Segment = { start: 1, length: 5 };
assert(seg.length === 5 && [1, 2].length === 2 && 'abc'.length === 3, 'interface field, arrays, strings');
