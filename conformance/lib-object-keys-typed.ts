// Object.keys / values / entries and for...in on typed objects (interfaces,
// object literals, class instances), and JSON.parse keeping key order
class Base {
  id = 1;
  #secret = 2;
  get doubled(): number {
    return this.id * 2;
  }
  peek(): number {
    return this.#secret;
  }
}
class Child extends Base {
  name = 'c';
  handler = () => 3;
}
interface Opt {
  a: number;
  b?: string;
}

const lit = { zeta: 1, alpha: 'two', greet() { return 'hi'; } };
assert(Object.keys(lit).join() === 'zeta,alpha,greet', `literal keys: ${Object.keys(lit)}`);
assert(Object.keys(new Child()).join() === 'id,name,handler', 'own fields, parent first, no #private or accessors');
const unset: Opt = { a: 1 };
const set: Opt = { a: 1, b: 'x' };
assert(Object.keys(unset).join() === 'a' && Object.keys(set).join() === 'a,b', 'unset optional properties are absent');
assert(Object.values(set).join() === '1,x', 'values');
assert(JSON.stringify(Object.entries(set)) === '[["a",1],["b","x"]]', 'entries');
const seen: string[] = [];
for (const k in new Child()) seen.push(k);
assert(seen.join() === 'id,name,handler', 'for...in on an instance');
for (const [k, v] of Object.entries(set)) seen.push(`${k}=${v}`);
assert(seen.slice(3).join() === 'a=1,b=x', 'for...of over entries');

const parsed: any = JSON.parse('{"zeta":1,"alpha":{"b":2,"a":[1,{"y":1,"x":2}]},"dup":1,"dup":2}');
assert(Object.keys(parsed).join() === 'zeta,alpha,dup', `JSON.parse keeps key order: ${Object.keys(parsed)}`);
assert(JSON.stringify(parsed) === '{"zeta":1,"alpha":{"b":2,"a":[1,{"y":1,"x":2}]},"dup":2}', 'and stringifies in order');
parsed.extra = true;
delete parsed.dup;
assert(Object.keys(parsed).join() === 'zeta,alpha,extra' && 'alpha' in parsed && !('dup' in parsed), 'set / delete / in');
const merged = { ...parsed, more: 1 };
assert(JSON.stringify(merged) === '{"zeta":1,"alpha":{"b":2,"a":[1,{"y":1,"x":2}]},"extra":true,"more":1}', 'spread keeps order');
const keys: string[] = [];
for (const k in parsed.alpha) keys.push(k);
assert(keys.join() === 'b,a', 'for...in on parsed objects');
const revived = JSON.parse('{"b":1,"a":2}', (k, v) => (typeof v === 'number' ? v * 10 : v));
assert(JSON.stringify(revived) === '{"b":10,"a":20}', 'reviver');
console.log('object keys ok');
