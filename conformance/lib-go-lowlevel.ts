import * as weak from 'go:weak';
import * as structs from 'go:structs';
import * as syscall from 'go:syscall';
import * as os from 'go:os';
import * as bytes from 'go:bytes';

// weak: a weak pointer resolves while the value is alive.
const buf = new bytes.Buffer();
buf.WriteString('kept');
const wp = weak.Make(buf);
assert(wp.Value() !== null && wp.Value().String() === 'kept', 'weak.Pointer.Value');

// structs: the HostLayout marker is constructible.
const layout = new structs.HostLayout();
assert(layout !== null, 'structs.HostLayout');

// syscall: the portable subset.
assert(syscall.Getpid() === os.Getpid(), 'syscall.Getpid');
const [home, found] = syscall.Getenv('PATH');
assert(found === true && home.length > 0, 'syscall.Getenv');
