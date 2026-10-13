class P { readonly x: number = 1; }
const xs: readonly number[] = [1, 2];
assert(new P().x === 1 && xs.length === 2, 'readonly');
