// Bitwise operators and % take integer fast paths (TnInt32, TnMod); the
// results must stay exactly JS's on every edge: -0, NaN, Infinity, values
// past int32 and int64, fractions, and literal operands folded at compile time
function check(label: string, actual: number, expected: number): void {
  if (!Object.is(actual, expected)) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

const values = [0, -0, 1, -1, 2.9, -2.9, 255, 2147483647, 2147483648, -2147483648, -2147483649, 4294967295, 4294967296,
  4294967297.5, 1e10, -1e10, 9007199254740991, -9007199254740993, 1e19, -1e19, 1e300, NaN, Infinity, -Infinity];

// ToInt32 through every operator, against values computed in JS ahead of time
const expectOr = [0, 0, 1, -1, 2, -2, 255, 2147483647, -2147483648, -2147483648, 2147483647, -1, 0, 1, 1410065408, -1410065408,
  -1, 0, -1981284352, 1981284352, 0, 0, 0, 0];
for (let i = 0; i < values.length; i++) {
  const v = values[i];
  check(`${v} | 0`, v | 0, expectOr[i]);
  check(`${v} >>> 0`, v >>> 0, expectOr[i] >>> 0);
  check(`${v} & -1`, v & -1, expectOr[i]);
  check(`${v} ^ 0`, v ^ 0, expectOr[i]);
  check(`${v} << 1`, v << 1, (expectOr[i] * 2) | 0);
  check(`${v} >> 1`, v >> 1, Math.floor(expectOr[i] / 2));
}

// Literal operands (folded, including shifts that overflow int32 and counts past 31)
let one = 1;
check('1 << 31', 1 << 31, -2147483648);
check('one << 31', one << 31, -2147483648);
check('1 << 32', 1 << 32, 1);
check('one << 33', one << 33, 2);
check('-1 >>> 0', -1 >>> 0, 4294967295);
check('-1 >>> 28', -1 >>> 28, 15);
check('0xffffffff & 0xff', 0xffffffff & 0xff, 255);
check('0xffffffff | 0', 0xffffffff | 0, -1);
check('(-(3)) & 0xff', -3 & 0xff, 253);
check('5.7 & 3', 5.7 & 3, 1);
check('1_000_000 & 0xfff', 1_000_000 & 0xfff, 576);
let flags = 0;
flags |= 1 << 4;
flags |= 0x80000000;
check('flags', flags, -2147483632);
flags &= ~(1 << 4);
check('flags cleared', flags, -2147483648);
flags >>>= 31;
check('flags >>>=', flags, 1);

// Nested bitwise expressions stay int32/uint32 between operators
const big = 4294967295;
let x = 0x12345678;
check('literal-only nest', (1 << 4) | (1 << 7) | (0xffffffff >>> 4), 268435455);
check('literal-only unsigned nest', (0xffffffff >>> 0) & (-1 >>> 0), -1);
check('nested unsigned as int32', (big >>> 0) & 0xff, 255);
check('nested unsigned shift', ((x >>> 16) ^ x) >>> 0, 305419896 ^ 4660);
check('nested signed in >>>', ((x << 8) | 0xff) >>> 0, 878082303);
check('nested shift count', 1 << ((x >> 1) & 31), 1 << ((x >> 1) & 31));
check('nested shift count unsigned', 1 << (big >>> 27), -2147483648);
check('nested negation', ~(x & 0xff) & 0xffff, 65415);
check('mixed with arithmetic', ((x & 0xff) + (x >> 24)) | 0, 138);
x ^= (x << 13) | (x >>> 19);
check('xorshift step', x, -1728359362);

// % on integers, fractions and specials
const mods: [number, number, number][] = [
  [7, 3, 1], [-7, 3, -1], [7, -3, 1], [-7, -3, -1], [6, 3, 0], [-6, 3, -0], [-0, 5, -0], [0, -5, 0],
  [5, 0, NaN], [-5, 0, NaN], [0, 0, NaN], [NaN, 3, NaN], [3, NaN, NaN], [Infinity, 3, NaN], [3, Infinity, 3],
  [-3, -Infinity, -3], [5.5, 2, 1.5], [-5.5, 2, -1.5], [5, 2.5, 0], [1e19, 7, 1e19 % 7], [2 ** 62, 3, 1],
  [-(2 ** 62), 3, -1], [9007199254740991, 1000, 991], [2e8, 13, 2e8 % 13]
];
for (const [a, b, r] of mods) check(`${a} % ${b}`, a % b, r);
let acc = 100;
acc %= 7;
check('acc %= 7', acc, 2);
let neg = -14;
neg %= 7;
check('neg %= 7', neg, -0);
let sum = 0;
for (let i = -50; i < 50; i++) sum += (i * 31) % 13;
check('loop sum', sum, -3);
console.log('ok');
