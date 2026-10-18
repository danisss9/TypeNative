// node:timers (+ globals setImmediate / clearImmediate), node:perf_hooks
// (+ the global performance), node:tty

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const perfHelper = `// node:perf_hooks — performance.now() is milliseconds since process start
var tnPerfStart = time.Now()

type TnPerformanceEntry struct {
	name      string
	entryType string
	startTime float64
	duration  float64
	detail    interface{}
}

var tnPerfEntries []*TnPerformanceEntry
var tnPerfMu sync.Mutex

// Set by PerformanceObserver: new entries reach the observers
var tnPerfHook func(e *TnPerformanceEntry)

// Go's monotonic clock on Windows advances only at the timer interrupt, so
// back-to-back readings repeat; each reading is kept later than the last
// (by 1ns) so marks taken in a row stay in call order, as with Node's clock
var tnPerfLast float64
var tnPerfClockMu sync.Mutex

func TnPerfNow() float64 {
	now := float64(time.Since(tnPerfStart).Nanoseconds()) / 1e6
	tnPerfClockMu.Lock()
	defer tnPerfClockMu.Unlock()
	if now <= tnPerfLast {
		now = tnPerfLast + 1e-6
	}
	tnPerfLast = now
	return now
}

func TnPerfTimeOrigin() float64 {
	return float64(tnPerfStart.UnixNano()) / 1e6
}

func TnPerfMark(name string, options ...interface{}) *TnPerformanceEntry {
	entry := &TnPerformanceEntry{name: name, entryType: "mark", startTime: TnPerfNow()}
	if len(options) > 0 && options[0] != nil {
		if t, ok := TnGet(options[0], "startTime").(float64); ok {
			entry.startTime = t
		}
		entry.detail = TnGet(options[0], "detail")
	}
	tnPerfMu.Lock()
	tnPerfEntries = append(tnPerfEntries, entry)
	tnPerfMu.Unlock()
	if tnPerfHook != nil {
		tnPerfHook(entry)
	}
	return entry
}

func tnPerfMarkTime(name string) float64 {
	tnPerfMu.Lock()
	defer tnPerfMu.Unlock()
	for i := len(tnPerfEntries) - 1; i >= 0; i-- {
		if tnPerfEntries[i].entryType == "mark" && tnPerfEntries[i].name == name {
			return tnPerfEntries[i].startTime
		}
	}
	panic(TnNodeError("SyntaxError", "ERR_INVALID_PERFORMANCE_MARK", "The \\""+name+"\\" performance mark has not been set"))
}

// measure(name, startMark?, endMark?)
func TnPerfMeasure(name string, marks ...interface{}) *TnPerformanceEntry {
	start, end := 0.0, TnPerfNow()
	if len(marks) > 0 {
		if s, ok := marks[0].(string); ok {
			start = tnPerfMarkTime(s)
		} else if marks[0] != nil {
			if s, ok := TnGet(marks[0], "start").(string); ok {
				start = tnPerfMarkTime(s)
			}
			if e, ok := TnGet(marks[0], "end").(string); ok {
				end = tnPerfMarkTime(e)
			}
		}
	}
	if len(marks) > 1 {
		if e, ok := marks[1].(string); ok {
			end = tnPerfMarkTime(e)
		}
	}
	entry := &TnPerformanceEntry{name: name, entryType: "measure", startTime: start, duration: end - start}
	tnPerfMu.Lock()
	tnPerfEntries = append(tnPerfEntries, entry)
	tnPerfMu.Unlock()
	if tnPerfHook != nil {
		tnPerfHook(entry)
	}
	return entry
}

func TnPerfEntries(name string, entryType string) []*TnPerformanceEntry {
	tnPerfMu.Lock()
	defer tnPerfMu.Unlock()
	out := []*TnPerformanceEntry{}
	for _, e := range tnPerfEntries {
		if (name == "" || e.name == name) && (entryType == "" || e.entryType == entryType) {
			out = append(out, e)
		}
	}
	return out
}

func TnPerfClear(entryType string, name ...string) {
	tnPerfMu.Lock()
	defer tnPerfMu.Unlock()
	kept := []*TnPerformanceEntry{}
	for _, e := range tnPerfEntries {
		if e.entryType == entryType && (len(name) == 0 || name[0] == "" || e.name == name[0]) {
			continue
		}
		kept = append(kept, e)
	}
	tnPerfEntries = kept
}`;

