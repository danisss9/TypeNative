// instanceof on Map / Set / Date / Array and subclasses; #x in obj
class P {}
class C extends P {}
class G extends C {}
const rec: Record<string, number> = { a: 1 };
const values: unknown[] = [new Map<string, number>(), new Set<number>(), new Date(0), [1, 2], 'str', new G(), rec];
const row = (v: unknown): string =>
  [v instanceof Map, v instanceof Set, v instanceof Date, v instanceof Array, v instanceof P, v instanceof C]
    .map((b) => (b ? '1' : '0'))
    .join('');
assert(values.map(row).join(' ') === '100000 010000 001000 000100 000000 000011 000000', values.map(row).join(' '));
assert(!(new P() instanceof C), 'a parent is not an instance of its subclass');
class A {
  #x = 1;
  static is(o: object): boolean { return #x in o; }
}
class B extends A {}
assert(A.is(new A()) && A.is(new B()) && !A.is({}), '#x in obj');
