// go:math/big — NewInt + bigint arithmetic and comparisons through *big.Int
import { NewInt } from 'go:math/big';

const a = NewInt(1234567890);
const b = NewInt(987654321);
const sum = a + b;
const diff = a - b;
const prod = a * b;
const quot = a / b;

assert(sum === 2222222211n, `sum: ${sum}`);
assert(diff === 246913569n, `diff: ${diff}`);
assert(prod === 1219326311126352690n, `prod: ${prod}`);
assert(quot === 1n, `quot: ${quot}`);
assert(a > b && b < a, 'bigint compare');
assert(NewInt(-5) < NewInt(0), 'negative bigint');
console.log('go-math-big ok');
