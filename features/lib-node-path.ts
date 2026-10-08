import { join, basename, extname } from 'node:path';
assert(basename(join('a', 'b.txt')) === 'b.txt' && extname('x.ts') === '.ts', 'path');
