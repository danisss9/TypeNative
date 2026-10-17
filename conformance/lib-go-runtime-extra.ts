import 'go:time/tzdata';
import * as metrics from 'go:runtime/metrics';
import * as pprof from 'go:runtime/pprof';
import * as trace from 'go:runtime/trace';
import * as user from 'go:os/user';
import * as buildinfo from 'go:debug/buildinfo';
import * as os from 'go:os';
import * as time from 'go:time';
import * as strings from 'go:strings';

// runtime/metrics.
assert(metrics.All().length > 10, 'metrics.All');
const samples = [new metrics.Sample({ Name: '/sched/goroutines:goroutines' })];
metrics.Read(samples);
assert(samples[0].Value.Kind() === metrics.KindUint64 && samples[0].Value.Uint64() >= 1, 'metrics.Read');

// runtime/pprof.
assert(pprof.Lookup('goroutine').Count() >= 1, 'pprof.Lookup goroutine');
assert(pprof.Profiles().length > 0, 'pprof.Profiles');

// runtime/trace: not tracing unless started.
assert(trace.IsEnabled() === false, 'trace.IsEnabled');

// time/tzdata: the embedded database backs LoadLocation.
const lisbon = time.LoadLocation('Europe/Lisbon');
assert(lisbon.String() === 'Europe/Lisbon', 'tzdata LoadLocation');

// os/user.
const me = user.Current();
assert(me.Username !== '' && me.HomeDir !== '', 'user.Current');

// debug/buildinfo: read this binary's own build info.
const info = buildinfo.ReadFile(os.Executable());
assert(strings.HasPrefix(info.GoVersion, 'go') === true, `buildinfo.ReadFile: ${info.GoVersion}`);
