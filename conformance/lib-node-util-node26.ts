// node:util in Node 26: inspect.custom, getCallSites, isPartialDeepStrictEqual, MIMEType.parse,
// hex colours in styleText, markPromiseAsHandled
import * as util from 'node:util';

class Money {
  constructor(private cents: number) {}
  [util.inspect.custom](): string {
    return `Money<${(this.cents / 100).toFixed(2)}>`;
  }
}
const shown = util.inspect(new Money(1234));
console.log(shown);
assert(shown === 'Money<12.34>', 'inspect.custom');
assert(util.inspect.custom === Symbol.for('nodejs.util.inspect.custom'), 'inspect.custom is the registered symbol');

function where() {
  return util.getCallSites();
}
const sites = where();
assert(sites.length > 0 && sites[0].scriptName.includes('lib-node-util-node26') && sites[0].lineNumber > 0, 'getCallSites');

assert(util.isPartialDeepStrictEqual({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 2 } }), 'partial objects');
assert(util.isPartialDeepStrictEqual([1, 2, 3], [1, 3]), 'partial arrays');
assert(!util.isPartialDeepStrictEqual({ a: 1 }, { a: 2 }) && !util.isPartialDeepStrictEqual({ a: 1 }, { b: 1 }), 'mismatches');

assert(util.MIMEType.parse('not a mime') === null, 'MIMEType.parse returns null');
assert(String(util.MIMEType.parse('text/html; charset=utf-8')) === 'text/html;charset=utf-8', 'MIMEType.parse');

const styled = util.styleText('#ff8800', 'x', { validateStream: false });
assert(styled === '\u001b[38;2;255;136;0mx\u001b[39m', 'hex colour');
assert(util.styleText(['bold', '#0f0'], 'y', { validateStream: false }) === '\u001b[1m\u001b[38;2;0;255;0my\u001b[39m\u001b[22m', 'short hex colour');

async function failing(): Promise<void> {
  throw new Error('ignored');
}
util.markPromiseAsHandled(failing());
