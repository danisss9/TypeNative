// process.on('uncaughtException' | 'uncaughtExceptionMonitor' |
// 'unhandledRejection' | 'beforeExit'), process.cpuUsage / resourceUsage /
// availableMemory / constrainedMemory; os.totalmem / freemem / uptime /
// loadavg / release / version; perf_hooks PerformanceObserver, timerify,
// createHistogram, monitorEventLoopDelay, eventLoopUtilization.
import { defineClass, defineHelper, setResults } from './registry.js';
const uncaughtHelper = `// process.on('uncaughtException') & co.
func tnHandleUncaught(err interface{}) bool {
	if tnProcessEmitter.listenerCount("uncaughtExceptionMonitor") > 0 {
		tnProcessEmitter.emit("uncaughtExceptionMonitor", err, "uncaughtException")
	}
	if tnProcessEmitter.listenerCount("uncaughtException") == 0 {
		return false
	}
	tnProcessEmitter.emit("uncaughtException", err, "uncaughtException")
	return true
}

// A throw out of the top-level code
func TnMainRecover() {
	if r := recover(); r != nil {
		if !tnHandleUncaught(r) {
			panic(r)
		}
	}
}

func init() {
	tnUncaughtHook = tnHandleUncaught
	tnUnhandledHook = func(reason interface{}) bool {
		if tnProcessEmitter.listenerCount("unhandledRejection") > 0 {
			tnProcessEmitter.emit("unhandledRejection", reason, nil)
			return true
		}
		if tnProcessEmitter.listenerCount("uncaughtExceptionMonitor") > 0 {
			tnProcessEmitter.emit("uncaughtExceptionMonitor", reason, "unhandledRejection")
		}
		if tnProcessEmitter.listenerCount("uncaughtException") > 0 {
			tnProcessEmitter.emit("uncaughtException", reason, "unhandledRejection")
			return true
		}
		return false
	}
	// 'beforeExit' (with process.exitCode) each time the loop drains
	tnBeforeExitHook = func() bool {
		if tnProcessEmitter.listenerCount("beforeExit") == 0 {
			return false
		}
		tnProcessEmitter.emit("beforeExit", tnExitCode)
		return true
	}
}`;
const systemHelper = `// process / os resource figures
type TnCpuUsage struct {
	user   float64
	system float64
}

// Process CPU time in microseconds: /proc/self/stat on Linux, Go's runtime metrics elsewhere
func tnCpuTimes() (float64, float64) {
	if data, err := os.ReadFile("/proc/self/stat"); err == nil {
		fields := strings.Fields(string(data[strings.LastIndexByte(string(data), ')')+1:]))
		if len(fields) > 13 {
			utime, _ := strconv.ParseFloat(fields[11], 64)
			stime, _ := strconv.ParseFloat(fields[12], 64)
			return utime * 10000, stime * 10000
		}
	}
	samples := []metrics.Sample{{Name: "/cpu/classes/user:cpu-seconds"}, {Name: "/cpu/classes/total:cpu-seconds"}, {Name: "/cpu/classes/idle:cpu-seconds"}}
	metrics.Read(samples)
	value := func(s metrics.Sample) float64 {
		if s.Value.Kind() == metrics.KindFloat64 {
			return s.Value.Float64()
		}
		return 0
	}
	user := value(samples[0]) * 1e6
	system := (value(samples[1]) - value(samples[0]) - value(samples[2])) * 1e6
	if system < 0 {
		system = 0
	}
	return user, system
}

// process.cpuUsage(previous?)
func TnProcessCpuUsage(previous ...*TnCpuUsage) *TnCpuUsage {
	user, system := tnCpuTimes()
	u := &TnCpuUsage{user: math.Round(user), system: math.Round(system)}
	if len(previous) > 0 && previous[0] != nil {
		u.user -= previous[0].user
		u.system -= previous[0].system
	}
	return u
}

type TnResourceUsage struct {
	userCPUTime            float64
	systemCPUTime          float64
	maxRSS                 float64
	sharedMemorySize       float64
	unsharedDataSize       float64
	unsharedStackSize      float64
	minorPageFault         float64
	majorPageFault         float64
	swappedOut             float64
	fsRead                 float64
	fsWrite                float64
	ipcSent                float64
	ipcReceived            float64
	signalsCount           float64
	voluntaryContextSwitches   float64
	involuntaryContextSwitches float64
}

func TnProcessResourceUsage() *TnResourceUsage {
	user, system := tnCpuTimes()
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	r := &TnResourceUsage{userCPUTime: math.Round(user), systemCPUTime: math.Round(system), maxRSS: float64(ms.Sys) / 1024}
	if data, err := os.ReadFile("/proc/self/status"); err == nil {
		for _, line := range strings.Split(string(data), "\\n") {
			if strings.HasPrefix(line, "VmHWM:") {
				if f := strings.Fields(line); len(f) >= 2 {
					r.maxRSS, _ = strconv.ParseFloat(f[1], 64)
				}
			}
			if strings.HasPrefix(line, "voluntary_ctxt_switches:") {
				r.voluntaryContextSwitches, _ = strconv.ParseFloat(strings.TrimSpace(strings.TrimPrefix(line, "voluntary_ctxt_switches:")), 64)
			}
			if strings.HasPrefix(line, "nonvoluntary_ctxt_switches:") {
				r.involuntaryContextSwitches, _ = strconv.ParseFloat(strings.TrimSpace(strings.TrimPrefix(line, "nonvoluntary_ctxt_switches:")), 64)
			}
		}
	}
	return r
}

// Memory figures in bytes: /proc/meminfo on Linux, sysctl on macOS / BSD
func tnMemInfo(key string) float64 {
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, line := range strings.Split(string(data), "\\n") {
			if strings.HasPrefix(line, key+":") {
				f := strings.Fields(line)
				if len(f) >= 2 {
					n, _ := strconv.ParseFloat(f[1], 64)
					return n * 1024
				}
			}
		}
	}
	return -1
}

func tnSysctl(name string) string {
	if runtime.GOOS == "windows" {
		return ""
	}
	out, err := exec.Command("sysctl", "-n", name).Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func TnOsTotalmem() float64 {
	if total, _, ok := tnPlatformMemory(); ok {
		return total
	}
	if n := tnMemInfo("MemTotal"); n >= 0 {
		return n
	}
	if s := tnSysctl("hw.memsize"); s != "" {
		n, _ := strconv.ParseFloat(s, 64)
		return n
	}
	if s := tnSysctl("hw.physmem"); s != "" {
		n, _ := strconv.ParseFloat(s, 64)
		return n
	}
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	return float64(ms.Sys)
}

func TnOsFreemem() float64 {
	if _, free, ok := tnPlatformMemory(); ok {
		return free
	}
	if n := tnMemInfo("MemAvailable"); n >= 0 {
		return n
	}
	if s := tnSysctl("vm.page_free_count"); s != "" {
		pages, _ := strconv.ParseFloat(s, 64)
		size, _ := strconv.ParseFloat(tnSysctl("hw.pagesize"), 64)
		return pages * size
	}
	return 0
}

// Seconds since boot
func TnOsUptime() float64 {
	if n, ok := tnPlatformUptime(); ok {
		return n
	}
	if data, err := os.ReadFile("/proc/uptime"); err == nil {
		if f := strings.Fields(string(data)); len(f) > 0 {
			n, _ := strconv.ParseFloat(f[0], 64)
			return n
		}
	}
	// "{ sec = 1700000000, usec = 0 } ..."
	if s := tnSysctl("kern.boottime"); s != "" {
		if i := strings.Index(s, "sec = "); i >= 0 {
			rest := s[i+6:]
			if j := strings.IndexByte(rest, ','); j >= 0 {
				boot, _ := strconv.ParseInt(strings.TrimSpace(rest[:j]), 10, 64)
				return time.Since(time.Unix(boot, 0)).Seconds()
			}
		}
	}
	return 0
}

func TnOsLoadavg() []float64 {
	if data, err := os.ReadFile("/proc/loadavg"); err == nil {
		f := strings.Fields(string(data))
		if len(f) >= 3 {
			out := make([]float64, 3)
			for i := range out {
				out[i], _ = strconv.ParseFloat(f[i], 64)
			}
			return out
		}
	}
	// "{ 1.23 1.45 1.67 }"
	if s := tnSysctl("vm.loadavg"); s != "" {
		f := strings.Fields(strings.Trim(s, "{} "))
		if len(f) >= 3 {
			out := make([]float64, 3)
			for i := range out {
				out[i], _ = strconv.ParseFloat(f[i], 64)
			}
			return out
		}
	}
	return []float64{0, 0, 0}
}

func TnOsRelease() string {
	if data, err := os.ReadFile("/proc/sys/kernel/osrelease"); err == nil {
		return strings.TrimSpace(string(data))
	}
	if s := tnSysctl("kern.osrelease"); s != "" {
		return s
	}
	if runtime.GOOS == "windows" {
		if out, err := exec.Command("cmd", "/c", "ver").Output(); err == nil {
			s := string(out)
			if i := strings.Index(s, "Version "); i >= 0 {
				return strings.TrimRight(strings.TrimSpace(s[i+8:]), "]")
			}
		}
	}
	return ""
}

func TnOsVersion() string {
	if data, err := os.ReadFile("/proc/sys/kernel/version"); err == nil {
		return strings.TrimSpace(string(data))
	}
	if s := tnSysctl("kern.version"); s != "" {
		return strings.SplitN(s, "\\n", 2)[0]
	}
	return TnOsRelease()
}`;
const perfExtraHelper = `// perf_hooks: observers, timerify, histograms, event-loop delay
type TnPerformanceObserver struct {
	callback  interface{}
	types     map[string]bool
	buffer    []*TnPerformanceEntry
	scheduled bool
	active    bool
}

type TnPerformanceObserverEntryList struct {
	entries []*TnPerformanceEntry
}

var tnPerfObservers []*TnPerformanceObserver

func TnNewPerformanceObserver(callback interface{}) *TnPerformanceObserver {
	return &TnPerformanceObserver{callback: callback, types: map[string]bool{}}
}

// observe({ entryTypes } | { type, buffered })
func (o *TnPerformanceObserver) observe(options interface{}) {
	if types := TnGet(options, "entryTypes"); types != nil {
		rv := reflect.ValueOf(types)
		if rv.Kind() == reflect.Pointer {
			rv = rv.Elem()
		}
		for i := 0; i < rv.Len(); i++ {
			o.types[TnJSString(rv.Index(i).Interface())] = true
		}
	}
	if t, ok := TnGet(options, "type").(string); ok {
		o.types[t] = true
		if buffered, _ := TnGet(options, "buffered").(bool); buffered {
			for _, e := range TnPerfEntries("", t) {
				o.queue(e)
			}
		}
	}
	if !o.active {
		o.active = true
		tnPerfObservers = append(tnPerfObservers, o)
	}
}

func (o *TnPerformanceObserver) disconnect() {
	o.active = false
	o.buffer = nil
	kept := []*TnPerformanceObserver{}
	for _, other := range tnPerfObservers {
		if other != o {
			kept = append(kept, other)
		}
	}
	tnPerfObservers = kept
}

// Buffered entries, ordered by startTime
func (o *TnPerformanceObserver) takeRecords() []*TnPerformanceEntry {
	out := o.buffer
	o.buffer = nil
	sort.SliceStable(out, func(i, j int) bool { return out[i].startTime < out[j].startTime })
	return out
}

// Entries reach the callback in batches, after the current code
func (o *TnPerformanceObserver) queue(e *TnPerformanceEntry) {
	o.buffer = append(o.buffer, e)
	if o.scheduled {
		return
	}
	o.scheduled = true
	TnLoopPost(func() {
		o.scheduled = false
		if !o.active || len(o.buffer) == 0 {
			return
		}
		list := &TnPerformanceObserverEntryList{entries: o.takeRecords()}
		TnInvoke(o.callback, list, o)
	})
}

func tnPerfNotify(e *TnPerformanceEntry) {
	for _, o := range tnPerfObservers {
		if o.types[e.entryType] {
			o.queue(e)
		}
	}
}

func (l *TnPerformanceObserverEntryList) getEntries() []*TnPerformanceEntry {
	return append([]*TnPerformanceEntry{}, l.entries...)
}

func (l *TnPerformanceObserverEntryList) getEntriesByName(name string, entryType ...string) []*TnPerformanceEntry {
	out := []*TnPerformanceEntry{}
	for _, e := range l.entries {
		if e.name == name && (len(entryType) == 0 || entryType[0] == "" || e.entryType == entryType[0]) {
			out = append(out, e)
		}
	}
	return out
}

func (l *TnPerformanceObserverEntryList) getEntriesByType(entryType string) []*TnPerformanceEntry {
	out := []*TnPerformanceEntry{}
	for _, e := range l.entries {
		if e.entryType == entryType {
			out = append(out, e)
		}
	}
	return out
}

func TnPerfObservedTypes() []string { return []string{"function", "mark", "measure"} }

func init() { tnPerfHook = tnPerfNotify }

// timerify(fn): fn, recording a 'function' entry per call
func TnPerfTimerify[F any](fn F, name string) F {
	fv := reflect.ValueOf(fn)
	wrapped := reflect.MakeFunc(fv.Type(), func(args []reflect.Value) []reflect.Value {
		start := TnPerfNow()
		var out []reflect.Value
		if fv.Type().IsVariadic() {
			out = fv.CallSlice(args)
		} else {
			out = fv.Call(args)
		}
		entry := &TnPerformanceEntry{name: name, entryType: "function", startTime: start, duration: TnPerfNow() - start}
		tnPerfMu.Lock()
		tnPerfEntries = append(tnPerfEntries, entry)
		tnPerfMu.Unlock()
		tnPerfNotify(entry)
		return out
	})
	return wrapped.Interface().(F)
}

// Histograms (createHistogram / monitorEventLoopDelay): values in nanoseconds
type TnHistogram struct {
	values   []float64
	exceeds  float64
	enabled  bool
	stop     chan struct{}
	interval float64
	last     time.Time
}

func TnCreateHistogram(options ...interface{}) *TnHistogram { return &TnHistogram{} }

func (h *TnHistogram) record(value interface{}) {
	switch v := value.(type) {
	case float64:
		h.values = append(h.values, v)
	case *tnbig.Int:
		f, _ := new(tnbig.Float).SetInt(v).Float64()
		h.values = append(h.values, f)
	}
}

func (h *TnHistogram) recordDelta() {
	now := time.Now()
	if !h.last.IsZero() {
		h.values = append(h.values, float64(now.Sub(h.last).Nanoseconds()))
	}
	h.last = now
}

func (h *TnHistogram) sorted() []float64 {
	out := append([]float64{}, h.values...)
	sort.Float64s(out)
	return out
}

func (h *TnHistogram) Get_count() float64 { return float64(len(h.values)) }
func (h *TnHistogram) Get_min() float64 {
	if len(h.values) == 0 {
		return 9223372036854776000
	}
	return h.sorted()[0]
}
func (h *TnHistogram) Get_max() float64 {
	if len(h.values) == 0 {
		return 0
	}
	s := h.sorted()
	return s[len(s)-1]
}
func (h *TnHistogram) Get_mean() float64 {
	if len(h.values) == 0 {
		return math.NaN()
	}
	sum := 0.0
	for _, v := range h.values {
		sum += v
	}
	return sum / float64(len(h.values))
}
func (h *TnHistogram) Get_stddev() float64 {
	if len(h.values) == 0 {
		return math.NaN()
	}
	mean := h.Get_mean()
	sum := 0.0
	for _, v := range h.values {
		sum += (v - mean) * (v - mean)
	}
	return math.Sqrt(sum / float64(len(h.values)))
}
func (h *TnHistogram) Get_exceeds() float64 { return h.exceeds }

func (h *TnHistogram) percentile(p float64) float64 {
	if len(h.values) == 0 {
		return 0
	}
	s := h.sorted()
	i := int(math.Ceil(p/100*float64(len(s)))) - 1
	if i < 0 {
		i = 0
	}
	if i >= len(s) {
		i = len(s) - 1
	}
	return s[i]
}

func (h *TnHistogram) Get_percentiles() *TnMap[float64, float64] {
	m := TnNewMap[float64, float64]()
	for _, p := range []float64{0, 50, 75, 87.5, 93.75, 96.875, 98.4375, 99.21875, 100} {
		m.Set(p, h.percentile(p))
	}
	return m
}

func (h *TnHistogram) reset() {
	h.values = nil
	h.exceeds = 0
}

// monitorEventLoopDelay({ resolution }): samples how late a timer fires on the loop
func TnMonitorEventLoopDelay(options ...interface{}) *TnHistogram {
	h := &TnHistogram{interval: 10}
	if len(options) > 0 && options[0] != nil {
		if n, ok := TnGet(options[0], "resolution").(float64); ok && n > 0 {
			h.interval = n
		}
	}
	return h
}

func (h *TnHistogram) enable() bool {
	if h.enabled {
		return false
	}
	h.enabled = true
	h.stop = make(chan struct{})
	stop := h.stop
	period := time.Duration(h.interval * float64(time.Millisecond))
	go func() {
		ticker := time.NewTicker(period)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case expected := <-ticker.C:
				TnLoopPost(func() {
					if h.enabled {
						h.values = append(h.values, math.Max(float64(time.Since(expected).Nanoseconds()), 1))
					}
				})
			}
		}
	}()
	return true
}

func (h *TnHistogram) disable() bool {
	if !h.enabled {
		return false
	}
	h.enabled = false
	close(h.stop)
	return true
}

// eventLoopUtilization(): idle / active time of the loop (approximate: CPU time)
type TnLoopUtilization struct {
	idle        float64
	active      float64
	utilization float64
}

func TnEventLoopUtilization(previous ...*TnLoopUtilization) *TnLoopUtilization {
	user, system := tnCpuTimes()
	active := (user + system) / 1000
	elapsed := TnPerfNow()
	idle := math.Max(elapsed-active, 0)
	u := &TnLoopUtilization{idle: idle, active: math.Min(active, elapsed)}
	if len(previous) > 0 && previous[0] != nil {
		u.idle -= previous[0].idle
		u.active -= previous[0].active
	}
	if total := u.idle + u.active; total > 0 {
		u.utilization = u.active / total
	}
	return u
}`;
// Memory and uptime from the OS API where there's no /proc or sysctl
// (Windows); the helper is picked per target OS (nodeSystemOS@os)
const windowsSystemHelper = `// GlobalMemoryStatusEx's MEMORYSTATUSEX
type tnMemoryStatusEx struct {
	length               uint32
	memoryLoad           uint32
	totalPhys            uint64
	availPhys            uint64
	totalPageFile        uint64
	availPageFile        uint64
	totalVirtual         uint64
	availVirtual         uint64
	availExtendedVirtual uint64
}

var tnKernel32 = syscall.NewLazyDLL("kernel32.dll")
var tnGlobalMemoryStatusEx = tnKernel32.NewProc("GlobalMemoryStatusEx")
var tnGetTickCount64 = tnKernel32.NewProc("GetTickCount64")

// Total and available physical memory in bytes
func tnPlatformMemory() (float64, float64, bool) {
	status := tnMemoryStatusEx{}
	status.length = uint32(unsafe.Sizeof(status))
	if ok, _, _ := tnGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&status))); ok == 0 {
		return 0, 0, false
	}
	return float64(status.totalPhys), float64(status.availPhys), true
}

// Seconds since boot
func tnPlatformUptime() (float64, bool) {
	ms, _, _ := tnGetTickCount64.Call()
	return float64(ms) / 1000, true
}`;
const otherSystemHelper = `// /proc or sysctl answer instead (TnOsTotalmem / TnOsFreemem / TnOsUptime)
func tnPlatformMemory() (float64, float64, bool) {
	return 0, 0, false
}

func tnPlatformUptime() (float64, bool) {
	return 0, false
}`;
export function registerSystemExtra(r) {
    defineHelper(r, 'nodeUncaught', [], ['nodeEvents', 'nodeProcess', 'eventLoop', 'promise'], uncaughtHelper);
    defineHelper(r, 'nodeSystemOS@windows', ['syscall', 'unsafe'], [], windowsSystemHelper);
    defineHelper(r, 'nodeSystemOS@other', [], [], otherSystemHelper);
    defineHelper(r, 'nodeSystem', ['math', 'os', 'os/exec', 'runtime', 'runtime/metrics', 'strconv', 'strings', 'time'], ['nodeSystemOS@os'], systemHelper);
    defineHelper(r, 'nodePerfExtra', ['math', 'math/big', 'reflect', 'sort', 'time'], ['nodePerf', 'nodeSystem', 'eventLoop', 'nodeInvoke', 'dynamic', 'orderedMap'], perfExtraHelper);
    // process events handled by the loop
    for (const name of ['process.on', 'process.once', 'process.addListener']) {
        const base = r.functions[name];
        r.functions[name] = (call) => {
            const event = call.nodes[0];
            const text = event && event.kind === 'StringLiteral' ? String(event.text) : '';
            if (text === 'uncaughtException' || text === 'uncaughtExceptionMonitor' || text === 'unhandledRejection' || text === 'beforeExit') {
                r.helper('nodeUncaught');
            }
            return base(call);
        };
    }
    const baseTyper = r.paramTypers['process.on'];
    r.paramTypers['process.on'] = (nodes) => {
        const event = nodes[0];
        const text = event && event.kind === 'StringLiteral' ? String(event.text) : '';
        if (text === 'uncaughtException' || text === 'uncaughtExceptionMonitor')
            return ['interface{}', 'string'];
        if (text === 'unhandledRejection')
            return ['interface{}', 'interface{}'];
        if (text === 'beforeExit')
            return ['float64'];
        return baseTyper(nodes);
    };
    r.paramTypers['process.once'] = r.paramTypers['process.on'];
    // process resource figures
    defineClass(r, 'process.CpuUsage', '*TnCpuUsage', 'class', '', 'user=float64; system=float64', '', '');
    defineClass(r, 'process.ResourceUsage', '*TnResourceUsage', 'class', '', 'userCPUTime=float64; systemCPUTime=float64; maxRSS=float64; sharedMemorySize=float64; unsharedDataSize=float64; unsharedStackSize=float64; minorPageFault=float64; majorPageFault=float64; swappedOut=float64; fsRead=float64; fsWrite=float64; ipcSent=float64; ipcReceived=float64; signalsCount=float64; voluntaryContextSwitches=float64; involuntaryContextSwitches=float64', '', '');
    const fn = (key, result, helper, emit) => {
        r.functions[key] = (c) => {
            r.helper(helper);
            return emit(c);
        };
        if (result)
            r.results[key] = result;
    };
    fn('process.cpuUsage', '*TnCpuUsage', 'nodeSystem', (c) => `TnProcessCpuUsage(${c.args.join(', ')})`);
    fn('process.resourceUsage', '*TnResourceUsage', 'nodeSystem', (_c) => 'TnProcessResourceUsage()');
    fn('process.availableMemory', 'float64', 'nodeSystem', (_c) => 'TnOsFreemem()');
    fn('process.constrainedMemory', 'float64', 'nodeSystem', (_c) => 'float64(0)');
    // os
    fn('os.totalmem', 'float64', 'nodeSystem', (_c) => 'TnOsTotalmem()');
    fn('os.freemem', 'float64', 'nodeSystem', (_c) => 'TnOsFreemem()');
    fn('os.uptime', 'float64', 'nodeSystem', (_c) => 'TnOsUptime()');
    fn('os.loadavg', '[]float64', 'nodeSystem', (_c) => 'TnOsLoadavg()');
    fn('os.release', 'string', 'nodeSystem', (_c) => 'TnOsRelease()');
    fn('os.version', 'string', 'nodeSystem', (_c) => 'TnOsVersion()');
    // perf_hooks
    const perf = (name) => [`perf_hooks.${name}`, `globals.${name}`];
    defineClass(r, 'perf_hooks.PerformanceObserver', '*TnPerformanceObserver', 'class', 'observe=; disconnect=; takeRecords=[]*TnPerformanceEntry', '', '', '');
    defineClass(r, 'perf_hooks.PerformanceObserverEntryList', '*TnPerformanceObserverEntryList', 'class', 'getEntries=[]*TnPerformanceEntry; getEntriesByName=[]*TnPerformanceEntry; getEntriesByType=[]*TnPerformanceEntry', '', '', '');
    r.globals['PerformanceObserver'] = 'perf_hooks.PerformanceObserver';
    r.constructors['perf_hooks.PerformanceObserver'] = (c) => {
        r.helper('nodePerfExtra');
        return `TnNewPerformanceObserver(${c.args[0]})`;
    };
    r.paramTypers['perf_hooks.PerformanceObserver()'] = (_n) => ['*TnPerformanceObserverEntryList', '*TnPerformanceObserver'];
    r.functions['perf_hooks.PerformanceObserver.supportedEntryTypes'] = (_c) => 'TnPerfObservedTypes()';
    r.values['perf_hooks.PerformanceObserver.supportedEntryTypes'] = (_c) => {
        r.helper('nodePerfExtra');
        return 'TnPerfObservedTypes()';
    };
    r.valueTypes['perf_hooks.PerformanceObserver.supportedEntryTypes'] = '[]string';
    defineClass(r, 'perf_hooks.Histogram', '*TnHistogram', 'class', 'record=; recordDelta=; percentile=float64; reset=; enable=bool; disable=bool', '', 'count=float64; min=float64; max=float64; mean=float64; stddev=float64; exceeds=float64; percentiles=*TnMap[float64, float64]', '');
    for (const name of ['RecordableHistogram', 'IntervalHistogram'])
        r.classes[`perf_hooks.${name}`] = r.classes['perf_hooks.Histogram'];
    defineClass(r, 'perf_hooks.EventLoopUtilization', '*TnLoopUtilization', 'class', '', 'idle=float64; active=float64; utilization=float64', '', '');
    fn('perf_hooks.createHistogram', '*TnHistogram', 'nodePerfExtra', (c) => `TnCreateHistogram(${c.args.join(', ')})`);
    fn('perf_hooks.monitorEventLoopDelay', '*TnHistogram', 'nodePerfExtra', (c) => `TnMonitorEventLoopDelay(${c.args.join(', ')})`);
    for (const key of [...perf('performance.timerify'), 'perf_hooks.timerify']) {
        r.functions[key] = (c) => {
            r.helper('nodePerfExtra');
            const node = c.nodes[0];
            const name = node && node.kind === 'Identifier' ? String(node.text) : '';
            return `TnPerfTimerify(${c.args[0]}, ${JSON.stringify(name)})`;
        };
        r.typers[key] = (c) => c.types[0] || 'interface{}';
    }
    for (const key of perf('performance.eventLoopUtilization')) {
        fn(key, '*TnLoopUtilization', 'nodePerfExtra', (c) => `TnEventLoopUtilization(${c.args.join(', ')})`);
    }
    setResults(r, 'perf_hooks', '');
}
