// Inherited methods without a return that implement an any-returning interface method
interface V { visitA(n: number, ctx: any): any; visitB(n: number, ctx: any): any; }
abstract class Base implements V {
  count = 0;
  visit(n: number, ctx: any): any { this.count += n; return n; }
  visitA(n: number, ctx: any) { this.visit(n, ctx); }
  visitB(n: number, ctx: any): any { this.visit(n, ctx); }
}
class Rec extends Base {}
class Rec2 extends Rec { label = 'r2'; }
const r = new Rec2();
const v: V = r;
v.visitA(1, null);
v.visitB(2, null);
assert(r.count === 3, 'void methods implementing any-returning ones, inherited');

// an early `return;` in such a method
abstract class Early implements V {
  seen = 0;
  visitA(n: number, ctx: any) { if (n < 0) { return; } this.seen += n; }
  visitB(n: number, ctx: any): any { if (n < 0) return; this.seen += n; }
}
class Early2 extends Early {}
const early = new Early2();
(early as V).visitA(-1, null);
(early as V).visitB(-1, null);
(early as V).visitA(2, null);
assert(early.seen === 2, 'early return in void methods implementing any-returning ones');
