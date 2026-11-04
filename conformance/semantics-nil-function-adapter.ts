// An unset function value passed where another function type is expected
// stays unset (`if (fn)` is false), a set one is adapted and called
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Expr {
  constructor(public name: string) {}
}
class Call extends Expr {
  constructor(public callee: Expr) {
    super(`call(${callee.name})`);
  }
}

function finish(variable: Expr, transformFn?: (raw: Expr) => Expr): string[] {
  const out = [variable.name];
  if (transformFn) out.push(transformFn(variable).name);
  return out;
}

function build(post: boolean): string[] {
  let transformFn: ((expr: Expr) => Call) | undefined = undefined;
  if (post) transformFn = (expr: Expr) => new Call(expr);
  return finish(new Expr('msg'), transformFn);
}

assert(build(false).join(',') === 'msg', `no transform: ${build(false).join(',')}`);
assert(build(true).join(',') === 'msg,call(msg)', `transform: ${build(true).join(',')}`);
console.log('ok');
