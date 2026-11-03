// Destructuring a class instance's array fields into locals (the locals hold the fields' references)
class Split { constructor(public strings: string[], public offsets: number[]) {} }
function split(): Split { return new Split(['a', 'b'], [1, 2]); }
function run(): number {
  const {strings, offsets} = split();
  strings.push('c');
  return strings.length + offsets[1];
}
assert(run() === 5, 'destructure');
const {strings: top} = split();
assert(top.length === 2, 'top-level destructure');
