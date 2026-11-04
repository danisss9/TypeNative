// m?.set(…) / m?.has(…) / m?.size on a Map that may be absent
class V {
  constructor(private readonly originalNodeMap?: Map<object, object>) {}
  visit(a: object, b: object): number {
    this.originalNodeMap?.set(a, b);
    return this.originalNodeMap?.size ?? -1;
  }
}
function pick(n: number): Map<string, number> | undefined {
  return n > 0 ? new Map([['a', 1]]) : undefined;
}
const m = pick(1);
const none = pick(0);
const shared = new Map<object, object>();
const text = [new V().visit({}, {}), new V(shared).visit({}, {}), shared.size, m?.size, none?.size ?? -1, m?.has('a'), none?.has('a') ?? 'none'].join(' ');
console.log(text);
assert(text === '-1 1 1 1 -1 true none', 'optional map members');
