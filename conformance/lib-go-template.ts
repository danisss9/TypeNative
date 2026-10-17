import * as template from 'go:text/template';
import * as bytes from 'go:bytes';

const t = template.Must(template.New('hi').Parse('Hello, {{.}}!'));
const buf = new bytes.Buffer();
t.Execute(buf, 'bob');
assert(buf.String() === 'Hello, bob!', 'template execute');

let threw = '';
try {
  template.New('bad').Parse('{{.unclosed');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'template parse error throws');
