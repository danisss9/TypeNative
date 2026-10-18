// @ts-ignore TS1202: tsc rejects import = require() when targeting ES modules
import helper = require('./export-equals-helper');
assert(helper.twice(4) === 8, 'export = / import require');
