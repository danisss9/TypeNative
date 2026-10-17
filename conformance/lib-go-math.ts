import * as math from 'go:math';

assert(math.Floor(3.7) === 3, 'Floor');
assert(math.Ceil(3.2) === 4, 'Ceil');
assert(math.Sqrt(16) === 4, 'Sqrt');
assert(math.Pow(2, 10) === 1024, 'Pow');
assert(math.Abs(-5) === 5, 'Abs');
assert(math.Max(3, 7) === 7, 'Max');
assert(math.Min(3, 7) === 3, 'Min');
assert(math.Pi > 3.14 && math.Pi < 3.15, 'Pi const');
assert(math.IsNaN(math.NaN()) === true, 'IsNaN');
