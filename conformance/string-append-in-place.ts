// s += part on a string field or variable appends in place once the string is
// long (Babel's generator Buffer: this._str += str, thousands of times), so
// it must behave exactly like a copy: a string read before an append keeps
// its value, two appends to the same string each get their own result, and
// slices of a built string stay what they were
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

class OutputBuffer {
  _buf = '';
  _str = '';
  _count = 0;

  append(part: string): void {
    if (++this._count > 64) {
      this._buf += this._str;
      this._str = part;
      this._count = 0;
    } else {
      this._str += part;
    }
  }

  get(): string {
    return this._buf + this._str;
  }
}

// 1. A field built by many appends matches the same text built by join
const buffer = new OutputBuffer();
const parts: string[] = [];
for (let i = 0; i < 5000; i++) {
  const part = `line ${i};\n`;
  buffer.append(part);
  parts.push(part);
}
check('buffer text', buffer.get(), parts.join(''));
check('buffer length', buffer.get().length, parts.join('').length);

// 2. A string read before an append keeps its value
let text = 'x'.repeat(300);
const before = text;
text += 'abc';
check('before unchanged', before, 'x'.repeat(300));
check('appended', text, 'x'.repeat(300) + 'abc');

// 3. Two appends to the same base: each its own result
const base = text;
let left = base;
let right = base;
left += 'LEFT';
right += 'RIGHT';
check('left', left.slice(-7), 'abcLEFT');
check('right', right.slice(-8), 'abcRIGHT');
check('base unchanged', base.slice(-4), 'xabc');
check('left length', left.length, 307);
check('right length', right.length, 308);

// 4. Appending to an old copy after the newer one grew
let grown = base;
for (let i = 0; i < 100; i++) grown += String(i % 10);
let old = base;
old += '!';
check('old append', old, base + '!');
check('grown tail', grown.slice(-10), '0123456789');
check('grown length', grown.length, base.length + 100);

// 5. A slice of a built string that ends at its end, appended to
const tail = grown.slice(grown.length - 260);
let extended = tail;
extended += '#';
check('tail', tail, grown.slice(grown.length - 260));
check('extended', extended, grown.slice(grown.length - 260) + '#');
let further = grown;
further += '$';
check('further', further, grown + '$');
check('extended kept', extended.slice(-2), '9#');

// 6. Non-ASCII text appends byte for byte
let unicode = 'é'.repeat(200);
unicode += 'ü→ß';
unicode += 'ñ';
check('unicode length', unicode.length, 200 + 4);
check('unicode tail', unicode.slice(-5), 'éü→ßñ');

// 7. An appended number is rendered as JS renders it
let numbered = 'n'.repeat(260);
numbered += 1.5;
numbered += 10;
check('numbers', numbered.slice(-5), '1.510');

console.log('ok');
