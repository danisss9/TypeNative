// Repeated interfaces / enums merge; an interface named like a class adds fields
interface Point { x: number }
interface Point { y: number }
const p: Point = { x: 1, y: 2 };
assert(p.x + p.y === 3, 'interface merging');
enum Dir { Up = 'up' }
enum Dir { Down = 'down' }
assert(Dir.Up + Dir.Down === 'updown', 'enum merging');
interface Box { extra: number }
class Box { base = 1; }
const box = new Box();
box.extra = 5;
assert(box.base + box.extra === 6, 'class + interface merging');
