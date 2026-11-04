// A destructured parameter reads a class's getters
class Attrs {
  private items = ['a', 'b'];
  plain = 3;
  get attributes(): ReadonlyArray<string> { return this.items; }
  get count(): number { return this.items.length; }
}
function serialize({ attributes, count, plain }: Attrs): string { return attributes.join('|') + ':' + count + ':' + plain; }
console.log(serialize(new Attrs()));
assert(serialize(new Attrs()) === 'a|b:2:3', 'getters destructured');
