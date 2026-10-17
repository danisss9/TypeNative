import * as bits from 'go:math/bits';
import * as bigrand from 'go:math/rand';
import * as randv2 from 'go:math/rand/v2';

assert(bits.OnesCount(7) === 3, 'OnesCount');
assert(bits.Len(8) === 4, 'Len');

assert(bigrand.Intn(100) >= 0 && bigrand.Intn(100) < 100, 'math/rand Intn');
assert(randv2.IntN(100) >= 0 && randv2.IntN(100) < 100, 'rand/v2 IntN');
