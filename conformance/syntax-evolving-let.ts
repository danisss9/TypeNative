// `let x;` and `let x = undefined` take their type from later assignments
function f(n: number): string {
  let args;
  try {
    args = { name: 'x', count: n };
  } catch {
    return 'err';
  }
  const { name, count } = args;
  return `${name}${count}`;
}
let split = undefined;
for (let i = 0; i < 5; i++) if (i % 2) split = i;
let x, y = 3;
x = y * 2;
let label;
label = 'set';
assert(f(2) === 'x2', 'object assigned in try');
assert(split === 3, 'number assigned in a loop');
assert(x === 6 && y === 3 && label === 'set', 'declared, assigned later');
console.log(f(2), split, x, label);
