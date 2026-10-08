const s = new Set<string>(['z', 'a', 'm']);
assert([...s].join('') === 'zam', 'set order');
