// Array references (*[]T) keep JS null: a missed exec / a null result does
// not become an empty array, so ?? falls through to its right operand
const missed = /x/.exec('abc') ?? /y/.exec('abc');
assert(missed === null, 'two misses are null');

const found = /b/.exec('abc') ?? /z/.exec('abc');
assert(found !== null && found[0] === 'b' && found.index === 1, 'the first match wins');

function maybe(flag: boolean): number[] | null {
  return flag ? [1, 2] : null;
}
const absent = maybe(false) ?? [3];
assert(absent.length === 1 && absent[0] === 3, 'a null result takes the fallback');
const present = maybe(true) ?? [3];
assert(present.length === 2 && present[1] === 2, 'an array result is kept');

const lengths = new Map<string, number[]>();
const fromMap = lengths.get('missing') ?? [7];
assert(fromMap.length === 1 && fromMap[0] === 7, 'a missing map value takes the fallback');

// (a matched empty group is [] and not null)
const empty = /()/.exec('') ?? /x/.exec('x');
assert(empty !== null && empty[0] === '', 'an empty match is not null');

// (an optional group of a missed match is undefined, not '')
const missedGroup = /(\w+)@/.exec('nope')?.[1];
assert(missedGroup === undefined, 'a missed match has no optional element');
const hitGroup = /(\w+)@/.exec('ann@site')?.[1];
assert(hitGroup === 'ann', 'a matched group is the optional element');
