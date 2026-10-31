// A Record built from an object's spread, an object stored where a Record is
// expected and back, and a parameter shadowing a Node import
import { resolve } from 'node:path';
const normal = { newline: /^\n+/, text: /^[^\n]+/ };
type Keys = keyof typeof normal;
const gfm: Record<Keys, RegExp> = { ...normal, text: /^g/ };
interface Rules { block: Record<Keys, RegExp> }
const rules = { block: normal };
if (gfm.text.test('g')) rules.block = gfm;
const held: Rules = rules;
assert(held.block.newline.test('\n') && held.block.text.test('g'), 'object → Record → object');
const later = new Promise<string>((resolve) => resolve('done'));
later.then((v) => assert(v === 'done' && resolve('/a', 'b') === '/a/b', 'a parameter shadowing an import'));
