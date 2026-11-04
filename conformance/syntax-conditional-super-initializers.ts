// conformance-flags: --no-typecheck
// Conditional super(...) in a class WITH initialized properties: TypeScript
// rejects this shape (TS2401) but compiled JS allows it — field initializers
// run at each super() call, so every branch sees them fresh
class Shape {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Greeting extends Shape {
  loud = this.name.toUpperCase();
  tag: string;
  constructor(name: string, shout: boolean) {
    if (shout) {
      super(name);
      this.tag = 'loud';
    } else {
      super(name.toLowerCase());
      this.tag = 'quiet';
    }
  }
}

const loud = new Greeting('hey', true);
assert(loud.name === 'hey' && loud.loud === 'HEY' && loud.tag === 'loud', 'initializers after branch super');
const quiet = new Greeting('Hey', false);
assert(quiet.name === 'hey' && quiet.loud === 'HEY' && quiet.tag === 'quiet', 'initializers after else-branch super');

// parameter properties also initialize at each super site
class Wrapper extends Shape {
  constructor(name: string, public size: number) {
    if (size > 5) {
      super(name);
    } else {
      super(`${name}-small`);
    }
  }
}
assert(new Wrapper('box', 9).size === 9 && new Wrapper('box', 9).name === 'box', 'parameter property after branch super');
assert(new Wrapper('box', 2).name === 'box-small', 'parameter property after else-branch super');

// a private identifier field follows the same rule
class Counted extends Shape {
  #count = 1;
  total: number;
  constructor(name: string, add: boolean) {
    if (add) {
      super(name);
      this.total = this.#count + 1;
    } else {
      super(name.slice(0, 3));
      this.total = this.#count;
    }
  }
}
assert(new Counted('abcde', true).total === 2, 'private field initializers after branch super');
assert(new Counted('abcde', false).total === 1, 'private field initializers after else-branch super');