const timerPromisesHelper = `// node:timers/promises
func tnTimerSignal(options []interface{}) *TnAbortSignal {
	if len(options) > 0 && options[0] != nil {
		if s, ok := TnGet(options[0], "signal").(*TnAbortSignal); ok {
			return s
		}
	}
	return nil
}

// setTimeout(ms, value, { signal }): resolves with value after ms
func TnTimeoutPromise[T any](ms float64, value T, options ...interface{}) chan T {
	ch := make(chan T, 1)
	signal := tnTimerSignal(options)
	if signal != nil && signal.aborted {
		TnReject(ch, signal.reason)
		return ch
	}
	var timer *TnTimeout
	settled := false
	timer = TnSetTimeout(ms, func() {
		if !settled {
			settled = true
			ch <- value
		}
	})
	if signal != nil {
		signal.addEventListener("abort", func(ev *TnEvent) {
			if !settled {
				settled = true
				TnClearTimeout(timer)
				TnReject(ch, signal.reason)
			}
		})
	}
	return ch
}

// setInterval(ms, value): an async iterator yielding value every ms (does not
// keep the process alive once the consumer stops)
func TnIntervalIterator[T any](ms float64, value T) chan T {
	ch := make(chan T)
	go func() {
		ticker := time.NewTicker(max(time.Duration(ms*float64(time.Millisecond)), time.Millisecond))
		defer ticker.Stop()
		for range ticker.C {
			ch <- value
		}
	}()
	return ch
}`;

