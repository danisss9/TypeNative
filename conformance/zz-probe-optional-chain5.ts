// Temporary probe: an optional chain ending in an array predicate call used
// as an if condition (this.options.extensions?.block?.some(...)).
class Ext {
  some(fn: (x: number) => boolean): boolean {
    return fn(1);
  }
}
class Options {
  extensions?: { block?: Ext; inline?: Ext };
}
class Lexer {
  options = new Options();
  constructor() {
    this.options.extensions = { block: new Ext() };
  }
  run(): number {
    if (this.options.extensions?.block?.some((x) => x > 0)) {
      return 1;
    }
    return 0;
  }
}

assert(new Lexer().run() === 1, 'deep chain call in an if');

class Empty {
  options = new Options();
  run(): number {
    if (this.options.extensions?.block?.some((x) => x > 0)) {
      return 1;
    }
    return 0;
  }
}
assert(new Empty().run() === 0, 'absent block is false');

console.log('ok');
