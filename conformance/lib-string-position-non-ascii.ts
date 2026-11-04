// startsWith / endsWith / includes with a position after non-ASCII text:
// positions count characters (UTF-16 units in the BMP), as in JS
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const input = 'Interpolation: {{ one }}\u00a0Interpolation: {{ two }} ✓ é end';
const open = input.indexOf('{{', 25);
assert(open === 40, `indexOf: ${open}`);
assert(input.startsWith('{{', open), 'startsWith at an index past U+00A0');
assert(input.startsWith('}}', 47), 'startsWith }}');
assert(!input.startsWith('}}', 46), 'not at 46');
assert(input.includes('two', 40) && !input.includes('one', 40), 'includes from a position');
assert(input.endsWith('{{ two }}', 49), 'endsWith at a position');
const accent = input.indexOf('é');
assert(input.startsWith('é end', accent), 'startsWith at a non-ASCII character');
assert(input.startsWith(' end', accent + 1), 'position after it');
assert(input.endsWith('✓', accent - 1), 'endsWith before it');
console.log('ok');
