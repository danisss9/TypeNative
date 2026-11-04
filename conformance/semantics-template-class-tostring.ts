// Template literals and String() of class instances use their toString();
// objects without one are "[object Object]"; a class passed as a
// constructor value works with instanceof
class Loc {
  constructor(public line: number, public col: number) {}
  toString(): string {
    return `${this.line}:${this.col}`;
  }
}
class Plain {
  x = 1;
}
class Err {
  constructor(public loc: Loc, public msg: string) {}
  toString(): string {
    return `${this.msg} at ${this.loc}`;
  }
}
class Node0 {}
class El extends Node0 {}
class Sub extends El {}
type Ctor = new (...args: any[]) => Node0;
function isA(n: Node0, type: Ctor): boolean {
  return n instanceof type;
}
const o = { a: 1 };
const text = [`${new Err(new Loc(2, 3), 'bad')}`, `${new Plain()}`, `${o}`, String(new Loc(1, 1))].join(' ');
const checks = [isA(new El(), El), isA(new Sub(), El), isA(new Node0(), El)].join(',');
console.log(text, checks);
assert(text === 'bad at 2:3 [object Object] [object Object] 1:1', 'string forms');
assert(checks === 'true,true,false', 'instanceof a constructor value');
