// A destructured binding of an object's array field is the array itself: push
// through it mutates the field's array (JS binds the reference)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class State {
  context: string[] = ['brace'];
}

function update(s: State): void {
  const { context } = s;
  context.push('j_oTag');
  context.push('j_expr');
}

const s = new State();
update(s);
assert(s.context.length === 3, `push through a destructured field binding mutates it (${s.context.length})`);
assert(s.context[1] === 'j_oTag' && s.context[2] === 'j_expr', 'the pushed entries are in the field');

function popOne(s: State): string | undefined {
  const { context } = s;
  return context.pop();
}

const popped = popOne(s);
assert(popped === 'j_expr', 'pop through the binding returns the last entry');
assert(s.context.length === 2, 'pop mutates the field');

function spliceOne(s: State): void {
  const { context } = s;
  context.splice(0, 1, 'statement');
}

spliceOne(s);
assert(s.context[0] === 'statement', 'splice through the binding mutates the field');
console.log('ok');
