// Import from node lib
import { join } from 'node:path';

const result = join('a', 'b', 'c'); // should work without error
assert(result === 'a/b/c' || result === 'a\\b\\c', `path.join failed: ${result}`);
