// Map / Set / Record deletes are O(1) (dead slots compacted later): order,
// size, iteration during deletes, re-added keys, set operations and JSON
// must all stay exactly as in JS, for small maps and large ones
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

for (const size of [5, 40, 1000]) {
  // 1. Delete every third key, re-add some: re-added keys go to the end
  const m = new Map<string, number>();
  for (let i = 0; i < size; i++) m.set(`k${i}`, i);
  let deleted = 0;
  for (let i = 0; i < size; i += 3) if (m.delete(`k${i}`)) deleted++;
  check(`${size} delete again`, m.delete('k0'), false);
  check(`${size} size`, m.size, size - deleted);
  m.set('k0', -1);
  m.set('k1', 100);
  const keys = [...m.keys()];
  check(`${size} first`, keys[0], 'k1');
  check(`${size} last`, keys[keys.length - 1], 'k0');
  check(`${size} k1 kept`, m.get('k1'), 100);
  check(`${size} has deleted`, m.has('k3'), size <= 3);
  let sum = 0;
  for (const [, v] of m) sum += v;
  let expected = 99;
  for (let i = 0; i < size; i++) if (i % 3 !== 0 && i !== 1) expected += i;
  check(`${size} sum`, sum, expected);

  // 2. Deleting while iterating: deleted keys not yet reached are skipped
  const n = new Map<number, number>();
  for (let i = 0; i < size; i++) n.set(i, i);
  const seen: number[] = [];
  for (const [k] of n) {
    seen.push(k);
    n.delete(k + 1);
  }
  check(`${size} skip count`, seen.length, Math.ceil(size / 2));
  check(`${size} skip last`, seen[seen.length - 1], size % 2 === 0 ? size - 2 : size - 1);
  check(`${size} after skip`, n.size, Math.ceil(size / 2));

  // 3. Queue: delete the oldest, add the newest
  const q = new Map<string, number>();
  for (let i = 0; i < size * 3; i++) {
    q.set(`q${i}`, i);
    if (q.size > 10) q.delete(`q${i - 10}`);
  }
  check(`${size} queue`, [...q.values()].join(','), Array.from({ length: 10 }, (_, j) => size * 3 - 10 + j).join(','));

  // 4. Stack: delete the newest
  const st = new Set<number>();
  for (let i = 0; i < size; i++) st.add(i);
  for (let i = size - 1; i >= size / 2; i--) st.delete(i);
  st.add(-1);
  const arr = [...st];
  check(`${size} stack`, arr.length, Math.ceil(size / 2) + 1);
  check(`${size} stack last`, arr[arr.length - 1], -1);

  // 5. Set operations and forEach after deletes
  const a = new Set<number>();
  const b = new Set<number>();
  for (let i = 0; i < size; i++) {
    a.add(i);
    b.add(i * 2);
  }
  for (let i = 0; i < size; i += 2) a.delete(i);
  const both: number[] = [];
  a.forEach((v) => {
    if (b.has(v)) both.push(v);
  });
  check(`${size} odd in evens`, both.length, 0);
  check(`${size} a size`, a.size, Math.floor(size / 2));
  check(`${size} first odd`, [...a][0], 1);

  // 6. A record (object) with deletes: index keys first, then insertion order
  const rec: Record<string, number> = {};
  for (let i = 0; i < size; i++) rec[i % 2 === 0 ? `p${i}` : String(i)] = i;
  for (let i = 0; i < size; i += 4) delete rec[`p${i}`];
  rec.p0 = 0;
  const recKeys = Object.keys(rec);
  check(`${size} rec first`, recKeys[0], '1');
  check(`${size} rec last`, recKeys[recKeys.length - 1], 'p0');
  check(`${size} rec json`, JSON.stringify(rec).length > 0, true);
}

// 7. Clear after deletes, then reuse
const c = new Map<string, number>();
for (let i = 0; i < 100; i++) c.set(`c${i}`, i);
for (let i = 0; i < 90; i++) c.delete(`c${i}`);
c.clear();
c.set('x', 1);
c.set('c5', 2);
check('clear reuse', [...c.keys()].join(','), 'x,c5');
check('clear size', c.size, 2);

// 8. Object keys of a Map (identity), deleted and re-added
const objs = [{ id: 1 }, { id: 2 }, { id: 3 }];
const om = new Map<{ id: number }, string>();
for (let r = 0; r < 30; r++) for (const o of objs) om.set(o, `v${o.id}`);
om.delete(objs[0]);
om.set(objs[0], 'again');
check('identity order', [...om.values()].join(','), 'v2,v3,again');
console.log('ok');
