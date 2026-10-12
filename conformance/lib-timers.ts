const t = setTimeout(() => { throw new Error('should not run'); }, 50);
clearTimeout(t);
assert(true, 'clearTimeout');
