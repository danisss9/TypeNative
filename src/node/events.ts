// node:events — EventEmitter (also as a base class: `class X extends EventEmitter`),
// events.once / events.on, plus the globals EventTarget / Event / AbortController /
// AbortSignal and process.on('exit' | 'SIGINT' | …)

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const eventsHelper = `// node:events
type tnListener struct {
	fn   interface{}
	once bool
}

type tnEmitterState struct {
	events            map[string][]*tnListener
	order             []string
	maxListeners      float64
	warned            map[string]bool
	mu                sync.Mutex
	captureRejections bool
}

// events.errorMonitor: listeners see 'error' events before the error listeners
const TnErrorMonitor = "Symbol(events.errorMonitor)"

// events.captureRejections: the default for new emitters
var TnCaptureRejections = false

// EventEmitter: embeddable (class X extends EventEmitter), state allocated lazily
type TnEventEmitter struct {
	state *tnEmitterState
}

// Anything that embeds an EventEmitter (events.once(emitter, …) accepts subclasses)
type tnEmitterLike interface {
	tnEmitter() *TnEventEmitter
}

var TnDefaultMaxListeners = 10.0

func TnNewEventEmitter(options ...interface{}) *TnEventEmitter {
	e := &TnEventEmitter{state: &tnEmitterState{events: map[string][]*tnListener{}, maxListeners: -1, warned: map[string]bool{}, captureRejections: TnCaptureRejections}}
	if len(options) > 0 && options[0] != nil {
		if b, ok := TnGet(options[0], "captureRejections").(bool); ok {
			e.state.captureRejections = b
		}
	}
	return e
}

func (e *TnEventEmitter) tnEmitter() *TnEventEmitter { return e }

func (e *TnEventEmitter) st() *tnEmitterState {
	if e.state == nil {
		e.state = &tnEmitterState{events: map[string][]*tnListener{}, maxListeners: -1, warned: map[string]bool{}, captureRejections: TnCaptureRejections}
	}
	return e.state
}

// Identity of a function value (removeListener compares listeners by identity)
func tnFuncID(fn interface{}) uintptr {
	type iface struct {
		typ  unsafe.Pointer
		data unsafe.Pointer
	}
	return uintptr((*iface)(unsafe.Pointer(&fn)).data)
}

func (e *TnEventEmitter) addListener(event string, fn interface{}) *TnEventEmitter {
	return e.add(event, fn, false, false)
}

func (e *TnEventEmitter) on(event string, fn interface{}) *TnEventEmitter {
	return e.add(event, fn, false, false)
}

func (e *TnEventEmitter) once(event string, fn interface{}) *TnEventEmitter {
	return e.add(event, fn, false, true)
}

func (e *TnEventEmitter) prependListener(event string, fn interface{}) *TnEventEmitter {
	return e.add(event, fn, true, false)
}

func (e *TnEventEmitter) prependOnceListener(event string, fn interface{}) *TnEventEmitter {
	return e.add(event, fn, true, true)
}

func (e *TnEventEmitter) add(event string, fn interface{}, prepend bool, once bool) *TnEventEmitter {
	s := e.st()
	if len(s.events["newListener"]) > 0 {
		e.emit("newListener", event, fn)
	}
	s.mu.Lock()
	l := &tnListener{fn: fn, once: once}
	if _, ok := s.events[event]; !ok {
		s.order = append(s.order, event)
	}
	if prepend {
		s.events[event] = append([]*tnListener{l}, s.events[event]...)
	} else {
		s.events[event] = append(s.events[event], l)
	}
	count := len(s.events[event])
	max := s.maxListeners
	if max < 0 {
		max = TnDefaultMaxListeners
	}
	warn := max > 0 && float64(count) > max && !s.warned[event]
	if warn {
		s.warned[event] = true
	}
	s.mu.Unlock()
	if warn {
		fmt.Fprintf(os.Stderr, "(node:%d) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. %d %s listeners added to [EventEmitter]. MaxListeners is %d. Use emitter.setMaxListeners() to increase limit\\n", os.Getpid(), count, event, int(max))
	}
	return e
}

func (e *TnEventEmitter) removeListener(event string, fn interface{}) *TnEventEmitter {
	s := e.st()
	s.mu.Lock()
	list := s.events[event]
	id := tnFuncID(fn)
	removed := false
	for i := len(list) - 1; i >= 0; i-- {
		if tnFuncID(list[i].fn) == id {
			list = append(append([]*tnListener{}, list[:i]...), list[i+1:]...)
			removed = true
			break
		}
	}
	e.setListeners(event, list)
	s.mu.Unlock()
	if removed && len(s.events["removeListener"]) > 0 {
		e.emit("removeListener", event, fn)
	}
	return e
}

func (e *TnEventEmitter) off(event string, fn interface{}) *TnEventEmitter {
	return e.removeListener(event, fn)
}

// (caller holds the lock)
func (e *TnEventEmitter) setListeners(event string, list []*tnListener) {
	s := e.st()
	if len(list) > 0 {
		s.events[event] = list
		return
	}
	delete(s.events, event)
	order := []string{}
	for _, name := range s.order {
		if name != event {
			order = append(order, name)
		}
	}
	s.order = order
}

func (e *TnEventEmitter) removeAllListeners(event ...string) *TnEventEmitter {
	s := e.st()
	s.mu.Lock()
	if len(event) > 0 {
		e.setListeners(event[0], nil)
	} else {
		s.events = map[string][]*tnListener{}
		s.order = nil
	}
	s.mu.Unlock()
	return e
}

func (e *TnEventEmitter) emit(event string, args ...interface{}) bool {
	s := e.st()
	s.mu.Lock()
	list := append([]*tnListener{}, s.events[event]...)
	// once listeners are removed before they run
	kept := []*tnListener{}
	for _, l := range s.events[event] {
		if !l.once {
			kept = append(kept, l)
		}
	}
	if len(kept) != len(s.events[event]) {
		e.setListeners(event, kept)
	}
	monitors := []*tnListener{}
	if event == "error" {
		monitors = append(monitors, s.events[TnErrorMonitor]...)
	}
	capture := s.captureRejections
	s.mu.Unlock()
	for _, l := range monitors {
		TnInvoke(l.fn, args...)
	}
	if len(list) == 0 {
		if event == "error" {
			if len(args) > 0 {
				if _, ok := args[0].(error); ok {
					panic(args[0])
				}
				panic(TnNodeError("Error", "ERR_UNHANDLED_ERROR", "Unhandled error. ("+fmt.Sprint(args[0])+")"))
			}
			panic(TnNodeError("Error", "ERR_UNHANDLED_ERROR", "Unhandled error."))
		}
		return false
	}
	for _, l := range list {
		result := TnInvoke(l.fn, args...)
		// captureRejections: an async listener's rejection becomes an 'error' event
		if capture && event != "error" {
			tnCaptureRejection(e, result)
		}
	}
	return true
}

func tnCaptureRejection(e *TnEventEmitter, result interface{}) {
	rv := reflect.ValueOf(result)
	if !rv.IsValid() || rv.Kind() != reflect.Chan || rv.IsNil() {
		return
	}
	TnLoopRef()
	go func() {
		_, ok := rv.Recv()
		var reason interface{}
		rejected := false
		if !ok {
			reason, rejected = tnRejections.Load(result)
		}
		TnLoopPost(func() {
			defer TnLoopUnref()
			if rejected {
				e.emit("error", reason)
			}
		})
	}()
}

// events.getMaxListeners(emitter) / events.setMaxListeners(n, ...emitters)
func TnEventsGetMaxListeners(target interface{}) float64 {
	if em, ok := target.(tnEmitterLike); ok {
		return em.tnEmitter().getMaxListeners()
	}
	return TnDefaultMaxListeners
}

func TnEventsSetMaxListeners(n float64, targets ...interface{}) {
	if len(targets) == 0 {
		TnDefaultMaxListeners = n
		return
	}
	for _, t := range targets {
		if em, ok := t.(tnEmitterLike); ok {
			em.tnEmitter().setMaxListeners(n)
		}
	}
}

// events.addAbortListener(signal, listener): a Disposable that removes it
type TnDisposable struct {
	dispose func()
}

func (d *TnDisposable) __dispose() {
	if d.dispose != nil {
		d.dispose()
		d.dispose = nil
	}
}

func TnAddAbortListener(signal *TnAbortSignal, listener interface{}) *TnDisposable {
	removed := false
	if signal.aborted {
		TnLoopPost(func() { TnInvoke(listener, TnNewEvent("abort")) })
		return &TnDisposable{}
	}
	signal.addEventListener("abort", func(ev *TnEvent) {
		if !removed {
			TnInvoke(listener, ev)
		}
	}, map[string]interface{}{"once": true})
	return &TnDisposable{dispose: func() { removed = true }}
}

func (e *TnEventEmitter) listeners(event string) []interface{} {
	s := e.st()
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []interface{}{}
	for _, l := range s.events[event] {
		out = append(out, l.fn)
	}
	return out
}

func (e *TnEventEmitter) rawListeners(event string) []interface{} { return e.listeners(event) }

func (e *TnEventEmitter) listenerCount(event string, fn ...interface{}) float64 {
	s := e.st()
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(fn) > 0 && fn[0] != nil {
		n := 0
		for _, l := range s.events[event] {
			if tnFuncID(l.fn) == tnFuncID(fn[0]) {
				n++
			}
		}
		return float64(n)
	}
	return float64(len(s.events[event]))
}

func (e *TnEventEmitter) eventNames() []string {
	s := e.st()
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string{}, s.order...)
}

func (e *TnEventEmitter) setMaxListeners(n float64) *TnEventEmitter {
	e.st().maxListeners = n
	return e
}

func (e *TnEventEmitter) getMaxListeners() float64 {
	if e.st().maxListeners < 0 {
		return TnDefaultMaxListeners
	}
	return e.st().maxListeners
}

// events.once(emitter, name): a promise of the event's arguments; 'error' rejects it
func TnEventsOnce(target tnEmitterLike, event string, options ...interface{}) chan []interface{} {
	e := target.tnEmitter()
	ch := make(chan []interface{}, 1)
	var listener, errorListener func(args ...interface{})
	listener = func(args ...interface{}) {
		if event != "error" {
			e.removeListener("error", errorListener)
		}
		ch <- args
	}
	errorListener = func(args ...interface{}) {
		e.removeListener(event, listener)
		var reason interface{}
		if len(args) > 0 {
			reason = args[0]
		}
		TnReject(ch, reason)
	}
	e.once(event, listener)
	if event != "error" {
		e.once("error", errorListener)
	}
	return ch
}

// events.on(emitter, name): an async iterator (channel) of each event's arguments
func TnEventsOn(target tnEmitterLike, event string, options ...interface{}) chan []interface{} {
	e := target.tnEmitter()
	ch := make(chan []interface{}, 4096)
	e.on(event, func(args ...interface{}) { ch <- args })
	return ch
}

func TnGetEventListeners(target tnEmitterLike, event string) []interface{} {
	return target.tnEmitter().listeners(event)
}

// EventTarget / Event (and AbortSignal, an EventTarget)
type TnEvent struct {
	eventType        string
	timeStamp        float64
	defaultPrevented bool
	cancelable       bool
	target           interface{}
}

func TnNewEvent(eventType string, options ...interface{}) *TnEvent {
	ev := &TnEvent{eventType: eventType, timeStamp: float64(time.Now().UnixNano()) / 1e6}
	if len(options) > 0 && options[0] != nil {
		if c, ok := TnGet(options[0], "cancelable").(bool); ok {
			ev.cancelable = c
		}
	}
	return ev
}

func (ev *TnEvent) Get_type_() string           { return ev.eventType }
func (ev *TnEvent) Get_defaultPrevented() bool  { return ev.defaultPrevented }
func (ev *TnEvent) Get_target() interface{}     { return ev.target }
func (ev *TnEvent) Get_timeStamp() float64      { return ev.timeStamp }
func (ev *TnEvent) preventDefault() {
	if ev.cancelable {
		ev.defaultPrevented = true
	}
}

type TnEventTarget struct {
	targetListeners map[string][]*tnListener
	tnSelf          interface{}
}

func TnNewEventTarget() *TnEventTarget { return &TnEventTarget{} }

func (t *TnEventTarget) addEventListener(eventType string, fn interface{}, options ...interface{}) {
	if fn == nil {
		return
	}
	if t.targetListeners == nil {
		t.targetListeners = map[string][]*tnListener{}
	}
	for _, l := range t.targetListeners[eventType] {
		if tnFuncID(l.fn) == tnFuncID(fn) {
			return
		}
	}
	once := false
	if len(options) > 0 && options[0] != nil {
		if o, ok := TnGet(options[0], "once").(bool); ok {
			once = o
		}
	}
	t.targetListeners[eventType] = append(t.targetListeners[eventType], &tnListener{fn: fn, once: once})
}

func (t *TnEventTarget) removeEventListener(eventType string, fn interface{}, options ...interface{}) {
	list := t.targetListeners[eventType]
	for i, l := range list {
		if tnFuncID(l.fn) == tnFuncID(fn) {
			t.targetListeners[eventType] = append(append([]*tnListener{}, list[:i]...), list[i+1:]...)
			return
		}
	}
}

func (t *TnEventTarget) dispatchEvent(ev *TnEvent) bool {
	if t.tnSelf != nil {
		ev.target = t.tnSelf
	} else {
		ev.target = t
	}
	for _, l := range append([]*tnListener{}, t.targetListeners[ev.eventType]...) {
		if l.once {
			t.removeEventListener(ev.eventType, l.fn)
		}
		TnInvoke(l.fn, ev)
	}
	return !ev.defaultPrevented
}

type TnAbortSignal struct {
	TnEventTarget
	aborted bool
	reason  interface{}
	onabort interface{}
}

func tnAbortError(message string, name string) *TnError {
	e := TnNodeError(name, "ABORT_ERR", message)
	e.props["code"] = float64(20)
	return e
}

func (s *TnAbortSignal) Get_aborted() bool      { return s.aborted }
func (s *TnAbortSignal) Get_reason() interface{} { return s.reason }
func (s *TnAbortSignal) Get_onabort() interface{} { return s.onabort }
func (s *TnAbortSignal) Set_onabort(fn interface{}) { s.onabort = fn }

func (s *TnAbortSignal) throwIfAborted() {
	if s.aborted {
		panic(s.reason)
	}
}

func (s *TnAbortSignal) abort(reason interface{}) {
	if s.aborted {
		return
	}
	s.aborted = true
	if reason == nil {
		reason = tnAbortError("This operation was aborted", "AbortError")
	}
	s.reason = reason
	ev := TnNewEvent("abort")
	if s.onabort != nil {
		TnInvoke(s.onabort, ev)
	}
	s.dispatchEvent(ev)
}

func TnNewAbortSignal() *TnAbortSignal {
	s := &TnAbortSignal{}
	s.tnSelf = s
	return s
}

func TnAbortSignalAbort(reason ...interface{}) *TnAbortSignal {
	s := TnNewAbortSignal()
	var r interface{}
	if len(reason) > 0 {
		r = reason[0]
	}
	s.abort(r)
	return s
}

// AbortSignal.timeout(ms): aborts with a TimeoutError (does not keep the process alive)
func TnAbortSignalTimeout(ms float64) *TnAbortSignal {
	s := TnNewAbortSignal()
	time.AfterFunc(time.Duration(ms*float64(time.Millisecond)), func() {
		TnLoopPost(func() { s.abort(tnAbortError("The operation was aborted due to timeout", "TimeoutError")) })
	})
	return s
}

func TnAbortSignalAny(signals []*TnAbortSignal) *TnAbortSignal {
	s := TnNewAbortSignal()
	for _, sig := range signals {
		if sig.aborted {
			s.abort(sig.reason)
			return s
		}
	}
	for _, sig := range signals {
		source := sig
		source.addEventListener("abort", func(ev *TnEvent) { s.abort(source.reason) })
	}
	return s
}

type TnAbortController struct {
	signal *TnAbortSignal
}

func TnNewAbortController() *TnAbortController {
	return &TnAbortController{signal: TnNewAbortSignal()}
}

func (c *TnAbortController) Get_signal() *TnAbortSignal { return c.signal }

func (c *TnAbortController) abort(reason ...interface{}) {
	var r interface{}
	if len(reason) > 0 {
		r = reason[0]
	}
	c.signal.abort(r)
}

// process.on(…): 'exit' runs before the process exits; signals arrive on the loop
var tnProcessEmitter = TnNewEventEmitter()
var tnSignalsWatched = map[string]bool{}
var tnSignalsMu sync.Mutex

// Set by the IPC helper in forked children: a 'message' listener keeps the channel open
var tnProcessMessageHook func()

func TnProcessOn(event string, fn interface{}, once bool) {
	if once {
		tnProcessEmitter.once(event, fn)
	} else {
		tnProcessEmitter.on(event, fn)
	}
	if event == "message" && tnProcessMessageHook != nil {
		tnProcessMessageHook()
	}
	sig, isSignal := map[string]os.Signal{"SIGINT": os.Interrupt, "SIGTERM": syscall.SIGTERM, "SIGHUP": syscall.SIGHUP}[event]
	if !isSignal {
		return
	}
	tnSignalsMu.Lock()
	defer tnSignalsMu.Unlock()
	if tnSignalsWatched[event] {
		return
	}
	tnSignalsWatched[event] = true
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, sig)
	go func() {
		for range ch {
			TnLoopPost(func() { tnProcessEmitter.emit(event, event) })
		}
	}()
}

func TnProcessEmitExit(code float64) {
	tnProcessEmitter.emit("exit", code)
}

func init() { tnBeforeExit = TnProcessEmitExit }`;

