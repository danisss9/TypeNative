// Iterator helpers on generators (lazy), Iterator.from, next()
function* naturals(): Generator<number> { let n = 1; while (true) yield n++; }
function* words(): Generator<string> { yield 'a'; yield 'bb'; yield 'ccc'; }
assert(naturals().map((n) => n * n).filter((n) => n % 2 === 1).take(3).toArray().join(',') === '1,9,25', 'map / filter / take on an infinite generator');
assert(naturals().drop(5).take(2).toArray().join(',') === '6,7', 'drop');
assert(words().map((w, i) => `${i}:${w}`).toArray().join(' ') === '0:a 1:bb 2:ccc', 'index argument');
assert(words().some((w) => w.length === 2) && words().every((w) => w.length > 0) && words().find((w) => w.startsWith('c')) === 'ccc', 'some / every / find');
assert(naturals().take(4).reduce((acc, n) => acc + n, 0) === 10 && words().reduce((a, w) => a + w) === 'abbccc', 'reduce');
const seen: string[] = [];
words().forEach((w, i) => seen.push(`${i}${w}`));
assert(seen.join() === '0a,1bb,2ccc', 'forEach');
assert(Iterator.from([1, 2, 3]).map((x) => x * 10).toArray().join(',') === '10,20,30', 'Iterator.from');
assert(words().flatMap((w) => [w, w.toUpperCase()]).toArray().length === 6, 'flatMap');
const it = words();
const first = it.next();
assert(first.value === 'a' && !first.done, 'next()');
it.next();
it.next();
assert(it.next().done === true, 'next() at the end');
