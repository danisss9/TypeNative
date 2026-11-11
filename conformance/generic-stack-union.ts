// An immutable stack built from two generic classes behind a union type (the
// React Compiler's Utils/Stack): an array pushed as a value is the same array
// when read back, and methods that share a name with Array's (find, push)
// dispatch to the classes
type Stack<T> = Node<T> | Empty<T>;

interface StackInterface<T> {
  push(value: T): StackInterface<T>;
  pop(): StackInterface<T>;
  find(fn: (value: T) => boolean): boolean;
  get value(): T | null;
}

class Node<T> implements StackInterface<T> {
  #value: T;
  #next: Stack<T>;

  constructor(value: T, next: Stack<T> = EMPTY as any) {
    this.#value = value;
    this.#next = next;
  }

  push(value: T): Node<T> {
    return new Node(value, this);
  }

  pop(): Stack<T> {
    return this.#next;
  }

  find(fn: (value: T) => boolean): boolean {
    return fn(this.#value) ? true : this.#next.find(fn);
  }

  get value(): T {
    return this.#value;
  }
}

class Empty<T> implements StackInterface<T> {
  push(value: T): Stack<T> {
    return new Node(value as T, this as Stack<T>);
  }
  pop(): Stack<T> {
    return this;
  }
  find(_fn: (value: T) => boolean): boolean {
    return false;
  }
  get value(): T | null {
    return null;
  }
}

const EMPTY: Stack<void> = new Empty();

function empty<T>(): Stack<T> {
  return EMPTY as any;
}

type Dep = { name: string };

class Collector {
  #deps: Stack<Array<Dep>> = empty();
  #scopes: Stack<string> = empty();

  enter(scope: string): void {
    this.#deps = this.#deps.push([]);
    this.#scopes = this.#scopes.push(scope);
  }

  visit(name: string): void {
    this.#deps.value!.push({ name });
  }

  isActive(scope: string): boolean {
    return this.#scopes.find((s) => s === scope);
  }

  exit(): Array<Dep> {
    const deps = this.#deps.value!;
    this.#deps = this.#deps.pop();
    this.#scopes = this.#scopes.pop();
    return deps;
  }
}

const c = new Collector();
c.enter('outer');
c.visit('a');
c.enter('inner');
c.visit('b');
c.visit('c');
console.log(c.isActive('outer'), c.isActive('inner'), c.isActive('none'));
const inner = c.exit();
console.log(inner.map((d) => d.name).join(','));
console.log(c.isActive('outer'), c.isActive('inner'));
const outer = c.exit();
console.log(outer.map((d) => d.name).join(','), outer.length);
