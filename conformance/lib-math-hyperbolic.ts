// Math.sinh / cosh / tanh / expm1 / log1p, with their identities
assert(Math.sinh(1).toFixed(6) === '1.175201' && Math.sinh(-1).toFixed(6) === '-1.175201', 'sinh');
assert(Math.cosh(1).toFixed(6) === '1.543081' && Math.cosh(-1) === Math.cosh(1), 'cosh');
assert(Math.tanh(1).toFixed(6) === '0.761594' && Math.tanh(-1).toFixed(6) === '-0.761594', 'tanh');
assert(Math.expm1(1).toFixed(6) === '1.718282' && Math.expm1(0) === 0, 'expm1');
assert(Math.log1p(1).toFixed(6) === '0.693147' && Math.log1p(0) === 0, 'log1p');

const c = Math.cosh(2);
const s = Math.sinh(2);
assert(Math.abs(c * c - s * s - 1) < 1e-12, 'cosh² − sinh² = 1');
assert(Math.abs(Math.log1p(Math.expm1(3)) - 3) < 1e-12, 'log1p(expm1(x)) = x');
