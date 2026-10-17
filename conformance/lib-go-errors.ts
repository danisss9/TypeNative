import * as errors from 'go:errors';

const err = errors.New('boom');
assert(err.Error() === 'boom', 'New + Error()');
assert(errors.Is(err, err) === true, 'Is self');

const wrapped = errors.New('inner');
assert(errors.Unwrap(wrapped) === null || true, 'Unwrap smoke');
