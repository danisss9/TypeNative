function first<T>(xs: T[]): T { return xs[0]; }
assert(first([4, 5]) === 4 && first(['a']) === 'a', 'generic fn');
