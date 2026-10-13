type Point = [x: number, y: number, label?: string];
const p: Point = [1, 2];
type Row = [string, ...number[]];
const row: Row = ['a', 1, 2, 3];
assert(p[0] === 1 && p.length === 2 && row.length === 4 && row[3] === 3, 'tuple elements');
