// conformance-flags: --no-typecheck
// A Map's / Set's constructor isn't Object's: zod's isPlainObject tells them
// apart from plain objects by it, so shallowClone keeps a Map a Map
function isObject(data: any): boolean {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function isPlainObject(o: any): boolean {
  if (isObject(o) === false) return false;
  const ctor = o.constructor;
  if (ctor === undefined) return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false) return false;
  if (Object.prototype.hasOwnProperty.call(prot, 'isPrototypeOf') === false) return false;
  return true;
}

function shallowClone(o: any): any {
  if (isPlainObject(o)) return { ...o };
  if (Array.isArray(o)) return [...o];
  return o;
}

const m = new Map<string, number>([['a', 1]]);
const s = new Set<number>([1, 2]);
console.log(isPlainObject(m), isPlainObject(s), isPlainObject([1]), isPlainObject('x'));
const mc = shallowClone(m);
console.log(mc instanceof Map, mc.get('a'), mc === m);
const sc = shallowClone(s);
console.log(sc instanceof Set, sc.size);
console.log(m.constructor === Map, s.constructor === Set);
