// Spreading a value of a named interface type (one that extends another) into
// a new object literal copies all its declared fields (zod's normalizeDef:
// { ...def, keys, numKeys })
interface BaseDef {
  type: string;
  checks?: string[];
}

interface ObjectDef extends BaseDef {
  type: 'object';
  shape: Record<string, number>;
  catchall?: string | undefined;
}

function normalize(def: ObjectDef) {
  const keys = Object.keys(def.shape);
  return {
    ...def,
    keys,
    numKeys: keys.length,
  };
}

const def: ObjectDef = { type: 'object', shape: { a: 1, b: 2 }, checks: ['x'] };
const n = normalize(def);
console.log(n.type, n.keys.join(','), n.numKeys);
console.log(n.shape.a + n.shape.b, n.checks?.length, n.catchall === undefined);
// the spread shares the field values (the same shape object)
console.log(n.shape === def.shape);
