// Class fields and object entries keyed by a module-level Symbol constant:
// the symbol's identity is only observable through property access, so the
// key lowers to a named field/property
const Trait = Symbol('Trait');
const Other = Symbol();

class Marked {
  [Trait] = true;
  name = 'marked';
}

const m = new Marked();
assert(m[Trait] === true, 'class field keyed by a Symbol const');
assert(m.name === 'marked', 'sibling fields untouched');

function hasTrait(value: unknown): boolean {
  return (value as any)[Trait] === true;
}
assert(hasTrait(m), 'element-access read of a Symbol key');
assert(!hasTrait({}), 'a plain object lacks the Symbol field');

const bag = { [Trait]: true, size: 2 };
assert((bag as any)[Trait] === true && bag.size === 2, 'object literal with a Symbol key');

const tag = Symbol('tag');
const holder: any = {};
holder[tag] = 'x';
assert(holder[tag] === 'x', 'element-access write of a Symbol key');
