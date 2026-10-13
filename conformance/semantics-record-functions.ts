// Functions stored in a Record are called like properties, even with Map/array method names
type Handler = (x: number) => number;
const handlers: Record<string, Handler> = {
  sort: (x) => x + 1,
  double: (x) => x * 2,
  get: (x) => x - 1
};
const scores: Record<string, number> = { math: 90 };
assert(scores.math === 90, 'record property read');
assert(handlers.double(4) === 8, 'record function property');
assert(handlers.sort(1) === 2, 'record method named like an array method');
assert(handlers.get(5) === 4, 'record method named like a Map method');
const m = new Map<string, number>();
m.set('a', 1);
assert(m.get('a') === 1, 'real Map.get still works');
