import { env } from 'node:process';

process.env.TN_PROBE = 'one';
assert(process.env.TN_PROBE === 'one' && env.TN_PROBE === 'one', 'env write / read');
assert('TN_PROBE' in process.env, 'in env');
env['TN_PROBE_2'] = 'two';
assert(process.env['TN_PROBE_2'] === 'two', 'element write');
assert(Object.keys(process.env).includes('TN_PROBE'), 'Object.keys(process.env)');
delete process.env.TN_PROBE;
assert(!('TN_PROBE' in process.env), 'delete env');
