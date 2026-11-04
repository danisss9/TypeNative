// ?. on a method of a struct-typed interface value gives a nullable result (!!a?.m())
interface Def { isVoid: boolean; closed(n: string): boolean; }
const defs: Record<string, Def> = { a: { isVoid: true, closed: (n) => n === 'x' } };
class P {
  private _def(n: string): Def | null { return defs[n] ?? null; }
  run(): number {
    const parent: string | null = 'a';
    const yes = parent !== null && !!this._def(parent)?.closed('x');
    const no = parent !== null && !!this._def(parent)?.closed('y');
    const none = !!this._def('zz')?.closed('x');
    return (yes ? 1 : 0) + (no ? 10 : 0) + (none ? 100 : 0);
  }
}
assert(new P().run() === 1, 'x');
