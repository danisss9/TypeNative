const r = [1, 2, 3].map((x) => x * 2).filter((x) => x > 2).reduce((s, x) => s + x, 0);
assert(r === 10, 'map filter reduce');
