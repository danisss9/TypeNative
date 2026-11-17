// Number.MIN_SAFE_INTEGER / MAX_VALUE and the edges they describe
assert(Number.MIN_SAFE_INTEGER === -9007199254740991, 'MIN_SAFE_INTEGER');
assert(Number.MAX_VALUE === 1.7976931348623157e308, 'MAX_VALUE');
let max = Number.MAX_VALUE;
assert(max * 2 === Infinity, 'MAX_VALUE overflows to Infinity');
assert(Number.MIN_SAFE_INTEGER === -Number.MAX_SAFE_INTEGER, 'the safe range is symmetric');
assert(Number.isSafeInteger(Number.MIN_SAFE_INTEGER) && !Number.isSafeInteger(Number.MIN_SAFE_INTEGER - 1), 'MIN_SAFE_INTEGER is the last safe integer');
assert(Number.MIN_SAFE_INTEGER + 1 < Number.MIN_SAFE_INTEGER + 2, 'adding past MIN_SAFE_INTEGER still orders');
