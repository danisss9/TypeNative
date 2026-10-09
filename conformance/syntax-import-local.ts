// Import from other file
import { multiply } from './import-local-helper';

const product = multiply(3, 4);
assert(product === 12, `multiply failed: ${product}`);
