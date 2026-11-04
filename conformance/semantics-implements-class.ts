// `implements SomeClass`: the class conforms to the interfaces SomeClass implements
const seen: string[] = [];
interface Visitor<R = any> { visitA(a: number): R; visitB(b: string): R; }
class RecursiveVisitor implements Visitor<void> {
  visitA(a: number): void { seen.push('rv a ' + a); }
  visitB(b: string): void { seen.push('rv b ' + b); }
}
class Base { visit(x: number): void {} }
class Combined extends Base implements RecursiveVisitor {
  visitA(a: number): void { seen.push('combined a ' + a); }
  visitB(b: string): void { seen.push('combined b ' + b); }
}
function run(v: Visitor) { v.visitA(1); v.visitB('x'); }
run(new RecursiveVisitor());
run(new Combined());
console.log(seen.join(', '));
assert(seen.join(',') === 'rv a 1,rv b x,combined a 1,combined b x', 'dispatch through the interface');
