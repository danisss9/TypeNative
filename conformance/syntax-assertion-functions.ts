function assertString(v: unknown): asserts v is string { if (typeof v !== 'string') throw new Error('not a string'); }
const v: unknown = 'x';
assertString(v);
assert(v.length === 1, 'assertion function');
