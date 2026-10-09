let log = '';
try { throw new Error('x'); } catch { log += 'c'; } finally { log += 'f'; }
assert(log === 'cf', 'try');
