// conformance-flags: --cover
import * as coverage from 'go:runtime/coverage';
import * as bytes from 'go:bytes';
import * as os from 'go:os';

// Built with --cover, so the meta-data and counters are there to write.
const meta = new bytes.Buffer();
coverage.WriteMeta(meta);
assert(meta.Len() > 0, 'WriteMeta');

const counters = new bytes.Buffer();
coverage.WriteCounters(counters);
assert(counters.Len() > 0, 'WriteCounters');

// --cover uses atomic counters, which ClearCounters needs.
coverage.ClearCounters();

const dir = os.MkdirTemp('', 'tncover');
coverage.WriteMetaDir(dir);
coverage.WriteCountersDir(dir);
assert(os.ReadDir(dir).length >= 2, 'WriteMetaDir / WriteCountersDir');
os.RemoveAll(dir);
