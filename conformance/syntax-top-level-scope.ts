// Top-level variables, ?? chains, nullable ternaries, optional chains, Set spread,
// dictionaries, struct-valued maps, typed for...of, and assorted builtins

// Functions see top-level variables of the main file
const registry = new Set<string>();
let counter = 0;
function register(name: string): number {
  registry.add(name);
  counter++;
  return counter;
}
register('b');
register('a');
assert(counter === 2 && registry.size === 2, 'top-level variables from functions failed');

// Spreading a Set yields its elements
const names = [...registry];
assert(names.length === 2 && names.includes('a'), `Set spread failed: ${names.join(',')}`);

// ?? chains over map lookups: missing keys fall through
const primary = new Map<string, string>();
const secondary = new Map<string, string>();
primary.set('x', 'from-primary');
secondary.set('y', 'from-secondary');
function lookup(key: string): string {
  return primary.get(key) ?? secondary.get(key) ?? 'default';
}
assert(lookup('x') === 'from-primary', 'first lookup failed');
assert(lookup('y') === 'from-secondary', 'second lookup failed');
assert(lookup('z') === 'default', 'fallback failed');

// Ternary with an undefined branch is nullable
function maybeUpper(value: string, enabled: boolean): string | undefined {
  return enabled ? value.toUpperCase() : undefined;
}
assert(maybeUpper('a', true) === 'A', 'nullable ternary (value) failed');
assert(maybeUpper('a', false) === undefined, 'nullable ternary (undefined) failed');

// Optional chains short-circuit across later calls; x! dereferences
function suffixOf(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}
assert(suffixOf('  HI ') === 'hi', 'optional chain continuation failed');
assert(suffixOf(undefined) === undefined, 'optional chain on undefined failed');
const known: string | undefined = 'abc';
assert(known!.length === 3, 'non-null assertion failed');

// Dictionary-style object literal (indexed with a variable key)
const symbols = { plus: '+', minus: '-' };
function symbolFor(op: string): string {
  return symbols[op] ?? '?';
}
assert(symbolFor('plus') === '+' && symbolFor('times') === '?', 'dictionary literal failed');

// Struct-valued Map.get is undefined when missing
interface Point {
  x: number;
  y: number;
}
const points = new Map<string, Point>();
points.set('origin', { x: 0, y: 0 });
function describe(key: string): string {
  const point = points.get(key);
  if (!point) return 'missing';
  return `${point.x},${point.y}`;
}
assert(describe('origin') === '0,0' && describe('nowhere') === 'missing', 'struct Map.get failed');

// for...of over strings and tuple arrays
let letters = '';
for (const ch of 'abc') letters = ch + letters;
assert(letters === 'cba', `string for...of failed: ${letters}`);
const pairs: string[][] = [['a', '1'], ['b', '2']];
let joined = '';
for (const [key, value] of pairs) joined += key + value;
assert(joined === 'a1b2', `tuple for...of failed: ${joined}`);

// Builtins: filter(Boolean), Array.isArray, String.match, length truncation
const parts = ['a', '', 'b'].filter(Boolean);
assert(parts.length === 2, 'filter(Boolean) failed');
assert(Array.isArray(parts), 'Array.isArray failed');
const match = 'key=value'.match(/(\w+)=(\w+)/);
assert(match !== null && match[2] === 'value', 'String.match failed');
const stack = [1, 2, 3];
stack.length = 0;
assert(stack.length === 0, 'length truncation failed');
