function f(x: number): string { switch (x) { case 1: return 'one'; case 2: case 3: return 'few'; default: return 'many'; } }
assert(f(1) === 'one' && f(3) === 'few' && f(9) === 'many', 'switch');
