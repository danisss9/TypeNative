// Object.defineProperty on class instances and plain objects: the value is
// set (writable fields stay writable)
class Holder {
  declare schema: string;
  label = 'h';
  constructor(schema: string) {
    Object.defineProperty(this, 'schema', { value: schema, configurable: true, enumerable: false, writable: true });
  }
}
const h = new Holder('core');
assert(h.schema === 'core' && h.label === 'h', 'on this in a constructor');
h.schema = 'json';
assert(h.schema === 'json', 'stays writable');
const rec: Record<string, number> = {};
Object.defineProperty(rec, 'x', { value: 5, writable: true, enumerable: true, configurable: true });
assert(rec.x === 5 && Object.keys(rec).join() === 'x', 'on a record');
console.log(h.schema, rec.x);
