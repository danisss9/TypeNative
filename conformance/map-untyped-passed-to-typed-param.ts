// conformance-flags: --no-typecheck
// An untyped new Map() handed to a function whose parameter is a typed Map,
// and returned as a typed ReadonlyMap, is one map: what the function sets is
// in it (the React Compiler's collectTemporariesSidemap)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type Dep = { name: string; path: string[] };

function fill(items: number[], temporaries: Map<number, Dep>): void {
  for (const id of items) {
    temporaries.set(id, { name: `t${id}`, path: [] });
  }
}

function collect(items: number[]): ReadonlyMap<number, Dep> {
  const temporaries = new Map();
  fill(items, temporaries);
  return temporaries;
}

const deps = collect([22, 23]);
check('size', deps.size, 2);
check('get', deps.get(22)?.name, 't22');
check('miss', deps.get(5) === undefined, true);

function collectSet(): ReadonlySet<string> {
  const seen = new Set();
  addAll(['a', 'b', 'a'], seen);
  return seen;
}
function addAll(xs: string[], into: Set<string>): void {
  for (const x of xs) into.add(x);
}
check('set size', collectSet().size, 2);
console.log('ok');
