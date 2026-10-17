import * as bytes from 'go:bytes';

assert(bytes.Contains([104, 105], [105]) === true, 'Contains');
assert(bytes.Count([1, 2, 1, 2], [1, 2]) === 2, 'Count');
assert(bytes.Equal([1, 2], [1, 2]) === true, 'Equal');

const upper = bytes.ToUpper([104, 105]);
assert(bytes.Equal(upper, [72, 73]) === true, 'ToUpper bytes');

const r = bytes.NewReader([104, 105]);
assert(r.Len() === 2, 'Reader.Len()');
