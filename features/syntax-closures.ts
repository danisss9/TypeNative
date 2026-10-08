function counter() { let c = 0; return () => ++c; }
const inc = counter();
inc();
assert(inc() === 2, 'closure');
