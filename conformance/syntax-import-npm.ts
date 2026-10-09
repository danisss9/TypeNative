// Import from other npm packages
import { sumNumbers, multiplyNumbers } from 'simple-test-package';

assert(sumNumbers(1, 2) === 3, `sumNumbers failed: ${sumNumbers(1, 2)}`);
assert(multiplyNumbers(3, 4) === 12, `multiplyNumbers failed: ${multiplyNumbers(3, 4)}`);
