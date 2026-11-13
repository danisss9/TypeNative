// JSON.parse(text) as T[] decodes straight into T when the text matches it
// exactly, and converts the dynamic value otherwise. Either way the result
// must be what JS gives: values (escapes, surrogate pairs, -0, exponents,
// underflow), keys in another order, a missing optional
// key undefined, null where the text has it, nested arrays, an array that
// can grow, and a SyntaxError for invalid text
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected && !(Number.isNaN(actual) && Number.isNaN(expected))) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

interface Dims {
  w: number;
  h: number;
}
interface Item {
  id: number;
  name: string;
  ok: boolean;
  tags: string[];
  dims: Dims;
}
interface Loose {
  id: number;
  note?: string;
  parent: Loose | null;
}

// 1. The fields' order, every kind of value
const text = JSON.stringify([
  { id: 1, name: 'a "quoted" é 😀 \n tab\t /slash', ok: true, tags: ['x', 'y'], dims: { w: 2, h: 3 } },
  { id: -0, name: '', ok: false, tags: [], dims: { w: 1.5e-2, h: 1e21 } }
]);
const items = JSON.parse(text) as Item[];
check('length', items.length, 2);
check('name', items[0].name, 'a "quoted" é 😀 \n tab\t /slash');
check('bool', items[0].ok && !items[1].ok, true);
check('tags', items[0].tags.join('+'), 'x+y');
check('empty tags', items[1].tags.length, 0);
check('negative zero', Object.is((JSON.parse('[-0, 0]') as number[])[0], -0), true);
check('exponent', items[1].dims.w, 0.015);
check('big', items[1].dims.h, 1e21);
check('roundtrip', JSON.stringify(items), text);
items.push({ id: 3, name: 'c', ok: true, tags: [], dims: { w: 0, h: 0 } });
items[0].tags.push('z');
check('grown', items.length + items[0].tags.length, 6);

// 2. Escapes written out, whitespace between tokens
const spaced = '[ {"id" : 7 ,\n "name":"\\u00e9\\ud83d\\ude00\\/\\b\\f\\r", "ok":true,\t"tags":["\\"q\\""],"dims":{"w":1E3,"h":-2.5e+1}} ]';
const s = JSON.parse(spaced) as Item[];
check('escaped', s[0].name, 'é😀/\b\f\r');
check('escaped tag', s[0].tags[0], '"q"');
check('upper exponent', s[0].dims.w, 1000);
check('signed exponent', s[0].dims.h, -25);

// 3. Another key order (the dynamic value converted)
const reordered = '[{"name":"r","id":4,"ok":false,"tags":[],"dims":{"h":1,"w":2}}]';
const r = JSON.parse(reordered) as Item[];
check('reordered values', `${r[0].id} ${r[0].name} ${r[0].dims.w} ${r[0].dims.h}`, '4 r 2 1');

// 4. Missing optional keys, null, recursion
const loose = JSON.parse('[{"id":1,"parent":null},{"id":2,"note":"n","parent":{"id":3,"note":"p","parent":null}}]') as Loose[];
check('missing', loose[0].note, undefined);
check('null', loose[0].parent == null, true);
check('nested', loose[1].parent?.note, 'p');
check('nested id', loose[1].parent?.id, 3);

// 5. Arrays of arrays, numbers at the float range's low end
const grid = JSON.parse('[[1,2],[3],[]]') as number[][];
check('grid', grid.map((row) => row.length).join(','), '2,1,0');
check('grid sum', grid[0][1] + grid[1][0], 5);
const small = JSON.parse('[1e-400, 5e-324]') as number[];
check('underflow', small[0], 0);
check('denormal', small[1], 5e-324);
const words = JSON.parse('["a", "b"]') as string[];
check('words', words.join(''), 'ab');

// 6. Invalid text: a SyntaxError
for (const bad of ['[{"id":1,}]', '[1,]', '["\\x"]', '[01]', '[1] x', '']) {
  let threw = '';
  try {
    const parsed = JSON.parse(bad) as number[];
    threw = `parsed ${parsed.length}`;
  } catch (e) {
    threw = e instanceof SyntaxError ? 'SyntaxError' : String(e);
  }
  check(`invalid ${bad}`, threw, 'SyntaxError');
}
console.log('ok');
