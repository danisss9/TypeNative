// [a, b] = expr into existing variables (and fields): each target assigned
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function parseMeta(meta: string): string {
  let id: string | undefined;
  let meaning: string | undefined;
  let rest: string;
  const i = meta.indexOf('@@');
  [rest, id] = i > -1 ? [meta.slice(0, i), meta.slice(i + 2)] : [meta, ''];
  [meaning] = [rest.toUpperCase()];
  return `${rest}|${id}|${meaning}`;
}

class Pair {
  left = 0;
  right = 0;
  swap(): void {
    [this.left, this.right] = [this.right, this.left];
  }
}

assert(parseMeta('desc@@greet') === 'desc|greet|DESC', parseMeta('desc@@greet'));
assert(parseMeta('plain') === 'plain||PLAIN', parseMeta('plain'));
let a = 1;
let b = 2;
[a, b] = [b, a];
assert(a === 2 && b === 1, 'swap');
let c = 0;
let d = 0;
[c, d = 9] = [5];
assert(c === 5 && d === 9, `default: ${c} ${d}`);
const p = new Pair();
p.left = 3;
p.swap();
assert(p.left === 0 && p.right === 3, 'field targets');
console.log('ok');
