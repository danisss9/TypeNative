// node:module builtinModules / isBuiltin, node:v8 getHeapStatistics and
// serialize / deserialize, node:sea isSea
import { builtinModules, isBuiltin } from 'node:module';
import * as v8 from 'node:v8';
import * as sea from 'node:sea';

assert(builtinModules.includes('fs') && builtinModules.includes('worker_threads'), 'builtinModules lists the core modules');
assert(!builtinModules.includes('test') && !builtinModules.includes('node:fs'), 'bare names, without node:-only modules');
assert(isBuiltin('fs') && isBuiltin('node:fs') && isBuiltin('fs/promises'), 'isBuiltin with and without node:');
assert(isBuiltin('node:test') && !isBuiltin('test'), 'node:test needs the scheme');
assert(!isBuiltin('left-pad') && !isBuiltin('node:nope'), 'packages are not builtins');

const heap = v8.getHeapStatistics();
assert(heap.used_heap_size > 0 && heap.total_heap_size >= heap.used_heap_size, 'heap sizes');
assert(heap.heap_size_limit > heap.used_heap_size, 'heap limit');
assert(heap.total_available_size > 0, 'available heap');

const value = { name: 'x', list: [1, 2, 3], nested: { ok: true }, when: new Date(0), map: new Map([['a', 1]]) };
const buf = v8.serialize(value);
assert(buf.length > 0, 'serialize gives bytes');
const back = v8.deserialize(buf);
assert(back.name === 'x' && back.list.length === 3 && back.nested.ok === true, 'deserialize round-trips');
assert(back.when instanceof Date && (back.when as Date).getTime() === 0, 'Dates survive');
assert(back.map instanceof Map, 'Maps survive');

assert(sea.isSea() === true, 'a TypeNative binary is a single executable');
let code = '';
try {
  sea.getAsset('missing.txt', 'utf8');
} catch (e: any) {
  code = e.code;
}
assert(code === 'ERR_SINGLE_EXECUTABLE_APPLICATION_ASSET_NOT_FOUND', `missing asset: ${code}`);
console.log('module v8 sea ok');
