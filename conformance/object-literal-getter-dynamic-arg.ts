// conformance-flags: --no-typecheck
// An object literal with a getter handed to a constructor value of no known
// signature keeps the getter live: each read runs it (zod's
// new ZodDefault({ type: 'default', get defaultValue() { … } }))
interface DefaultDef {
  type: string;
  defaultValue: unknown;
}

let made = 0;
const Ctor: any = function (this: any, def: any) {
  this.def = def;
};

function readDefault(def: DefaultDef): unknown {
  return def.defaultValue;
}

const inst = new Ctor({
  type: 'default',
  get defaultValue() {
    made++;
    return { n: made };
  },
});

console.log('made before', made);
const a: any = inst.def.defaultValue;
const b: any = inst.def.defaultValue;
console.log(a.n, b.n, a === b, made);
const c: any = readDefault(inst.def);
console.log(typeof c, c.n, made);
console.log(inst.def.type);
