class C { static count = 2; static double(): number { return C.count * 2; } }
assert(C.double() === 4, 'static');
