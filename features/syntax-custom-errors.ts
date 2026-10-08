class MyErr extends Error {}
try { throw new MyErr('x'); } catch (e) { assert(e instanceof MyErr, 'custom error'); }
