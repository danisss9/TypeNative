import * as bufio from 'go:bufio';
import * as bytes from 'go:bytes';
import * as strings from 'go:strings';

const r = bufio.NewReader(strings.NewReader('hello\nworld\n'));
const line = r.ReadString(10);
assert(line === 'hello\n', 'ReadString throw-on-tuple');

const w = bufio.NewWriter(new bytes.Buffer());
w.WriteString('hi');
w.Flush();
assert(true, 'Writer smoke');
