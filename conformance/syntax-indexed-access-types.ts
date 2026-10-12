interface User { name: string }
const n: User['name'] = 'x';
assert(n === 'x', 'indexed access type');
