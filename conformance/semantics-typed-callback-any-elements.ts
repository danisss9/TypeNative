// forEach over any elements with a typed function value: arguments converted
class Attr { constructor(public name: string, public value: string) {} }
class El { attrs: Attr[] = [new Attr('a', '1')]; }
class Comp { attrs: Attr[] = [new Attr('c', '3'), new Attr('d', '4')]; }
const attrs: { [k: string]: string } = {};
const visitAttribute = (attr: Attr) => { attrs[attr.name] = attr.value; };
function visit(node: El | Comp) { node.attrs.forEach(visitAttribute); }
visit(new El()); visit(new Comp());
console.log(JSON.stringify(attrs));
assert(JSON.stringify(attrs) === '{"a":"1","c":"3","d":"4"}', 'typed callback');
