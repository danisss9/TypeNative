// Module constants read by static class fields, for semantics-module-const-static-init
const CORE = '@angular/core';
const LEVEL = 3;
export interface Ref {
  name: string | null;
  moduleName: string | null;
}
export class Identifiers {
  static core: Ref = { name: null, moduleName: CORE };
  static text: Ref = { name: 'ɵɵtext', moduleName: CORE };
  static level = LEVEL * 2;
}
