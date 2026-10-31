// Loop and expression forms Go has no direct equivalent for: continue in
// do…while re-tests the condition, assignments and compound assignments as
// values, comma expressions, for-loop headers without an initializer value,
// several updates per iteration, and switch fallthrough into default
const text = 'ab cd';
let i = -1;
let out = '';
for (let ch: string; (ch = text[(i += 1)]); ) out += ch.toUpperCase();
assert(out === 'AB CD' && i === 5, 'assignment in a for condition');

let a = 0;
let b = 0;
a = b = 7;
const add = (n: number) => (a += n);
assert(a === 7 && b === 7, 'assignment chain');
assert(add(3) === 10 && b === 7, 'compound assignment as a value');

let k = 0;
const comma = (k++, k * 10);
assert(comma === 10 && k === 1, 'comma operator');

let n = 0;
let s = '';
do {
  n++;
  if (n === 2) continue;
  s += n;
} while (n < 5);
assert(s === '1345', 'continue in do…while tests the condition');

let lo = 0;
let hi = 10;
let steps = 0;
for (; lo < hi; lo += 2, hi -= 1) steps++;
assert(steps === 4 && lo === 8 && hi === 6, 'several updates');

function sw(x: number): string {
  let r = '';
  switch (x) {
    default:
      r += 'd';
    case 1:
      r += '1';
      break;
    case 2:
      r += '2';
  }
  return r;
}
assert(sw(1) === '1' && sw(2) === '2' && sw(3) === 'd1', 'default falls through');

function classify(v: number): string {
  let r = '';
  loop: for (let j = 0; j < 3; j++) {
    switch (j) {
      case 0:
        r += 'a';
        break;
      case 1:
        if (v >= 0) break;
      default:
        break loop;
    }
    r += '.';
  }
  return r;
}
assert(classify(1) === 'a..' && classify(-1) === 'a.', 'labeled break from a switch');
console.log(out, a, comma, s, steps, sw(3), classify(1));
