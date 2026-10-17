const v = JSON.parse('{"a":[1,2]}');
assert(v.a.length === 2 && v.a[1] === 2, 'parse');

// Assigned to an interface type, the result converts into its struct
interface Point {
  x: number;
  label: string;
  tags: string[];
}
const p: Point = JSON.parse('{"x":3,"label":"p","tags":["a","b"]}');
assert(p.x + 1 === 4 && p.label === 'p' && p.tags.length === 2 && p.tags[1] === 'b', 'typed parse');
