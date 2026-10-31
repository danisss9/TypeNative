// A call of a user-defined type guard (`(t): t is string`, declared or a
// local arrow) narrows an optional argument where it is true
function isSet(v: string | undefined): v is string {
  return v !== undefined;
}
function pick(a: string | undefined, b: string | undefined): string {
  const usable = (t: string | undefined): t is string => !!t && t.startsWith('*');
  if (usable(a) && a.endsWith('!')) return a.toUpperCase();
  if (isSet(b) && b.length > 1) return b.slice(1);
  return 'none';
}
assert(pick('*x!', undefined) === '*X!', 'local arrow guard');
assert(pick('x', 'abc') === 'bc', 'declared guard');
assert(pick(undefined, undefined) === 'none', 'neither');
console.log(pick('*x!', undefined), pick('x', 'abc'));
