const a = Array.from({ length: 3 }, (_, i) => i * 2);
assert(a.join() === '0,2,4', 'from');
