// A generator resumes only after the for…of body ran for its last value
const log: string[] = [];
let state = 0;
function* gen(): Generator<number> { for (let i = 0; i < 3; i++) { log.push('g' + i + ':' + state); yield i; } }
function* outer(): Generator<number> { yield* gen(); yield 99; }
for (const v of gen()) { state = v * 10; log.push('b' + v); if (v === 0) continue; }
for (const v of outer()) { if (v === 1) break; log.push('o' + v); }
console.log(log.join(' '));
assert(log.join(' ') === 'g0:0 b0 g1:0 b1 g2:10 b2 g0:20 o0 g1:20', 'lockstep');
