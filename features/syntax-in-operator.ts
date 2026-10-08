const o: Record<string, number> = { a: 1 };
assert('a' in o && !('b' in o), 'in');
