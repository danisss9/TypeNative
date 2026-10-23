import * as cmplx from 'go:math/cmplx';
import * as fmt from 'go:fmt';
import * as math from 'go:math';

// complex128 values have no TS type: they pass between cmplx calls opaquely
function near(a: number, b: number): boolean {
  return math.Abs(a - b) < 1e-9;
}

// 3+4i from polar form
const z = cmplx.Rect(5, math.Atan2(4, 3));
assert(near(cmplx.Abs(z), 5) && near(cmplx.Phase(z), math.Atan2(4, 3)), 'Rect / Abs / Phase');
assert(fmt.Sprintf('%.1f', z) === '(3.0+4.0i)', 'fmt formats complex values');
assert(near(cmplx.Phase(cmplx.Conj(z)), -math.Atan2(4, 3)), 'Conj');

// sqrt(-4) = 2i
const [r, theta] = cmplx.Polar(cmplx.Sqrt(cmplx.Rect(4, math.Pi)));
assert(near(r, 2) && near(theta, math.Pi / 2), 'Sqrt / Polar');

// Euler: e^(iπ) = -1
const euler = cmplx.Exp(cmplx.Rect(math.Pi, math.Pi / 2));
assert(near(cmplx.Abs(euler), 1) && near(math.Abs(cmplx.Phase(euler)), math.Pi), 'Exp');
assert(near(cmplx.Abs(cmplx.Log(euler)), math.Pi), 'Log');

// z² has |z|² and twice the angle
const squared = cmplx.Pow(z, cmplx.Rect(2, 0));
assert(near(cmplx.Abs(squared), 25) && near(cmplx.Phase(squared), 2 * math.Atan2(4, 3)), 'Pow');

// Inverse functions round-trip near the origin
const w = cmplx.Rect(0.5, 0.3);
for (const back of [
  cmplx.Asin(cmplx.Sin(w)),
  cmplx.Acos(cmplx.Cos(w)),
  cmplx.Atan(cmplx.Tan(w)),
  cmplx.Asinh(cmplx.Sinh(w))
]) {
  assert(near(cmplx.Abs(back), 0.5) && near(cmplx.Phase(back), 0.3), 'inverse trig round-trip');
}

assert(cmplx.IsNaN(cmplx.NaN()) && cmplx.IsInf(cmplx.Inf()) && !cmplx.IsInf(z), 'NaN / Inf');
