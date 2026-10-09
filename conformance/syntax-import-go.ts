// Import modules from gojs packages

// Named imports: Println/Sprintf resolve to fmt.Println/fmt.Sprintf
import { Println, Sprintf } from 'go:fmt';

// Default import: strconv package accessed as strconv.X
import strconv from 'go:strconv';

// Namespace import: strings package accessed as strings.X
import * as strings from 'go:strings';

Println('test24: module imports');

const msg = Sprintf('value=%v', 42);
assert(msg === 'value=42', `Sprintf failed: ${msg}`);

const upper = strings.ToUpper('hello');
assert(upper === 'HELLO', `ToUpper failed: ${upper}`);

const boolStr = strconv.FormatBool(true);
assert(boolStr === 'true', `FormatBool failed: ${boolStr}`);
