const log: string[] = [];
function logged(target: (...args: any[]) => any, context: ClassMethodDecoratorContext): (...args: any[]) => any {
  const name = String(context.name);
  return function (this: any, ...args: any[]): any {
    log.push(name);
    return target.apply(this, args);
  };
}
class Calc {
  @logged
  add(a: number, b: number): number { return a + b; }
}
assert(new Calc().add(1, 2) === 3 && log.join() === 'add', 'decorators');
const trail: string[] = [];
function tag(label: string) {
  return function (target: (...args: any[]) => any, context: ClassMethodDecoratorContext): (...args: any[]) => any {
    return function (this: any, ...args: any[]): any {
      trail.push(label);
      return target.call(this, ...args);
    };
  };
}
const registry: string[] = [];
function register(target: any, context: ClassDecoratorContext): void {
  registry.push(String(context.name));
}
@register
class Account {
  balance = 10;
  @tag('outer')
  @tag('inner')
  deposit(n: number): number {
    this.balance += n;
    return this.balance;
  }
  @tag('static')
  static zero(): number { return 0; }
}
class Savings extends Account {}
const acct = new Savings();
assert(acct.deposit(5) === 15 && Account.zero() === 0, 'decorated methods keep this');
assert(trail.join() === 'outer,inner,static' && registry.join() === 'Account', 'decorator order / class decorators');
