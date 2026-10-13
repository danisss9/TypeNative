const o = Object.freeze({ a: 1 });
const s = Object.seal({ b: 2 });
assert(Object.isFrozen(o) && o.a === 1 && s.b === 2, 'freeze / seal');
