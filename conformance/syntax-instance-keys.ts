// obj[key] on class instances and typed objects (reads, writes, getters)
class Point {
  x = 1;
  y = 2;
  get sum(): number { return this.x + this.y; }
}
const p = new Point();
const keys: (keyof Point)[] = ['x', 'y', 'sum'];
assert(keys.map((k) => p[k]).join(',') === '1,2,3' && p['x'] === 1 && p['sum'] === 3, 'reads');
const field: 'x' | 'y' = 'x';
p[field] = 7;
const name: string = 'y';
(p as any)[name] = 10;
assert(p.x === 7 && p.y === 10, 'writes (typed and through any)');
interface Cfg { host: string; port: number }
const cfg: Cfg = { host: 'h', port: 80 };
const pairs = (['host', 'port'] as (keyof Cfg)[]).map((k) => `${k}=${cfg[k]}`);
assert(pairs.join('&') === 'host=h&port=80', pairs.join('&'));
