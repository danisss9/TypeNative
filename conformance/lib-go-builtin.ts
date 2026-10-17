import { chan, ref } from 'go:builtin';

const c = chan<number>(1);
c.send(42);
assert(c.recv() === 42, 'chan send/recv');

const r = ref<string>('hi');
assert(r.value === 'hi', 'ref value');

let sum = 0;
for (const v of [1, 2, 3]) {
  sum += v;
}
assert(sum === 6, 'sanity');
