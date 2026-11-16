// x?.m() on an any value gives undefined when x is nullish — the zero value
// would break `?? fallback` and `=== undefined`
const s: any = null;
assert(s?.toUpperCase() === undefined, `null?.toUpperCase() is undefined, got '${s?.toUpperCase()}'`);
assert((s?.toUpperCase() ?? 'fb') === 'fb', '?? sees the nullish receiver');
const u: any = undefined;
assert(u?.toFixed(2) === undefined, 'undefined?.toFixed() is undefined');
const real: any = 'hi';
assert(real?.toUpperCase() === 'HI', 'a set receiver calls through');
const n: any = null;
assert(n?.length === undefined, `null?.length is undefined, got ${n?.length}`);
const obj: any = { greeting: 'yo' };
assert(obj?.greeting === 'yo', 'a property read on a set any');
const absent: any = {};
assert(absent?.greeting === undefined, 'a missing property is undefined');
console.log('semantics-optional-any-call ok');
