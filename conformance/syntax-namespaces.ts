namespace Geometry {
  export const unit = 1;
  export function area(w: number, h: number): number { return w * h * unit; }
  export namespace Deep { export const answer = 42; }
}
assert(Geometry.area(2, 3) === 6 && Geometry.Deep.answer === 42, 'namespaces');
namespace Shapes {
  export interface Square { side: number }
  export const make = (side: number): Square => ({ side });
}
const sq: Shapes.Square = Shapes.make(4);
assert(sq.side === 4, 'namespace types');
