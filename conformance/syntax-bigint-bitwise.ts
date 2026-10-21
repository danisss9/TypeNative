// Bitwise and shift operators on bigints (two's complement, arbitrary width)
const a = 6n;
const b = 3n;
assert((a & b) === 2n && (a | b) === 7n && (a ^ b) === 5n, '& | ^');
assert((a << 4n) === 96n && (-17n >> 2n) === -5n, 'shifts round toward -Infinity');
assert(~a === -7n && -a === -6n, '~ and unary -');
let c = 0xffn;
c &= 0x0fn;
c <<= 2n;
assert(c === 60n, 'compound assignment');
assert(((1n << 70n) | 1n).toString() === '1180591620717411303425', 'beyond 64 bits');
