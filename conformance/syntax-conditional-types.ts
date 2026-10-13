type IsString<T> = T extends string ? 'yes' : 'no';
const a: IsString<string> = 'yes';
assert(a === 'yes', 'conditional type');
