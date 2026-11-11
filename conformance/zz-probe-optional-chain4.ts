// Temporary probe: reads and calls through the rest of an optional chain
class Leaf {
  value = 42;
  get double(): number {
    return this.value * 2;
  }
  bump(): number {
    this.value += 1;
    return this.value;
  }
}

class Holder {
  leaf: Leaf = new Leaf();
  list: Leaf[] = [];
}

function noHolder(): Holder | null {
  return null;
}
function holder(): Holder {
  return new Holder();
}

const direct = noHolder()?.leaf.value;
assert(direct === undefined, 'a?.b.c read is undefined');

const call = noHolder()?.leaf.bump();
assert(call === undefined, 'a?.b.m() call is undefined');

const getter = noHolder()?.leaf.double;
assert(getter === undefined, 'a?.b.getter is undefined');

const present = holder()?.leaf.value;
assert(present === 42, 'a?.b.c read works');

assert(holder()?.leaf.bump() === 43, 'a?.b.m() works');
assert(holder()?.leaf.double === 84, 'a?.b.getter works');

const listLength = noHolder()?.list.length;
assert(listLength === undefined, 'a?.b.length is undefined');

const pushed = holder();
pushed?.list.push(new Leaf());
assert(pushed.list.length === 1, 'a?.b.push works');

console.log('ok');
