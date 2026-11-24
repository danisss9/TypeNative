// Symbol-keyed class members: a getter, a method, a field, and a static
// member, with keys declared as Symbol.for(...) and `unique symbol`.
const tag = Symbol.for('tn.test.tag');
const call = Symbol('tn.test.call');
const field = Symbol('tn.test.field');
const shared: unique symbol = Symbol('tn.test.shared');

class Base {
  get [tag](): string {
    return 'base';
  }
  [call](): string {
    return 'base-call';
  }
  [field]: number = 1;
  static [shared] = 'static';

  read(): string {
    return `${this[tag]}/${this[call]()}`;
  }
}

class Child extends Base {
  override get [tag](): string {
    return 'child';
  }
  override [call](): string {
    return 'child-call';
  }
  override [field]: number = 2;
}

const c = new Child();
if (c.read() !== 'child/child-call') throw new Error(`getter/method: ${c.read()}`);
if (c[field] !== 2) throw new Error(`field: ${c[field]}`);
if (c[tag] !== 'child') throw new Error(`tag: ${c[tag]}`);
if (Base[shared] !== 'static') throw new Error(`static: ${Base[shared]}`);
console.log('symbol keys ok');
