// A Set or Map .size read as a reference — interpolated into a template
// string, passed as an argument, read through a field chain — is the
// element count, not undefined: size is a collection property, answered
// like TnGet answers it, not a missing data key on the underlying record
const s = new Set<number>([1, 2, 3]);
assert(`${s.size}` === '3', `interpolated Set size: ${s.size}`);

const holder: any = { preds: s };
assert(`${holder.preds.size}` === '3', `chained Set size: ${holder.preds.size}`);
assert(holder.preds.size === 3, 'chained Set size in a comparison');

const m = new Map<string, number>([['a', 1], ['b', 2]]);
const label = (count: number) => `${count} entries`;
assert(label(m.size) === '2 entries', `Map size as an argument: ${m.size}`);

const empty = new Set<number>();
assert(`${empty.size}` === '0', `empty Set size: ${empty.size}`);
assert(`${m.size}` === '2', `interpolated Map size: ${m.size}`);
console.log('ok');
