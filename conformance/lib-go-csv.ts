import * as csv from 'go:encoding/csv';
import * as strings from 'go:strings';

const r = csv.NewReader(strings.NewReader('a,b\nc,d\n'));
const rows = r.ReadAll();
assert(rows.length === 2, 'ReadAll throw-on-tuple');
assert(rows[0][0] === 'a' && rows[1][1] === 'd', 'csv cells');
