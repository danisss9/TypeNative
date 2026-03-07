// Import from other file
import { multiply } from './test25-export.spec';

const product = multiply(3, 4);
assert(product === 12, `multiply failed: ${product}`);
