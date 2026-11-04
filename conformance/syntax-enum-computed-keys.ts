// String enum members as computed object keys, and as keys read from a dynamic object
const enum Mod { NONE = 'none', PRE = 'prefetch' }
enum Mod2 { NONE = 'none2' }
const e = { [Mod.NONE]: 'plain', [Mod.PRE]: 'pre', [Mod2.NONE]: 'other' };
assert(e[Mod.PRE] === 'pre' && e['prefetch'] === 'pre' && e[Mod2.NONE] === 'other', 'literal keyed by enum members');
const m = new Map([[1, { [Mod.NONE]: 'a', [Mod.PRE]: 'b' }]]);
const e2 = m.get(1)!;
assert(e2[Mod.PRE] === 'b' && e2['none'] === 'a', 'dynamic object read with an enum key');
enum Kind { A, B }
assert(Kind[Kind.B] === 'B' && Kind[(m.size as number) - 1 + 0] === 'A', 'reverse mapping');
