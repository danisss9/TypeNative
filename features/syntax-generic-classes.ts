class Box<T> { constructor(public value: T) {} get(): T { return this.value; } }
assert(new Box<number>(3).get() === 3, 'generic class');
