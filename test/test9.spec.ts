// Generics
function identity<T>(value: T): T {
  return value;
}

const str: string = identity<string>('hello');
assert(str === 'hello', 'identity string failed');

const num: number = identity<number>(42);
assert(num === 42, 'identity number failed');

class Box<T> {
  value: T;

  constructor(value: T) {
    this.value = value;
  }

  getValue(): T {
    return this.value;
  }
}

const strBox = new Box<string>('boxed');
assert(strBox.getValue() === 'boxed', 'Box string getValue failed');

const numBox = new Box<number>(100);
assert(numBox.getValue() === 100, 'Box number getValue failed');

function pair<A, B>(first: A, second: B): string {
  return 'pair';
}

const p: string = pair<number, string>(1, 'two');
assert(p === 'pair', 'pair function failed');
