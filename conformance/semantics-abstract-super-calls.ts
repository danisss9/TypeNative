// super.m() into an abstract class's method that calls the class's other (and abstract) methods
abstract class Emitter {
  out: string[] = [];
  abstract visitParams(ps: string[]): void;
  printLeading(s: string): void { this.out.push('//' + s); }
  visitFn(name: string, ps: string[]): void {
    this.printLeading(name);
    this.out.push('function ' + name + '(');
    this.visitParams(ps);
    this.out.push(')');
  }
}
class JsEmitter extends Emitter {
  visitParams(ps: string[]): void { this.out.push(ps.join(',')); }
  override visitFn(name: string, ps: string[]): void { this.out.push('['); super.visitFn(name, ps); this.out.push(']'); }
}
class Jit extends JsEmitter {}
const e = new JsEmitter(); e.visitFn('f', ['a', 'b']);
const j = new Jit(); j.visitFn('g', []);
const text = e.out.join(' ') + ' | ' + j.out.join(' ');
console.log(text);
assert(text === '[ //f function f( a,b ) ] | [ //g function g(  ) ]', 'super into abstract');
