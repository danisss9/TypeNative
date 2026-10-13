const defaults = { retries: 3 };
const copy: typeof defaults = { retries: 5 };
assert(copy.retries === 5, 'type-level typeof');
