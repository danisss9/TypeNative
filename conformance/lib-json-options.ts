// JSON.stringify space / replacer / toJSON, cycles; JSON.parse reviver and errors
interface Item { name: string; tags: string[]; nested: { a: number; b: number[] } }
const item: Item = { name: 'x', tags: ['a', 'b'], nested: { a: 1, b: [] } };
const expected2 = '{\n  "name": "x",\n  "tags": [\n    "a",\n    "b"\n  ],\n  "nested": {\n    "a": 1,\n    "b": []\n  }\n}';
assert(JSON.stringify(item, null, 2) === expected2, JSON.stringify(item, null, 2));
assert(JSON.stringify([1], null, '--') === '[\n--1\n]', 'string space');
assert(JSON.stringify(item, ['name', 'nested', 'a']) === '{"name":"x","nested":{"a":1}}', 'key list');
const tenfold = JSON.stringify({ a: 1, b: 'two' }, (k: string, v: any) => (typeof v === 'number' ? v * 10 : v));
assert(tenfold === '{"a":10,"b":"two"}', tenfold);
class P { x = 1; toJSON(): string { return 'P!'; } }
class Q { y = 1; }
class R extends Q { z = 2; type = 't'; }
const mixed = JSON.stringify([new P(), new R(), new Date(0), NaN, null, new Map([['a', 1]]), new Set([1])]);
assert(mixed === '["P!",{"y":1,"z":2,"type":"t"},"1970-01-01T00:00:00.000Z",null,null,{},{}]', mixed);
const revived = JSON.parse('{"a":1,"b":[1,2]}', (k: string, v: any) => (typeof v === 'number' ? v + 1 : v));
assert(JSON.stringify(revived) === '{"a":2,"b":[2,3]}', 'reviver');
let syntaxError = false;
try { JSON.parse('{bad'); } catch (e) { syntaxError = e instanceof SyntaxError; }
assert(syntaxError, 'invalid JSON throws a SyntaxError');
const cyc: any = { a: 1 };
cyc.self = cyc;
let circular = '';
try { JSON.stringify(cyc); } catch (e) { circular = (e as Error).name; }
assert(circular === 'TypeError', 'circular structures throw');