export function registerEvents(r: NodeRegistry): void {
  defineModule(r, 'events');
  r.namespaces['events.default'] = 'events.EventEmitter';
  defineHelper(r, 'nodeEvents', ['fmt', 'os', 'os/signal', 'reflect', 'sync', 'syscall', 'time', 'unsafe'], ['error', 'dynamic', 'nodeInvoke', 'promise', 'eventLoop', 'nodeProcess'], eventsHelper);
  const emitterMethods =
    'on=*TnEventEmitter; addListener=*TnEventEmitter; once=*TnEventEmitter; prependListener=*TnEventEmitter; prependOnceListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listeners=[]interface{}; rawListeners=[]interface{}; listenerCount=float64; eventNames=[]string; setMaxListeners=*TnEventEmitter; getMaxListeners=float64';
  defineClass(r, 'events.EventEmitter', '*TnEventEmitter', 'class', emitterMethods, '', '', '');
  r.classes['events.default'] = r.classes['events.EventEmitter'];
  const use = () => r.helper('nodeEvents');
  r.constructors['events.EventEmitter'] = (call: NodeCall) => {
    use();
    return `TnNewEventEmitter(${call.args.join(', ')})`;
  };
  const statics = (prefix: string) => {
    r.functions[`${prefix}.once`] = (call: NodeCall) => {
      use();
      return `TnEventsOnce(${call.args.join(', ')})`;
    };
    r.results[`${prefix}.once`] = 'chan []interface{}';
    r.functions[`${prefix}.on`] = (call: NodeCall) => {
      use();
      return `TnEventsOn(${call.args.join(', ')})`;
    };
    r.results[`${prefix}.on`] = 'chan []interface{}';
    r.functions[`${prefix}.getEventListeners`] = (call: NodeCall) => {
      use();
      return `TnGetEventListeners(${call.args.join(', ')})`;
    };
    r.results[`${prefix}.getEventListeners`] = '[]interface{}';
    r.functions[`${prefix}.listenerCount`] = (call: NodeCall) => {
      use();
      return `${call.args[0]}.tnEmitter().listenerCount(${call.args.slice(1).join(', ')})`;
    };
    r.results[`${prefix}.listenerCount`] = 'float64';
    r.values[`${prefix}.defaultMaxListeners`] = (_c: NodeCall) => {
      use();
      return 'TnDefaultMaxListeners';
    };
    r.valueTypes[`${prefix}.defaultMaxListeners`] = 'float64';
    r.functions[`${prefix}.defaultMaxListeners=`] = (call: NodeCall) => {
      use();
      return `TnDefaultMaxListeners = ${call.args[0]}`;
    };
  };
  statics('events');
  statics('events.EventEmitter');
  for (const prefix of ['events', 'events.EventEmitter']) {
    r.values[`${prefix}.errorMonitor`] = (_c: NodeCall) => {
      use();
      return 'TnErrorMonitor';
    };
    r.valueTypes[`${prefix}.errorMonitor`] = 'string';
    r.values[`${prefix}.captureRejections`] = (_c: NodeCall) => {
      use();
      return 'TnCaptureRejections';
    };
    r.valueTypes[`${prefix}.captureRejections`] = 'bool';
    r.functions[`${prefix}.captureRejections=`] = (call: NodeCall) => {
      use();
      return `TnCaptureRejections = ${call.args[0]}`;
    };
    r.functions[`${prefix}.getMaxListeners`] = (call: NodeCall) => {
      use();
      return `TnEventsGetMaxListeners(${call.args[0]})`;
    };
    r.results[`${prefix}.getMaxListeners`] = 'float64';
    r.functions[`${prefix}.setMaxListeners`] = (call: NodeCall) => {
      use();
      return `TnEventsSetMaxListeners(${call.args.join(', ')})`;
    };
    r.functions[`${prefix}.addAbortListener`] = (call: NodeCall) => {
      use();
      return `TnAddAbortListener(${call.args.join(', ')})`;
    };
    r.results[`${prefix}.addAbortListener`] = '*TnDisposable';
  }
  defineClass(r, 'events.Disposable', '*TnDisposable', 'class', '__dispose=', '', '', '');

  // EventTarget / Event / AbortController / AbortSignal (globals, also exported by node:events)
  defineClass(r, 'globals.Event', '*TnEvent', 'class', 'preventDefault=', '', 'type=string; defaultPrevented=bool; target=interface{}; timeStamp=float64', '');
  defineClass(r, 'globals.EventTarget', '*TnEventTarget', 'class', 'addEventListener=; removeEventListener=; dispatchEvent=bool', '', '', '');
  defineClass(
    r,
    'globals.AbortSignal',
    '*TnAbortSignal',
    'class',
    'addEventListener=; removeEventListener=; dispatchEvent=bool; throwIfAborted=',
    '',
    'aborted=bool; reason=interface{}; onabort=interface{}',
    'onabort'
  );
  defineClass(r, 'globals.AbortController', '*TnAbortController', 'class', 'abort=', '', 'signal=*TnAbortSignal', '');
  for (const name of ['Event', 'EventTarget', 'AbortSignal', 'AbortController']) {
    r.globals[name] = `globals.${name}`;
    r.classes[`events.${name}`] = r.classes[`globals.${name}`];
    r.namespaces[`events.${name}`] = `globals.${name}`;
  }
  r.constructors['globals.Event'] = (call: NodeCall) => {
    use();
    return `TnNewEvent(${call.args.join(', ')})`;
  };
  r.constructors['globals.EventTarget'] = (_c: NodeCall) => {
    use();
    return 'TnNewEventTarget()';
  };
  r.constructors['globals.AbortController'] = (_c: NodeCall) => {
    use();
    return 'TnNewAbortController()';
  };
  r.functions['globals.AbortSignal.abort'] = (call: NodeCall) => {
    use();
    return `TnAbortSignalAbort(${call.args.join(', ')})`;
  };
  r.functions['globals.AbortSignal.timeout'] = (call: NodeCall) => {
    use();
    return `TnAbortSignalTimeout(${call.args[0]})`;
  };
  r.functions['globals.AbortSignal.any'] = (call: NodeCall) => {
    use();
    return `TnAbortSignalAny(${call.args[0]})`;
  };
  setResults(r, 'globals.AbortSignal', 'abort=*TnAbortSignal; timeout=*TnAbortSignal; any=*TnAbortSignal');
  r.paramTypers['globals.EventTarget#addEventListener'] = (_n: any[]) => ['*TnEvent'];
  r.paramTypers['globals.AbortSignal#addEventListener'] = (_n: any[]) => ['*TnEvent'];

  // process.on / once / off / emit
  const processOn = (once: boolean) => (call: NodeCall) => {
    use();
    // IPC events of forked children
    const event = call.nodes[0];
    if (event && event.kind === 'StringLiteral' && (event.text === 'message' || event.text === 'disconnect')) r.helper('nodeIpc');
    return `TnProcessOn(${call.args[0]}, ${call.args[1]}, ${once})`;
  };
  r.functions['process.on'] = processOn(false);
  r.functions['process.addListener'] = processOn(false);
  r.functions['process.once'] = processOn(true);
  r.functions['process.off'] = (call: NodeCall) => {
    use();
    return `tnProcessEmitter.off(${call.args.join(', ')})`;
  };
  r.functions['process.removeListener'] = r.functions['process.off'];
  r.functions['process.emit'] = (call: NodeCall) => {
    use();
    return `tnProcessEmitter.emit(${call.args.join(', ')})`;
  };
  r.functions['process.listenerCount'] = (call: NodeCall) => {
    use();
    return `tnProcessEmitter.listenerCount(${call.args.join(', ')})`;
  };
  setResults(r, 'process', 'emit=bool; listenerCount=float64');
  r.paramTypers['process.on'] = (nodes: any[]) => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'exit') return ['float64'];
    if (name === 'message') return ['interface{}'];
    if (name === 'disconnect') return [];
    return ['string'];
  };
  r.paramTypers['process.once'] = r.paramTypers['process.on'];
}
