import * as slices from 'go:slices';
import * as cmp from 'go:cmp';

const nums = [3, 1, 2];
slices.Sort(nums);
assert(slices.Equal(nums, [1, 2, 3]) === true, 'Sort mutates');

assert(slices.Contains(nums, 2) === true, 'Contains');
assert(slices.Index(nums, 3) === 2, 'Index');
assert(slices.Min(nums) === 1, 'Min');
assert(slices.Max(nums) === 3, 'Max');
assert(cmp.Compare(1, 2) === -1, 'Compare');

const doubled = slices.Clone(nums);
assert(slices.Equal(doubled, [1, 2, 3]) === true, 'Clone');
