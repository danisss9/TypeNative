// `arguments` in a function: the passed values, their count and indexing
function count(): number {
  return arguments.length;
}
function second(a: number, b?: number): unknown {
  return arguments[1];
}
function joinAll(...parts: string[]): string {
  return Array.from(arguments).join('+');
}
assert(count() === 0, 'none');
assert(second(1, 2) === 2 && second(1) === undefined, 'indexing');
assert(joinAll('a', 'b', 'c') === 'a+b+c', 'Array.from(arguments)');
console.log(count(), second(1, 2), joinAll('x', 'y'));
