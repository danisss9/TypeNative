import * as maps from 'go:maps';
import * as slices from 'go:slices';
import * as unique from 'go:unique';

// go:iter — iter.Seq / iter.Seq2 values consumed with for...of.
const seq = slices.Values([1, 2, 3]);
let total = 0;
for (const v of seq) total += v;
assert(total === 6, 'for...of iter.Seq');
assert(slices.Collect(seq).length === 3, 'slices.Collect(iter.Seq)');
let indexSum = 0;
let letters = '';
for (const [i, letter] of slices.All(['x', 'y', 'z'])) {
  indexSum += i;
  letters += letter;
}
assert(indexSum === 3 && letters === 'xyz', 'for...of iter.Seq2 [k, v]');

// maps over a Go map built by maps.Collect (index → letter).
const m = maps.Collect(slices.All(['a', 'b', 'c']));
const keys = slices.Sorted(maps.Keys(m));
assert(keys.length === 3 && keys[0] === 0 && keys[2] === 2, 'maps.Keys');
const values = slices.Sorted(maps.Values(m));
assert(values[1] === 'b', 'maps.Values');
let joined = '';
for (const letter of maps.Values(m)) joined += letter;
assert(joined.length === 3, 'for...of maps.Values');
const copy = maps.Clone(m);
assert(maps.Equal(m, copy) === true, 'maps.Clone / Equal');
maps.DeleteFunc(copy, (k: number, v: string) => v === 'a');
assert(maps.Equal(m, copy) === false && slices.Collect(maps.Keys(copy)).length === 2, 'maps.DeleteFunc');

// unique: equal values share a handle.
const h1 = unique.Make('typenative');
const h2 = unique.Make('typenative');
assert(h1 === h2, 'unique.Make canonical');
assert(h1.Value() === 'typenative', 'unique.Handle.Value');
