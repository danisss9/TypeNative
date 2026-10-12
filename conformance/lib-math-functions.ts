assert(Math.log(Math.E) === 1 && Math.log2(8) === 3 && Math.log10(100) === 2, 'logs');
assert(Math.abs(Math.sin(0)) < 1e-9 && Math.cos(0) === 1 && Math.tan(0) === 0, 'trig');
assert(Math.trunc(-2.7) === -2 && Math.sign(-3) === -1, 'trunc / sign');
