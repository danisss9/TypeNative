// null in program data stays null: JSON.parse nulls, nulls stored in arrays
// and objects print, serialize and compare as null (not undefined)
const data = JSON.parse('{"a":null,"list":[1,null,3]}');
assert(data.a === null, 'parsed null');
assert(data.missing === undefined, 'missing is undefined');
assert(data.list[1] === null, 'null element');
assert(JSON.stringify(data) === '{"a":null,"list":[1,null,3]}', 'round trip');
const values: unknown[] = [null, 1];
assert(values[0] === null && typeof values[0] === 'object', 'stored null');
assert(JSON.stringify(values) === '[null,1]', 'serialized');
const record: Record<string, unknown> = { k: null };
assert('k' in record && record.k === null, 'null property');
assert(JSON.stringify(record) === '{"k":null}', 'null property serialized');
console.log(data.a, values[0], record.k);
assert(String(data.a) === 'null' && `${data.list[1]}` === 'null', 'null as a string');
assert(data.a == undefined && data.a !== undefined, 'loosely equal to undefined only');
assert(!data.a && (data.a ?? 'fallback') === 'fallback', 'falsy and nullish');
console.log(data);
