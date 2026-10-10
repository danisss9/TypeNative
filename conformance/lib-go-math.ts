// go:math — functions and constants
import { Abs, Ceil, Floor, Sqrt, Pow, Max, Min, Mod, Trunc, Round, Signbit, IsNaN, IsInf, Inf, Hypot, Log2, Exp2, Cos, Sin, Atan2, NaN } from 'go:math';
import { Pi, E, MaxInt32, MinInt32, MaxUint8, Sqrt2 } from 'go:math';

assert(Abs(-2.5) === 2.5, 'Abs');
assert(Ceil(1.2) === 2 && Floor(1.8) === 1 && Trunc(1.9) === 1, 'Ceil/Floor/Trunc');
assert(Sqrt(16) === 4, 'Sqrt');
assert(Pow(2, 10) === 1024, 'Pow');
assert(Max(1, 2) === 2 && Min(1, 2) === 1, 'Max/Min');
assert(Mod(7, 3) === 1, 'Mod');
assert(Round(2.5) === 3 && Round(2.4) === 2, 'Round');
assert(Signbit(-1) && !Signbit(1), 'Signbit');
assert(IsNaN(NaN()) && !IsNaN(1), 'IsNaN');
assert(IsInf(Inf(1), 1), 'IsInf/Inf');
assert(Hypot(3, 4) === 5, 'Hypot');
assert(Log2(8) === 3 && Exp2(3) === 8, 'Log2/Exp2');
assert(Cos(0) === 1 && Sin(0) === 0, 'Cos/Sin');
assert(Atan2(1, 0) === Pi / 2, 'Atan2');

assert(Pi > 3.14159 && Pi < 3.14160, 'Pi');
assert(E > 2.718 && E < 2.719, 'E');
assert(MaxInt32 === 2147483647, 'MaxInt32');
assert(MinInt32 === -2147483648, 'MinInt32');
assert(MaxUint8 === 255, 'MaxUint8');
assert(Sqrt2 > 1.414 && Sqrt2 < 1.415, 'Sqrt2');
console.log('go-math ok');
