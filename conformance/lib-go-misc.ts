import * as multipart from 'go:mime/multipart';
import * as bytes from 'go:bytes';
import * as signal from 'go:os/signal';
import * as os from 'go:os';

const w = multipart.NewWriter(new bytes.Buffer());
w.WriteField('key', 'value');
w.Close();
assert(w.Boundary() !== '', 'multipart boundary');

signal.Ignore(os.Interrupt);
assert(true, 'signal Ignore');
