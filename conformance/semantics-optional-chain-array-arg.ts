// a?.items passed to an optional array parameter: undefined when a is unset
// (not an empty array)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Block {
  constructor(public children: string[]) {}
}

class Defer {
  constructor(public main: Block, public error: Block | null) {}
}

function ingestView(suffix: string, children?: string[]): string | null {
  if (children === undefined) return null;
  return `${suffix}(${children.join(',')})`;
}

const withError = new Defer(new Block(['a']), new Block([]));
const withoutError = new Defer(new Block(['a', 'b']), null);
assert(ingestView('Main', withoutError.main.children) === 'Main(a,b)', 'main view');
assert(ingestView('Error', withoutError.error?.children) === null, 'no error block: no view');
assert(ingestView('Error', withError.error?.children) === 'Error()', 'empty error block: a view');
console.log('ok');
