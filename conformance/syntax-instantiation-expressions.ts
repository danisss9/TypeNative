// Instantiation expressions (f<T> without a call) and explicit type
// arguments on calls and constructors
function wrap<T>(value: T): { value: T } {
  return { value };
}
const wrapNumber = wrap<number>;
const w = wrapNumber(3);
assert(w.value === 3, 'instantiation expression');
const ws = wrap<string>('s');
assert(ws.value === 's', 'explicit type argument');
const m = new Map<string, number[]>();
m.set('a', [1]);
assert(m.get('a')?.length === 1, 'constructor type arguments');
console.log(w.value, ws.value);
