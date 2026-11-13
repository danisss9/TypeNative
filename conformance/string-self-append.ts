// s = s + a + b … on a string variable or field compiles to an in-place
// append (as s += does): the parts must render as JS renders them, left to
// right, and strings read before the append must keep their values
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

// 1. Numbers after a string concatenate one by one ("x12", not "x3")
let s = 'x';
s = s + 1 + 2;
check('numbers', s, 'x12');
s = s + (1 + 2) + true + 0.5 + 1e21 + (0.1 + 0.2);
check('mixed parts', s, 'x123true0.51e+210.30000000000000004');

// 2. Long strings built by s = s + …, with snapshots taken in between
let out = '';
const snapshots: string[] = [];
for (let i = 0; i < 2000; i++) {
  out = out + 'line ' + i + '\n';
  if (i % 500 === 0) snapshots.push(out);
}
check('length', out.length, 18890);
for (let k = 0; k < snapshots.length; k++) {
  check(`snapshot ${k}`, out.startsWith(snapshots[k]), true);
  check(`snapshot ${k} end`, snapshots[k].endsWith(`line ${k * 500}\n`), true);
}

// 3. Two strings grown from one base each get their own result
let base = '';
for (let i = 0; i < 300; i++) base = base + 'ab';
let left = base;
let right = base;
left = left + 'LEFT';
right = right + 'RIGHT';
check('left', left.slice(-6), 'abLEFT');
check('right', right.slice(-7), 'abRIGHT');
check('base kept', base.length, 600);

// 4. Fields (this.buf = this.buf + …) and nested objects
class Writer {
  buf = '';
  inner = { text: '' };
  write(part: string, n: number): void {
    this.buf = this.buf + part + n;
    this.inner.text = this.inner.text + part;
  }
}
const w = new Writer();
for (let i = 0; i < 1000; i++) w.write('w', i % 10);
check('field length', w.buf.length, 2000);
check('field tail', w.buf.slice(-4), 'w8w9');
check('nested field', w.inner.text.length, 1000);

// 5. Not an append: the target is not the leftmost operand
let t = 'mid';
t = 'pre-' + t + '-post';
check('not leftmost', t, 'pre-mid-post');
let u = 'a';
const other = 'b';
u = other + u;
check('other first', u, 'ba');

// 6. A part that reads the target itself
let v = 'ab';
v = v + v.length + v;
check('reads itself', v, 'ab2ab');
console.log('ok');
