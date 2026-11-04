// Static class fields of a module read its literal constants
import { Identifiers } from './static-init-helper';
const text = [Identifiers.core.moduleName, Identifiers.text.name, Identifiers.level].join(' ');
console.log(text);
assert(text === '@angular/core ɵɵtext 6', 'static fields see module constants');
