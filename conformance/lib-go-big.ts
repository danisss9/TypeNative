import * as big from 'go:math/big';

// big.Int: exact integer arithmetic past 2^53.
const pow = new big.Int().Exp(big.NewInt(2), big.NewInt(100), null);
assert(pow.String() === '1267650600228229401496703205376', 'big.Int.Exp');
const [parsed, ok] = new big.Int().SetString('123456789012345678901234567890', 10);
assert(ok === true && parsed.Cmp(pow) < 0, 'big.Int.SetString / Cmp');
const sum = new big.Int().Add(parsed, big.NewInt(10));
assert(sum.String() === '123456789012345678901234567900', 'big.Int.Add');
const product = new big.Int().Mul(big.NewInt(1e9), big.NewInt(1e9));
assert(product.Text(16) === 'de0b6b3a7640000', 'big.Int.Mul / Text');
assert(big.NewInt(97).ProbablyPrime(20) === true, 'big.Int.ProbablyPrime');
assert(new big.Int().GCD(null, null, big.NewInt(12), big.NewInt(18)).Int64() === 6, 'big.Int.GCD');
assert(big.Jacobi(big.NewInt(2), big.NewInt(7)) === 1, 'big.Jacobi');

// big.Rat: exact fractions.
const third = big.NewRat(1, 3);
const half = new big.Rat().Add(third, big.NewRat(1, 6));
assert(half.String() === '1/2' && half.FloatString(3) === '0.500', 'big.Rat');

// big.Float: arbitrary precision.
const two = new big.Float().SetPrec(200).SetInt64(2);
const root = new big.Float().SetPrec(200).Sqrt(two);
assert(root.Text(102, 30) === '1.414213562373095048801688724210', `big.Float.Sqrt: ${root.Text(102, 30)}`);

let threw = '';
try {
  big.ParseFloat('nope', 10, 53, big.ToNearestEven);
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'big.ParseFloat error throws');
