// go:sort and go:slices — sorting and slice helpers on JS arrays
import { Float64s, Strings, Float64sAreSorted, StringsAreSorted, SearchStrings } from 'go:sort';
import { Sort, Contains, Index, Equal, Max, Min, Reverse, Clone, Concat, Compact, IsSorted, Compare } from 'go:slices';

const nums = [3.5, 1.2, 2.8];
Float64s(nums);
assert(Float64sAreSorted(nums), 'Float64s sorted');
assert(nums[0] === 1.2 && nums[2] === 3.5, 'Float64s in place');

const words = ['pear', 'apple', 'fig'];
Strings(words);
assert(StringsAreSorted(words), 'Strings sorted');
assert(SearchStrings(words, 'fig') === 1, 'SearchStrings');

const a = [5, 3, 1, 4, 2];
Sort(a);
assert(a[0] === 1 && a[4] === 5, 'slices.Sort');
assert(IsSorted(a), 'slices.IsSorted');
assert(Contains(a, 4) && !Contains(a, 9), 'slices.Contains');
assert(Index(a, 3) === 2 && Index(a, 42) === -1, 'slices.Index');
assert(Equal(a, [1, 2, 3, 4, 5]), 'slices.Equal');
assert(Max(a) === 5 && Min(a) === 1, 'slices.Max/Min');

Reverse(a);
assert(a[0] === 5 && a[4] === 1, 'slices.Reverse');

const c = Clone(a);
c[0] = 99;
assert(a[0] === 5, 'slices.Clone is a copy');

const cat = Concat(a, c);
assert(cat.length === 10, 'slices.Concat');

const dup = [1, 1, 2, 3, 3];
assert(Compact(dup).length === 3, 'slices.Compact');
console.log('go-sort-slices ok');
