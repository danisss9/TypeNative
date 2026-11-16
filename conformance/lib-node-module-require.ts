// require() through createRequire: built-in modules and local modules (by a literal specifier)
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const path = require('node:path');
const helper = require('./module-require-helper');

console.log(path.join('a', 'b'), helper.greet('x'));
assert(path.basename('/a/b.txt') === 'b.txt', 'require of a built-in module');
assert(helper.greet('x') === 'hello x' && helper.answer === 42, 'require of a local module');
