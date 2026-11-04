// A callback parameter shadowing an outer name keeps its type to the callback
class Expr { constructor(public v: number) {} }
class DefMap {
  values: { key: string; value: Expr }[] = [];
  set(key: string, value: Expr | null): void {
    if (value) {
      const existing = this.values.find((value) => value.key === key);
      if (existing) existing.value = value; else this.values.push({ key, value });
    }
  }
}
const m = new DefMap();
const none: Expr | null = null;
m.set('a', new Expr(1)); m.set('b', none); m.set('a', new Expr(2));
console.log(m.values.map((v) => v.key + v.value.v).join(','));
assert(m.values.map((v) => v.key + v.value.v).join(',') === 'a2', 'shadowed parameter');
