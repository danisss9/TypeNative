// Loop counters (let i = 0; …; i++) and consts holding a bitwise result are
// kept as Go integers where every read is arithmetic, a comparison, a bitwise
// operand, an index or a template. They must still read as JS numbers:
// division is not integer division, -i of 0 is -0, shifts wrap at 32 bits,
// >>> of a negative counter is unsigned, a counting-down loop goes negative,
// closures see each iteration's value, and a const from a fractional operand
// truncates as ToInt32 does
function check(label: string, actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

// 1. Arithmetic on the counter
let halves = 0;
let negs = 0;
const parts: string[] = [];
const squares: number[] = [0, 0, 0, 0, 0];
for (let i = 0; i < 5; i++) {
  halves += i / 2;
  negs += -i;
  parts.push(`${i}:${i % 3}`);
  squares[i] = i * i;
}
check('halves', halves, 5);
check('negs', negs, -10);
check('template', parts.join(','), '0:0,1:1,2:2,3:0,4:1');
check('index', squares.join(','), '0,1,4,9,16');
let negZero = 1;
for (let i = 0; i < 1; i++) negZero = -i;
check('negative zero', negZero, -0);

// 2. Bitwise on the counter: wrapping, signed and unsigned shifts
let mixed = 0;
for (let i = 0; i < 4; i++) mixed = (mixed + ((i << 30) | (i >> 1))) | 0;
check('wrap', mixed, -2147483646);
const unsigned: number[] = [];
for (let i = 2; i > -3; i--) unsigned.push(i >>> 0, ~i, i ^ -1);
check('unsigned', unsigned.join(','), '2,-3,-3,1,-2,-2,0,-1,-1,4294967295,0,0,4294967294,1,1');

// 3. Closures capture each iteration's counter
const fns: (() => number)[] = [];
for (let i = 0; i < 3; i++) fns.push(() => i * 10);
check('closures', fns.map((f) => f()).join(','), '0,10,20');

// 4. A counter read elsewhere (a call argument) stays a number too
function twice(x: number): number {
  return x * 2;
}
let viaCall = 0;
for (let i = 0; i < 4; i++) viaCall += twice(i);
check('call', viaCall, 12);

// 5. Consts holding a bitwise result
function flagsOf(x: number): string {
  const low = x & 0xff;
  const shifted = (x >> 4) ^ 1;
  const out: string[] = [];
  out.push(`${low}`);
  out.push(`${low === 3}`);
  out.push(`${low * 1.5}`);
  out.push(`${0 - low}`);
  out.push(`${shifted | low}`);
  out.push(`${shifted / 4}`);
  return out.join(' ');
}
check('flags 3', flagsOf(3), '3 true 4.5 -3 3 0.25');
check('flags 0', flagsOf(0), '0 false 0 0 1 0.25');
check('flags fraction', flagsOf(2.9), '2 false 3 -2 3 0.25');
check('flags negative', flagsOf(-300), '212 false 318 -212 -4 -5');
check('flags big', flagsOf(2 ** 32 + 5), '5 false 7.5 -5 5 0.25');
let negLow = 1;
{
  const zero = 7 & 8;
  negLow = -zero;
}
check('const negative zero', negLow, -0);

// 6. A loop bound that grows while the loop runs
const grow = [1, 2, 3];
let seen = 0;
for (let i = 0; i < grow.length; i++) {
  if (grow[i] < 3) grow.push(grow[i] + 10);
  seen++;
}
check('growing bound', seen, 5);
console.log('ok');
