// A bigint and a number compare by value: JS == mixes the types, === does not,
// and the relational operators compare the values exactly (static bigint ==
// number is a TS2367 type error, so these go through any-typed values)
const b: any = 5n;
const n: any = 5;
assert(b == n, `5n == 5, got ${b == n}`);
assert(b == 5, `5n == 5 against a number literal, got ${b == 5}`);
assert(n == b, `5 == 5n the other way, got ${n == b}`);
assert(!(b === n), `5n !== 5 (different types), got ${b === n}`);
assert(b != 6, '5n != 6');
const values: any[] = [5n, 5, '5'];
let equal = 0;
for (const x of values) for (const y of values) if (x == y) equal++;
assert(equal === 9, `all three loosely equal: ${equal}`);
assert(b == '5', `5n == '5' (an integer string), got ${b == '5'}`);
const t: any = true;
assert(b == t === false, `5n == true is false, got ${b == t}`);
const f: any = false;
assert(f == 0n, `false == 0n, got ${f == 0n}`);
// the relational operators compare the values exactly
const cmp: any = 6n;
assert(cmp > 5, `6n > 5, got ${cmp > 5}`);
assert(5 < cmp, `5 < 6n, got ${5 < cmp}`);
assert(cmp >= 6 && cmp <= 6, '6n <= 6 and 6n >= 6');
assert(!(cmp > 6) && !(cmp < 6), 'neither 6n > 6 nor 6n < 6');
assert(cmp > 5.5, `6n > 5.5 compares exactly, got ${cmp > 5.5}`);
const half: any = 5n;
assert(half < 5.5, `5n < 5.5, got ${half < 5.5}`);
assert(cmp < 7 && cmp <= 6.5, '6n < 7 and 6n <= 6.5');
assert(cmp < Infinity && cmp > -Infinity, '6n < Infinity and 6n > -Infinity');
const nan: any = NaN;
assert(!(nan == 5n) && !(nan < 5n) && !(nan > 5n) && !(nan >= 5n), 'every NaN comparison is false');
console.log('semantics-bigint-loose-ops ok');
