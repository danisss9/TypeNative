class ParseFailure extends Error {
  constructor(message: string) {
    super(message);
    // the ES5-era workaround for subclassing Error: a no-op here
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
const e = new ParseFailure('bad token');
const Type = Function;
assert(e instanceof ParseFailure && e instanceof Error && e.message === 'bad token', 'Error subclass idiom');
assert((() => 1) instanceof Function && !(({}) instanceof Function) && Type !== null, 'Function as a value');
