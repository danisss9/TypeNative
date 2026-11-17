// Arrow-function fields: they run in the constructor, `this` is the instance,
// and an initializer sees the fields declared before it
class Counter {
  count = 1;
  label = `count=${this.count}`;
  increment = () => {
    this.count += 1;
    return this.count;
  };
  read = () => this.label;
  constructor(start: number) {
    this.count = start;
  }
}
const c = new Counter(10);
assert(c.read() === 'count=1', 'a field initializer reads earlier fields');
assert(c.increment() === 11 && c.count === 11, 'an arrow field mutates `this`');
const inc = c.increment;
assert(inc() === 12, 'the arrow keeps its instance when called on its own');
