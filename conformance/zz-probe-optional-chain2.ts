// Temporary probe: optional chaining short-circuits the rest of the chain
// when the guarded value is a typed nullable object.
class N {
  children: number[] = [];
  name = 'n';
  get size(): number {
    return this.children.length;
  }
  bump(n: number): number {
    this.children.push(n);
    return this.children.length;
  }
}

function absent(): N | null {
  return null;
}
function present(): N {
  return new N();
}

let threw = false;
try {
  absent()?.children.push(1);
} catch (e) {
  threw = true;
}
assert(!threw, 'n?.children.push(1) does not throw');

threw = false;
try {
  absent()?.bump(2);
} catch (e) {
  threw = true;
}
assert(!threw, 'n?.bump() does not throw');

const size = absent()?.size;
assert(size === undefined, 'n?.getter is undefined');

const n4 = present();
n4?.children.push(3);
assert(n4.children.length === 1, 'present chain pushes');

assert(present()?.bump(4) === 1, 'present call returns');

let calls = 0;
function mark(): number {
  calls++;
  return 0;
}
assert(absent()?.bump(mark()) === undefined, 'skipped call result is undefined');
assert(calls === 0, 'skipped call does not evaluate arguments');

console.log('ok');
