// for-of with nested destructuring patterns: [k, { a, b }] over a Map, [k, [first]] over pairs
class Handle { constructor(public slot: number) {} }
const vars = new Map<number, { variable: { kind: number; name: string | null }; handle: Handle }>();
vars.set(1, { variable: { kind: 3, name: 'a' }, handle: new Handle(10) });
vars.set(2, { variable: { kind: 4, name: null }, handle: new Handle(20) });
const out: string[] = [];
for (const [xref, { variable, handle }] of vars) out.push(`${xref}:${variable.kind}:${variable.name ?? '-'}:${handle.slot}`);
const pairs: [string, number[]][] = [['p', [1, 2]], ['q', [3]]];
for (const [name, [first]] of pairs) out.push(name + first);
console.log(out.join(','));
assert(out.join(',') === '1:3:a:10,2:4:-:20,p1,q3', 'nested patterns');
