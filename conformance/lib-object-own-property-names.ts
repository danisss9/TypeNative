// Object.getOwnPropertyNames on typed records, with a local named keys
interface Meta { inputs: { [field: string]: { name: string } }; }
function keysOf(inputs: Meta['inputs']): string[] { return Object.getOwnPropertyNames(inputs); }
const m: Meta = { inputs: { a: { name: 'x' }, b: { name: 'y' } } };
assert(keysOf(m.inputs).join() === 'a,b', 'names');
class K { x = 1; y = 2; }
assert(Object.getOwnPropertyNames(new K()).join() === 'x,y', 'class names');
assert(Object.getOwnPropertyNames({ p: 1 }).join() === 'p', 'literal names');
function names(inputs: { [k: string]: number }): number {
  const keys = Object.getOwnPropertyNames(inputs);
  if (keys.length === 0) return -1;
  return keys.length;
}
assert(names({ a: 1, b: 2 }) === 2 && names({}) === -1, 'a local named keys');
