// class C extends Array: the instance is an array (index, length, push,
// iteration, Array.isArray) with the subclass's own fields and methods
class Seq extends Array<number> {
  label = 'seq';
  sum(): number {
    let total = 0;
    for (const n of this) total += n;
    return total;
  }
}
const seq = new Seq();
seq.push(1, 2, 3);
assert(seq.length === 3 && seq[1] === 2, 'index and length');
assert(seq.sum() === 6 && seq.label === 'seq', 'own members');
assert(Array.isArray(seq) && seq instanceof Seq && seq instanceof Array, 'an array and a Seq');
seq[0] = 10;
assert(seq.sum() === 15, 'element writes');
assert([...seq].join() === '10,2,3', 'spread');
console.log(seq.length, seq.sum(), seq.label);
