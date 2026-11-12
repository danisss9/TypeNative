// conformance-flags: --no-typecheck
// x?.push(v) on an array held as any pushes onto it (the React Compiler's
// this.#dependencies.value?.push(dep) on a Stack's top array)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

class Holder {
  value: any;
  constructor(value: any) {
    this.value = value;
  }
}

const deps: any[] = [];
const top = new Holder(deps);
top.value?.push('a');
top.value?.push('b');
check('pushed through ?.', deps.length, 2);
const none = new Holder(undefined);
none.value?.push('x');
check('skipped when unset', none.value, undefined);
const boxed: any = {};
boxed.list = [];
boxed.list?.push(1);
check('expando array', boxed.list.length, 1);

// (through a getter that returns the array it holds — Stack's get value())
class Node<T> {
  #value: T | null;
  constructor(value: T | null) {
    this.#value = value;
  }
  push(value: T): Node<T> {
    return new Node(value);
  }
  get value(): T | null {
    return this.#value;
  }
}
class Collector {
  #dependencies: any = new Node<string[]>(null);
  constructor() {
    this.#dependencies = this.#dependencies.push([]);
  }
  add(dep: string): void {
    this.#dependencies.value?.push(dep);
  }
  get size(): number {
    return this.#dependencies.value.length;
  }
}
const collector = new Collector();
collector.add('key');
collector.add('items');
check('through getter', collector.size, 2);
console.log('ok');
