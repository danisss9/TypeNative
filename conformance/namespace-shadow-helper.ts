// Exports for syntax-import-local-shadowing
export class ReadVar {
  constructor(public name: string) {}
  set(v: string): string {
    return this.name + '=' + v;
  }
}
export function variable(name: string): ReadVar {
  return new ReadVar(name);
}
