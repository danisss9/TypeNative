// Object.assign(Object.create(null), { … }) into a record type
class Def { isVoid: boolean; canSelfClose: boolean; constructor({ isVoid = false, canSelfClose = false }: { isVoid?: boolean; canSelfClose?: boolean } = {}) { this.isVoid = isVoid; this.canSelfClose = canSelfClose; } }
let DEFS: { [key: string]: Def } = null!;
let DEFAULT: Def;
function get(tag: string): Def {
  if (!DEFS) {
    DEFAULT = new Def({ canSelfClose: true });
    DEFS = Object.assign(Object.create(null), { 'input': new Def({ isVoid: true }), 'p': new Def() });
    ['div', 'input'].forEach((k) => { if (!DEFS[k]) DEFS[k] = new Def({ canSelfClose: false }); });
  }
  return DEFS[tag] ?? DEFS[tag.toLowerCase()] ?? DEFAULT;
}
const text = [get('input').isVoid, get('INPUT').isVoid, get('div').canSelfClose, get('x-foo').canSelfClose, Object.keys(DEFS).join(',')].join(' ');
console.log(text);
assert(text === 'true true false true input,p,div', 'record from Object.create(null)');
