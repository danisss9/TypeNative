// Number formatting
const pi = 3.14159;
assert(pi.toFixed(2) === '3.14', `toFixed(2) failed: ${pi.toFixed(2)}`);
assert(pi.toFixed(0) === '3', `toFixed(0) failed: ${pi.toFixed(0)}`);
const big = 1000;
assert(big.toString() === '1000', 'toString failed');
