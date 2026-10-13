function wrap<T = string>(v: T): T[] { return [v]; }
assert(wrap('a').length === 1, 'default type parameter');
