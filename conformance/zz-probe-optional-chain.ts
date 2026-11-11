// Temporary probe: optional chaining short-circuits the rest of the chain
// (a?.b.push(x), a?.b.c() must not evaluate the call when a is nullish).
const absent: any = null;
let threw = false;
try {
  absent?.list.push(1);
} catch (e) {
  threw = true;
}
assert(!threw, 'a?.list.push(1) does not throw');

let called = false;
const f = (): void => {
  called = true;
};
try {
  absent?.obj.f();
} catch (e) {
  threw = true;
}
assert(!called, 'a?.obj.f() does not call');

const present: any = { list: [] as number[] };
present?.list.push(2);
assert(present.list.length === 1, 'present chain pushes');

const nested: any = { inner: { fn: () => 7 } };
assert(nested?.inner.fn() === 7, 'nested call result');

const maybe: any = null;
const count = maybe?.items.count;
assert(count === undefined, 'a?.b.c is undefined');

console.log('ok');

