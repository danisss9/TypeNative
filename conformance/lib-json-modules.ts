// JSON modules: import data from './x.json' with { type: 'json' } and
// createRequire(import.meta.url)('./x.json'), read at compile time
import data from './json-module-helper.json' with { type: 'json' };
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const again = require('./json-module-helper.json');

assert(data.name === 'demo' && data.version.split('.').length === 3, 'string fields keep their methods');
assert(data.tags.join('+') === 'a+b' && data.nested.alpha.length === 2, 'arrays');
assert(JSON.stringify(data.nested) === '{"zeta":1,"alpha":[1,2]}', 'nested objects keep key order');
assert(data.nothing === null && data['weird-key'] === 7, 'null and non-identifier keys');
assert(data.list[1].id === 2, 'arrays of objects');
assert(again.name === 'demo' && again.tags.length === 2, 'createRequire');

function label(): string {
  return `${data.name}@${data.version}`;
}
assert(label() === 'demo@1.2.3', 'used from functions');
console.log('json modules ok');
