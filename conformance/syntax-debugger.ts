// `debugger` is erased: a native binary has no debugger to break into
let reached = false;
debugger;
reached = true;
assert(reached, 'the statement after debugger runs');

function step(n: number): number {
  debugger;
  return n + 1;
}
assert(step(41) === 42, 'debugger inside a function');
