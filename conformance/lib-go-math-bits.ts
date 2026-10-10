// go:math/bits — bit counting and manipulation
import { OnesCount, OnesCount8, OnesCount32, OnesCount64, LeadingZeros, TrailingZeros, Len, Reverse, Reverse32, ReverseBytes32, RotateLeft32 } from 'go:math/bits';

assert(OnesCount(255) === 8, 'OnesCount');
assert(OnesCount8(0b1011) === 3, 'OnesCount8');
assert(OnesCount32(0xffffffff) === 32, 'OnesCount32');
assert(OnesCount64(9223372036854775808) === 1, 'OnesCount64');
assert(LeadingZeros(1) === 63 || LeadingZeros(1) === 31, 'LeadingZeros');
assert(TrailingZeros(8) === 3, 'TrailingZeros');
assert(Len(0b100000) === 6, 'Len');
assert(Reverse32(1) === 0x80000000, 'Reverse32');
assert(ReverseBytes32(0x01020304) === 0x04030201, 'ReverseBytes32');
assert(RotateLeft32(1, 4) === 16, 'RotateLeft32');
console.log('go-math-bits ok');
