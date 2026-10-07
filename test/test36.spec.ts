// Arithmetic incl. modulo (Go's % is integer-only; numbers are float64)
const n = 17;
assert(n % 5 === 2, `mod failed: ${n % 5}`);
assert(!(n % 2 === 0), 'parity failed');
assert(Math.floor(n / 5) === 3, 'div failed');

let acc = 10;
acc %= 3;
assert(acc === 1, `%= failed: ${acc}`);
