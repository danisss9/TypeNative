// A for-in key is a string, whatever another variable of its name holds
class Prop { constructor(public name: string) {} }
function first(props: Prop[]): string { for (const prop of props) return prop.name; return ''; }
function check(bindings: { properties: { [key: string]: string } }): string[] {
  const out: string[] = [];
  for (const prop in bindings.properties) {
    const isAttr = prop.startsWith('attr.');
    const boundName = isAttr ? prop.slice(5) : prop;
    if (boundName.toLowerCase().startsWith('on')) out.push(boundName);
  }
  return out;
}
const result = [first([new Prop('p')]), check({ properties: { 'attr.onclick': 'x', title: 'y', onKey: 'z' } }).join(',')].join(" ");
console.log(result);
assert(result === "p onclick,onKey", "for-in keys");