export function registerTimers(r: NodeRegistry): void {
  defineModule(r, 'timers/promises');
  defineHelper(r, 'timerPromises', ['time'], ['timerWait', 'promise', 'nodeEvents', 'dynamic'], timerPromisesHelper);
  r.namespaces['timers.promises'] = 'timers/promises';
  r.objects['timers/promises.scheduler'] = true;
  const promiseValue = (c: NodeCall, index: number) => (c.args.length > index ? c.args[index] : 'interface{}(nil)');
  const valueType = (c: NodeCall, index: number) => (c.nodes.length > index ? c.types[index] || 'interface{}' : 'interface{}');
  const promiseTimer = (name: string, delay: (c: NodeCall) => string, valueIndex: number) => {
    r.functions[`timers/promises.${name}`] = (call: NodeCall) => {
      r.helper('timerPromises');
      const options = call.args.length > valueIndex + 1 ? `, ${call.args[valueIndex + 1]}` : '';
      return `TnTimeoutPromise(${delay(call)}, ${promiseValue(call, valueIndex)}${options})`;
    };
    r.typers[`timers/promises.${name}`] = (call: NodeCall) => `chan ${valueType(call, valueIndex)}`;
  };
  promiseTimer('setTimeout', (c: NodeCall) => c.args[0] ?? '0', 1);
  promiseTimer('setImmediate', (_c: NodeCall) => '0', 0);
  r.functions['timers/promises.setInterval'] = (call: NodeCall) => {
    r.helper('timerPromises');
    return `TnIntervalIterator(${call.args[0] ?? '0'}, ${promiseValue(call, 1)})`;
  };
  r.typers['timers/promises.setInterval'] = (call: NodeCall) => `chan ${valueType(call, 1)}`;
  r.functions['timers/promises.scheduler.wait'] = (call: NodeCall) => {
    r.helper('timerPromises');
    return `TnTimeoutPromise(${call.args[0] ?? '0'}, interface{}(nil)${call.args[1] ? `, ${call.args[1]}` : ''})`;
  };
  r.functions['timers/promises.scheduler.yield'] = (_c: NodeCall) => {
    r.helper('timerPromises');
    return 'TnTimeoutPromise(0, interface{}(nil))';
  };
  setResults(r, 'timers/promises', 'scheduler.wait=chan interface{}; scheduler.yield=chan interface{}');

  defineModule(r, 'timers');
  // setTimeout(cb, ms, ...args) / setInterval / setImmediate
  const callback = (call: NodeCall, argsFrom: number) => {
    const extra = call.args.slice(argsFrom).join(', ');
    return `func() { (${call.args[0]})(${extra}) }`;
  };
  const timer = (name: string, emit: (call: NodeCall) => string, result: string) => {
    r.functions[`timers.${name}`] = (call: NodeCall) => {
      r.helper('timerWait');
      return emit(call);
    };
    r.results[`timers.${name}`] = result;
  };
  timer('setTimeout', (c: NodeCall) => `TnSetTimeout(${c.args[1] ?? '0'}, ${callback(c, 2)})`, '*TnTimeout');
  timer('clearTimeout', (c: NodeCall) => `TnClearTimeout(${c.args[0]})`, '');
  timer('setInterval', (c: NodeCall) => `TnSetInterval(${c.args[1] ?? '0'}, ${callback(c, 2)})`, '*TnInterval');
  timer('clearInterval', (c: NodeCall) => `TnClearInterval(${c.args[0]})`, '');
  timer('setImmediate', (c: NodeCall) => `TnSetImmediate(${callback(c, 1)})`, '*TnTimeout');
  // Timeout / Immediate / interval handles
  defineClass(r, 'timers.Timeout', '*TnTimeout', 'class', 'ref=*TnTimeout; unref=*TnTimeout; hasRef=bool; refresh=*TnTimeout; close=*TnTimeout', '', '', '');
  r.classes['timers.Immediate'] = r.classes['timers.Timeout'];
  defineClass(r, 'timers.Interval', '*TnInterval', 'class', 'ref=*TnInterval; unref=*TnInterval; hasRef=bool; refresh=*TnInterval; close=*TnInterval', '', '', '');
  timer('clearImmediate', (c: NodeCall) => `TnClearTimeout(${c.args[0]})`, '');
  timer('queueMicrotask', (c: NodeCall) => `TnQueueMicrotask(${c.args[0]})`, '');
  r.globals['setImmediate'] = 'timers.setImmediate';
  r.globals['clearImmediate'] = 'timers.clearImmediate';

  defineModule(r, 'perf_hooks');
  defineHelper(r, 'nodePerf', ['sync', 'time'], ['error', 'dynamic'], perfHelper);
  defineClass(
    r,
    'perf_hooks.PerformanceEntry',
    '*TnPerformanceEntry',
    'class',
    '',
    'name=string; entryType=string; startTime=float64; duration=float64; detail=interface{}',
    '',
    ''
  );
  r.objects['perf_hooks.performance'] = true;
  r.globals['performance'] = 'perf_hooks.performance';
  const perf = (name: string, result: string, emit: (call: NodeCall) => string) => {
    r.functions[`perf_hooks.performance.${name}`] = (call: NodeCall) => {
      r.helper('nodePerf');
      return emit(call);
    };
    r.results[`perf_hooks.performance.${name}`] = result;
  };
  perf('now', 'float64', (_c: NodeCall) => 'TnPerfNow()');
  perf('mark', '*TnPerformanceEntry', (c: NodeCall) => `TnPerfMark(${c.args.join(', ')})`);
  perf('measure', '*TnPerformanceEntry', (c: NodeCall) => `TnPerfMeasure(${c.args.join(', ')})`);
  perf('getEntries', '[]*TnPerformanceEntry', (_c: NodeCall) => 'TnPerfEntries("", "")');
  perf('getEntriesByName', '[]*TnPerformanceEntry', (c: NodeCall) => `TnPerfEntries(${c.args[0]}, ${c.args[1] ?? '""'})`);
  perf('getEntriesByType', '[]*TnPerformanceEntry', (c: NodeCall) => `TnPerfEntries("", ${c.args[0]})`);
  perf('clearMarks', '', (c: NodeCall) => `TnPerfClear("mark"${c.args[0] ? `, ${c.args[0]}` : ''})`);
  perf('clearMeasures', '', (c: NodeCall) => `TnPerfClear("measure"${c.args[0] ? `, ${c.args[0]}` : ''})`);
  r.values['perf_hooks.performance.timeOrigin'] = (_c: NodeCall) => {
    r.helper('nodePerf');
    return 'TnPerfTimeOrigin()';
  };
  r.valueTypes['perf_hooks.performance.timeOrigin'] = 'float64';

  defineModule(r, 'tty');
  r.functions['tty.isatty'] = (call: NodeCall) => {
    r.helper('nodeProcess');
    return `func() bool { switch int(${call.args[0]}) { case 0: return TnIsTTY(os.Stdin); case 1: return TnIsTTY(os.Stdout); case 2: return TnIsTTY(os.Stderr) }; return false }()`;
  };
  setResults(r, 'tty', 'isatty=bool');
}
