import * as sort from 'go:sort';
import * as slices from 'go:slices';

const nums = [3, 1, 2];
sort.Float64s(nums);
assert(slices.Equal(nums, [1, 2, 3]) === true, 'Float64s');

assert(sort.SearchFloat64s([1, 2, 3], 2) === 1, 'SearchFloat64s');
