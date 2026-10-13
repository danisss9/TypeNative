const base = (): number => 10;
enum E { A = base(), B = 's', C = 2 * 3 }
assert(E.A === 10 && E.B === 's' && E.C === 6, 'computed / heterogeneous enum');
