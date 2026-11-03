// x instanceof Object: anything but a primitive (or null), including a
// value reached through a class-typed option
class Holder { schema: unknown = undefined; }
function isObj(v: unknown): boolean { return v instanceof Object; }
const h = new Holder();
h.schema = { a: 1 };
assert(isObj({}) && isObj([1]) && isObj(h) && isObj(h.schema), 'objects');
assert(!isObj(1) && !isObj('s') && !isObj(null) && !isObj(undefined), 'primitives');
