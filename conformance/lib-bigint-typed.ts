// bigint-annotated functions, variables and fields; compound assignment
// (+= -= *=) and string concatenation of bigints
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function fingerprint(s: string): bigint {
  let h = BigInt(0);
  for (const ch of s) h = BigInt.asUintN(64, h * BigInt(31) + BigInt(ch.charCodeAt(0)));
  return h;
}

function computeMsgId(msg: string, meaning: string = ''): string {
  let id = fingerprint(msg);
  if (meaning) {
    id = BigInt.asUintN(64, id << BigInt(1)) | ((id >> BigInt(63)) & BigInt(1));
    id += fingerprint(meaning);
  }
  return BigInt.asUintN(63, id).toString();
}

class Counter {
  total: bigint = 0n;
  add(n: bigint): void {
    this.total += n;
  }
}

assert(computeMsgId('hello') === '99162322', computeMsgId('hello'));
assert(computeMsgId('hello', 'm|d') === '198433337', computeMsgId('hello', 'm|d'));
let g: bigint = 5n;
g -= 2n;
g *= 3n;
assert('g=' + g === 'g=9', 'g=' + g);
assert(g + ' left' === '9 left', g + ' left');
const c = new Counter();
c.add(10n);
c.add(32n);
assert(c.total === 42n, String(c.total));
console.log('ok');
