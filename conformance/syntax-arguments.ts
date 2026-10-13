function sum(): number {
  let s = 0;
  for (let i = 0; i < arguments.length; i++) s += arguments[i];
  return s;
}
// @ts-ignore extra arguments
assert(sum(1, 2, 3) === 6, 'arguments');
function describe(name: string, age: number): string {
  return `${arguments.length}:${arguments[0]}`;
}
assert(describe('ana', 3) === '2:ana', 'arguments with declared parameters');
