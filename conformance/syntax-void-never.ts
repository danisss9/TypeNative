function log(): void { return; }
function fail(msg: string): never { throw new Error(msg); }
log();
let caught = false;
try { fail('x'); } catch { caught = true; }
assert(caught, 'never');
