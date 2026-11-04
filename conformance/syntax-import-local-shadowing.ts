// A local named as an imported binding's target (`variable` beside
// o.variable(…), or an import renamed from `variable`)
import * as o from './namespace-shadow-helper';
import { variable as v } from './namespace-shadow-helper';
function emit(variable: o.ReadVar, closure: string): string[] {
  const g = o.variable('goog');
  const { name } = variable;
  return [g.name, variable.set(closure), name, v('w').name];
}
const text = emit(new o.ReadVar('x'), 'c').join(',');
console.log(text);
assert(text === 'goog,x=c,x,w', 'both reachable');
