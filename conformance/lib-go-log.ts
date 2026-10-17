import * as log from 'go:log';
import * as slog from 'go:log/slog';

log.SetFlags(0);
assert(true, 'log smoke');

slog.Info('hello');
assert(true, 'slog smoke');
