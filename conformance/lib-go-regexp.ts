import * as regexp from 'go:regexp';
import * as path from 'go:path/filepath';

const re = regexp.MustCompile('h(e)l+');
assert(re.MatchString('hello') === true, 'MatchString');
assert(re.FindString('hello') === 'hell', 'FindString throw-on-tuple');

const parts = re.FindStringSubmatch('hello');
assert(parts[1] === 'e', 'Submatch');

assert(path.Join('a', 'b') === 'a/b' || path.Join('a', 'b') === 'a\\b', 'filepath Join');
assert(path.Ext('x.tar.gz') === '.gz', 'Ext');

let threw = '';
try {
  regexp.Compile('([invalid');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'Compile error throws');
