import * as sql from 'go:database/sql';
import * as driver from 'go:database/sql/driver';
import * as strings from 'go:strings';

// database/sql has no built-in driver: the registry is empty and Open
// fails cleanly.
assert(sql.Drivers().length === 0, 'sql.Drivers');
let threw = '';
try {
  sql.Open('nope', '');
} catch (e) {
  threw = (e as Error).message;
}
assert(strings.Contains(threw, 'unknown driver') === true, 'sql.Open unknown driver throws');
const arg = sql.Named('id', 7);
assert(arg.Name === 'id', 'sql.Named');
assert(sql.LevelSerializable.String() === 'Serializable', 'sql.IsolationLevel.String');

// database/sql/driver: value conversion rules.
assert(driver.IsValue('text') === true && driver.IsValue(new strings.Builder()) === false, 'driver.IsValue');
assert(driver.Bool.ConvertValue('true') === true, 'driver.Bool.ConvertValue');
assert(driver.String.ConvertValue(42) === '42', 'driver.String.ConvertValue');
