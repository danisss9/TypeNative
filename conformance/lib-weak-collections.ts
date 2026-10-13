class Key { constructor(public id: number) {} }
const k = new Key(1);
const wm = new WeakMap<Key, string>();
wm.set(k, 'one');
const ws = new WeakSet<Key>();
ws.add(k);
assert(wm.get(k) === 'one' && wm.has(k) && ws.has(k) && !ws.has(new Key(2)), 'WeakMap / WeakSet');
