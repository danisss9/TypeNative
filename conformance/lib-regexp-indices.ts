// The d flag: hasIndices and each group's [start, end] in .indices
const re = /(\w+)@(\w+)(x)?/d;
assert(re.hasIndices && re.flags.includes('d') && !/a/.hasIndices, 'hasIndices');
const m = re.exec('mail: ann@site now')!;
console.log(m.index, m.indices);
assert(m.index === 6, 'index');
const ind = m.indices!;
assert(ind.length === 4, 'one entry per group');
assert(ind[0][0] === 6 && ind[0][1] === 14, 'whole match span');
assert(ind[1][0] === 6 && ind[1][1] === 9, 'first group span');
assert(ind[2][0] === 10 && ind[2][1] === 14, 'second group span');
assert(ind[3] === undefined, 'a group that did not take part has no span');

// (code point offsets, past a multi-byte character)
const accented = /é(b)/d.exec('aéb')!;
assert(accented.indices![1][0] === 2 && accented.indices![1][1] === 3, 'spans count characters');

// with /g, every exec carries its own spans
const all = /o/dg;
const s = 'foo boo';
const starts: number[] = [];
let hit: RegExpExecArray | null;
while ((hit = all.exec(s)) !== null) starts.push(hit.indices![0][0]);
assert(starts.join(',') === '1,2,5,6', 'indices with /g');

assert(/x/.exec('x')!.indices === undefined, 'no indices without d');
