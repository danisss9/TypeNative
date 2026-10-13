class Res {
  closed = false;
  [Symbol.dispose](): void { this.closed = true; }
}
const r = new Res();
{
  using x = r;
  assert(!x.closed, 'open inside block');
}
assert(r.closed, 'using disposes at block end');
const order: string[] = [];
class Named {
  constructor(public name: string) {}
  [Symbol.dispose](): void { order.push(this.name); }
}
function scope(): void {
  using a = new Named('a');
  using b = new Named('b');
  order.push('body');
}
scope();
assert(order.join() === 'body,b,a', 'reverse disposal at function end');
