// A call's argument converted to the parameter's object type (a structural
// copy) and the callee changing its fields: the changes are the caller's
// object's, at statement positions of every shape — as in JS the same object
// is passed (a parser's do { … = this.parseSubscript(…, state) }
// while (!state.stop) relies on it)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

interface PState {
  stop: boolean;
  seen: string;
}

function step(state: PState): number {
  state.stop = true;
  state.seen = 'stepped';
  return 1;
}

function wrap(state: PState): number {
  return step(state);
}

function reassign(state: PState, base: number): number {
  let result = base;
  do {
    result = step(state) + result;
  } while (!state.stop);
  return result;
}

// (assignment statement: the changes must survive the conversion)
const state = { stop: false, seen: '' };
let total = 0;
let acc = 0;
do {
  acc = step(state);
  total += acc;
} while (!state.stop);
assert(state.stop === true, 'assignment statement: stop written through');
assert(state.seen === 'stepped', 'assignment statement: field written through');
assert(total === 1, 'assignment statement: called once');

// (return statement: the changes survive down the call chain)
const chained = { stop: false, seen: '' };
const returned = wrap(chained);
assert(chained.stop === true, 'return statement: stop written through');
assert(chained.seen === 'stepped', 'return statement: field written through');
assert(returned === 1, 'return statement: result returned');

// (assignment inside a do…while: the loop ends on the callee's write)
const looped = { stop: false, seen: '' };
const reran = reassign(looped, 10);
assert(reran === 11, 'do…while: ran once');
assert(looped.stop === true && looped.seen === 'stepped', 'do…while: state written through');

// (the object is structurally the parameter's type but not nominally it)
const plain = { stop: false, seen: '' };
const untyped: any = plain;
const stepped = step(untyped);
assert(stepped === 1 && plain.stop === true, 'untyped argument: written through');
console.log('ok');
