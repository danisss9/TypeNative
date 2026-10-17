import { test, describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

const order: string[] = [];

test('sync test', () => {
  assert.strictEqual(1 + 1, 2);
});

test('async test', async () => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  order.push('async');
});

test('callback test', (t, done) => {
  setTimeout(() => done(), 1);
});

test('skipped by option', { skip: 'not today' }, () => {
  assert.fail('a skipped test does not run');
});

test.todo('a todo test', () => {});

test('subtests', async (t) => {
  await t.test('child one', () => {
    order.push('child one');
  });
  await t.test('child two', (t) => {
    t.diagnostic('a diagnostic');
    order.push(`child two: ${t.name}`);
  });
});

test('skip from inside', (t) => {
  t.skip('skipped at runtime');
});

describe('a suite', () => {
  before(() => order.push('before'));
  beforeEach(() => order.push('beforeEach'));
  afterEach(() => order.push('afterEach'));
  after(() => order.push('after'));

  it('first', () => order.push('first'));
  it('second', () => order.push('second'));
  describe('nested', () => {
    it('deep', () => order.push('deep'));
  });
});

test('mock.fn records calls', () => {
  const double = mock.fn((n: number) => n * 2);
  assert.strictEqual(double(3), 6);
  assert.strictEqual(double(5), 10);
  assert.strictEqual(double.mock.callCount(), 2);
  assert.deepStrictEqual(double.mock.calls[1].arguments, [5]);
  assert.strictEqual(double.mock.calls[0].result, 6);
  double.mock.mockImplementation((n: number) => n * 3);
  assert.strictEqual(double(2), 6);
});

test('order of everything', () => {
  console.log(order.join(', '));
  assert.strictEqual(
    order.join(','),
    'async,child one,child two: child two,before,beforeEach,first,afterEach,beforeEach,second,afterEach,beforeEach,deep,afterEach,after'
  );
});
