// mock.method / mock.getter / mock.setter: object-literal methods and getters
// (closure fields), class methods, getters and setters (per-instance override
// slots), inherited methods, and namespace functions such as console.log.
// t.mock undoes its mocks after each test; fn.mock reads the call record.
import { test, mock } from 'node:test';
import assert from 'node:assert';

const calc = {
  base: 10,
  add(a: number, b: number): number {
    return a + b + this.base;
  },
  get double(): number {
    return this.base * 2;
  }
};

class Counter {
  n = 0;
  inc(by: number): number {
    this.n += by;
    return this.n;
  }
  get value(): number {
    return this.n;
  }
  set value(v: number) {
    this.n = v;
  }
}

class Sub extends Counter {}

test('object literal method', () => {
  const add = mock.method(calc, 'add');
  assert.strictEqual(calc.add(1, 2), 13);
  assert.strictEqual(add.mock.callCount(), 1);
  assert.deepStrictEqual(add.mock.calls[0].arguments, [1, 2]);
  assert.strictEqual((calc.add as any).mock.calls[0].result, 13);
  add.mock.mockImplementation(() => 0);
  assert.strictEqual(calc.add(1, 2), 0);
  add.mock.restore();
  assert.strictEqual(calc.add(1, 2), 13);
});

test('object literal getter', (t) => {
  t.mock.getter(calc, 'double', () => 99);
  assert.strictEqual(calc.double, 99);
});

test('getter restored after the test', () => {
  assert.strictEqual(calc.double, 20);
});

test('class method', (t) => {
  const c = new Counter();
  const inc = t.mock.method(c, 'inc', (by: number) => by * 100);
  assert.strictEqual(c.inc(2), 200);
  assert.strictEqual(c.n, 0);
  assert.strictEqual(inc.mock.callCount(), 1);
  assert.strictEqual((c.inc as any).mock.callCount(), 1);
  const other = new Counter();
  assert.strictEqual(other.inc(2), 2, 'other instances keep the method');
  inc.mock.restore();
  assert.strictEqual(c.inc(1), 1);
});

test('class getter and setter', (t) => {
  const c = new Counter();
  t.mock.getter(c, 'value', () => 7);
  assert.strictEqual(c.value, 7);
  const set = t.mock.setter(c, 'value');
  c.value = 5;
  assert.strictEqual(set.mock.callCount(), 1);
  assert.strictEqual(c.n, 5, 'the setter still runs');
});

test('inherited method', (t) => {
  const s = new Sub();
  t.mock.method(s, 'inc', () => -1);
  assert.strictEqual(s.inc(1), -1);
});

test('console.log and Math.random', (t) => {
  const log = t.mock.method(console, 'log', () => {});
  console.log('hidden', 1);
  assert.strictEqual(log.mock.callCount(), 1);
  assert.deepStrictEqual(log.mock.calls[0].arguments, ['hidden', 1]);
  assert.strictEqual((console.log as any).mock.callCount(), 1);
  t.mock.method(Math, 'random', () => 0.25);
  assert.strictEqual(Math.random(), 0.25);
});

test('restored after the test', () => {
  assert.notStrictEqual(Math.random(), 0.25);
  console.log('mock members ok');
});
