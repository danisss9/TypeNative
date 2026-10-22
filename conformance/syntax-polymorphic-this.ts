// Methods typed `this` return the receiver's own class (fluent builders)
class Builder {
  parts: string[] = [];
  add(p: string): this { this.parts.push(p); return this; }
  build(): string { return this.parts.join(' '); }
}
class LoudBuilder extends Builder {
  shout(): this { this.parts.push('!'); return this; }
}
assert(new Builder().add('a').add('b').build() === 'a b', 'chain');
assert(new LoudBuilder().add('hey').shout().add('you').build() === 'hey ! you', 'inherited `this` method returns the subclass');
const lb: LoudBuilder = new LoudBuilder().add('x');
assert(lb.shout().build() === 'x !', 'assignable to the subclass');
