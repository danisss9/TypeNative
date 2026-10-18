// node:diagnostics_channel — named synchronous pub/sub channels, and the
// node:console Console class (new Console(stdout, stderr))

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { goFuncResult, closure } from './async_hooks.js';

const channelHelper = `// node:diagnostics_channel
type TnChannel struct {
	name        string
	subscribers []interface{}
	stores      []tnBoundStore
}

// channel.bindStore(store, transform): the AsyncLocalStorage runStores enters
type tnBoundStore struct {
	store     interface{}
	transform interface{}
}

var tnChannels = map[string]*TnChannel{}

func TnDiagnosticsChannel(name string) *TnChannel {
	if c, ok := tnChannels[name]; ok {
		return c
	}
	c := &TnChannel{name: name}
	tnChannels[name] = c
	return c
}

func (c *TnChannel) Get_name() string          { return c.name }
func (c *TnChannel) Get_hasSubscribers() bool  { return len(c.subscribers) > 0 }

func (c *TnChannel) publish(message interface{}) {
	for _, fn := range append([]interface{}{}, c.subscribers...) {
		TnInvoke(fn, message, c.name)
	}
}

func (c *TnChannel) subscribe(fn interface{}) {
	c.subscribers = append(c.subscribers, fn)
}

func (c *TnChannel) bindStore(store interface{}, transform ...interface{}) {
	b := tnBoundStore{store: store}
	if len(transform) > 0 {
		b.transform = transform[0]
	}
	for i, s := range c.stores {
		if s.store == store {
			c.stores[i] = b
			return
		}
	}
	c.stores = append(c.stores, b)
}

func (c *TnChannel) unbindStore(store interface{}) bool {
	for i, s := range c.stores {
		if s.store == store {
			c.stores = append(append([]tnBoundStore{}, c.stores[:i]...), c.stores[i+1:]...)
			return true
		}
	}
	return false
}

func (c *TnChannel) unsubscribe(fn interface{}) bool {
	for i, s := range c.subscribers {
		if tnFuncID(s) == tnFuncID(fn) {
			c.subscribers = append(append([]interface{}{}, c.subscribers[:i]...), c.subscribers[i+1:]...)
			return true
		}
	}
	return false
}`;

// tracingChannel and channel.runStores (bound AsyncLocalStorage stores)
const tracingHelper = `// node:diagnostics_channel tracing
// runStores(data, fn): enters each bound store (transform(data) or data), publishes, runs fn
func tnRunStoresCtx(c *TnChannel, data interface{}) TnAsyncContext {
	ctx := TnAsyncContext{}
	for k, v := range tnAsyncCtx {
		ctx[k] = v
	}
	for _, b := range c.stores {
		value := data
		if b.transform != nil {
			value = TnInvoke(b.transform, data)
		}
		ctx[b.store] = value
	}
	return ctx
}

func TnRunStores[R any](c *TnChannel, data interface{}, fn func() R) R {
	var out R
	TnAsyncRun(tnRunStoresCtx(c, data), func() {
		c.publish(data)
		out = fn()
	})
	return out
}

func TnRunStoresVoid(c *TnChannel, data interface{}, fn func()) {
	TnAsyncRun(tnRunStoresCtx(c, data), func() {
		c.publish(data)
		fn()
	})
}

type TnTracingChannel struct {
	start      *TnChannel
	end        *TnChannel
	asyncStart *TnChannel
	asyncEnd   *TnChannel
	error      *TnChannel
}

var tnTracingEvents = []string{"start", "end", "asyncStart", "asyncEnd", "error"}

func TnNewTracingChannel(nameOrChannels interface{}) *TnTracingChannel {
	tc := &TnTracingChannel{}
	channels := make([]*TnChannel, len(tnTracingEvents))
	for i, event := range tnTracingEvents {
		if name, ok := nameOrChannels.(string); ok {
			channels[i] = TnDiagnosticsChannel("tracing:" + name + ":" + event)
		} else if c, ok := TnGet(nameOrChannels, event).(*TnChannel); ok {
			channels[i] = c
		} else {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"channels."+event+"\\" property must be an instance of Channel"))
		}
	}
	tc.start, tc.end, tc.asyncStart, tc.asyncEnd, tc.error = channels[0], channels[1], channels[2], channels[3], channels[4]
	return tc
}

func (tc *TnTracingChannel) channels() []*TnChannel {
	return []*TnChannel{tc.start, tc.end, tc.asyncStart, tc.asyncEnd, tc.error}
}

func (tc *TnTracingChannel) Get_start() *TnChannel      { return tc.start }
func (tc *TnTracingChannel) Get_end() *TnChannel        { return tc.end }
func (tc *TnTracingChannel) Get_asyncStart() *TnChannel { return tc.asyncStart }
func (tc *TnTracingChannel) Get_asyncEnd() *TnChannel   { return tc.asyncEnd }
func (tc *TnTracingChannel) Get_error() *TnChannel      { return tc.error }

func (tc *TnTracingChannel) Get_hasSubscribers() bool {
	for _, c := range tc.channels() {
		if c.Get_hasSubscribers() {
			return true
		}
	}
	return false
}

func (tc *TnTracingChannel) subscribe(handlers interface{}) {
	for i, c := range tc.channels() {
		if fn := TnGet(handlers, tnTracingEvents[i]); fn != nil && !TnIsNil(fn) {
			c.subscribe(fn)
		}
	}
}

func (tc *TnTracingChannel) unsubscribe(handlers interface{}) bool {
	done := true
	for i, c := range tc.channels() {
		if fn := TnGet(handlers, tnTracingEvents[i]); fn != nil && !TnIsNil(fn) {
			if !c.unsubscribe(fn) {
				done = false
			}
		}
	}
	return done
}

// The message shared by a trace's events: the given object, or a fresh record
func tnTraceContext(context interface{}) interface{} {
	if context == nil || TnIsNil(context) {
		return map[string]interface{}{}
	}
	// A struct without result / error fields becomes a record holding its fields
	rv := reflect.ValueOf(context)
	if rv.Kind() == reflect.Pointer && rv.Elem().Kind() == reflect.Struct {
		ev := rv.Elem()
		if ev.FieldByName("result").IsValid() || ev.FieldByName("error").IsValid() || !ev.CanAddr() {
			return context
		}
		m := map[string]interface{}{}
		for i := 0; i < ev.NumField(); i++ {
			f := ev.Field(i)
			m[strings.TrimSuffix(ev.Type().Field(i).Name, "_")] = reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
		}
		return m
	}
	return context
}

func tnTraceSet(context interface{}, key string, value interface{}) {
	if m, ok := context.(map[string]interface{}); ok {
		m[key] = value
		return
	}
	rv := reflect.ValueOf(context)
	if rv.Kind() != reflect.Pointer || rv.IsNil() || rv.Elem().Kind() != reflect.Struct {
		return
	}
	f := rv.Elem().FieldByName(key)
	if !f.IsValid() {
		return
	}
	if converted, ok := TnConvertDynamic(value, f.Type()); ok {
		reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Set(converted)
	}
}

// Publishes the error event for a panic, then rethrows it
func (tc *TnTracingChannel) failed(context interface{}) {
	if r := recover(); r != nil {
		tnTraceSet(context, "error", r)
		tc.error.publish(context)
		panic(r)
	}
}

func TnTraceSync[R any](tc *TnTracingChannel, context interface{}, fn func() R) R {
	if !tc.Get_hasSubscribers() {
		return fn()
	}
	ctx := tnTraceContext(context)
	return TnRunStores(tc.start, ctx, func() R {
		defer tc.end.publish(ctx)
		defer tc.failed(ctx)
		result := fn()
		tnTraceSet(ctx, "result", result)
		return result
	})
}

func TnTraceSyncVoid(tc *TnTracingChannel, context interface{}, fn func()) {
	if !tc.Get_hasSubscribers() {
		fn()
		return
	}
	ctx := tnTraceContext(context)
	TnRunStoresVoid(tc.start, ctx, func() {
		defer tc.end.publish(ctx)
		defer tc.failed(ctx)
		fn()
	})
}

// tracePromise: start/end around the call, asyncStart/asyncEnd (and error) when it settles
func TnTracePromise[T any](tc *TnTracingChannel, context interface{}, fn func() chan T) chan T {
	if !tc.Get_hasSubscribers() {
		return fn()
	}
	ctx := tnTraceContext(context)
	return TnRunStores(tc.start, ctx, func() chan T {
		defer tc.end.publish(ctx)
		defer tc.failed(ctx)
		promise := fn()
		out := make(chan T, 1)
		actx := TnAsyncSnapshot()
		TnLoopRef()
		go func() {
			value, ok := <-promise
			var reason interface{}
			failed := false
			if !ok {
				reason, failed = tnRejections.Load(promise)
			}
			TnLoopPost(func() {
				defer TnLoopUnref()
				TnAsyncRun(actx, func() {
					if failed {
						tnTraceSet(ctx, "error", reason)
						tc.error.publish(ctx)
					} else if ok {
						tnTraceSet(ctx, "result", value)
					}
					tc.asyncStart.publish(ctx)
					tc.asyncEnd.publish(ctx)
					switch {
					case failed:
						TnReject(out, reason)
					case ok:
						out <- value
					default:
						close(out)
					}
				})
			})
		}()
		return out
	})
}

// tracePromise of a function returning a plain value (an inline async callback):
// its result (or panic) settles a promise
func TnTracePromiseOf[T any](fn func() T) func() chan T {
	return func() chan T {
		ch := make(chan T, 1)
		func() {
			defer func() {
				if r := recover(); r != nil {
					TnReject(ch, r)
				}
			}()
			ch <- fn()
		}()
		return ch
	}
}

func TnTracePromiseOfVoid(fn func()) func() chan struct{} {
	return func() chan struct{} {
		ch := make(chan struct{}, 1)
		func() {
			defer func() {
				if r := recover(); r != nil {
					TnReject(ch, r)
				}
			}()
			fn()
			close(ch)
		}()
		return ch
	}
}

// traceCallback: the callback (err, result) is wrapped to publish error / asyncStart / asyncEnd
func TnTraceWrapCallback[F any](tc *TnTracingChannel, context interface{}, cb F) F {
	fv := reflect.ValueOf(cb)
	if context == nil || !fv.IsValid() || fv.Kind() != reflect.Func || fv.IsNil() {
		return cb
	}
	wrapped := reflect.MakeFunc(fv.Type(), func(in []reflect.Value) []reflect.Value {
		if len(in) > 0 && !TnIsNil(in[0].Interface()) {
			tnTraceSet(context, "error", in[0].Interface())
			tc.error.publish(context)
		} else if len(in) > 1 {
			tnTraceSet(context, "result", in[1].Interface())
		}
		var out []reflect.Value
		TnRunStoresVoid(tc.asyncStart, context, func() {
			defer tc.asyncEnd.publish(context)
			if fv.Type().IsVariadic() {
				out = fv.CallSlice(in)
			} else {
				out = fv.Call(in)
			}
		})
		return out
	})
	return wrapped.Interface().(F)
}

func TnTraceCallback[R any](tc *TnTracingChannel, context interface{}, fn func(context interface{}) R) R {
	if !tc.Get_hasSubscribers() {
		return fn(nil)
	}
	ctx := tnTraceContext(context)
	return TnRunStores(tc.start, ctx, func() R {
		defer tc.end.publish(ctx)
		defer tc.failed(ctx)
		return fn(ctx)
	})
}

func TnTraceCallbackVoid(tc *TnTracingChannel, context interface{}, fn func(context interface{})) {
	if !tc.Get_hasSubscribers() {
		fn(nil)
		return
	}
	ctx := tnTraceContext(context)
	TnRunStoresVoid(tc.start, ctx, func() {
		defer tc.end.publish(ctx)
		defer tc.failed(ctx)
		fn(ctx)
	})
}`;

const consoleClassHelper = `// node:console Console: console methods writing to the given streams
type TnConsole struct {
	stdout *TnStream
	stderr *TnStream
}

func TnNewConsole(stdout interface{}, rest ...interface{}) *TnConsole {
	c := &TnConsole{}
	if s, ok := stdout.(tnStreamLike); ok {
		c.stdout = s.tnStream()
		if len(rest) > 0 {
			if e, ok := rest[0].(tnStreamLike); ok {
				c.stderr = e.tnStream()
			}
		}
	} else if stdout != nil {
		if s, ok := TnGet(stdout, "stdout").(tnStreamLike); ok {
			c.stdout = s.tnStream()
		}
		if s, ok := TnGet(stdout, "stderr").(tnStreamLike); ok {
			c.stderr = s.tnStream()
		}
	}
	if c.stderr == nil {
		c.stderr = c.stdout
	}
	return c
}

func (c *TnConsole) line(toErr bool, args []interface{}) {
	target := c.stdout
	if toErr {
		target = c.stderr
	}
	if target != nil {
		target.write(TnUtilFormat(args...) + "\\n")
	}
}

func (c *TnConsole) log(args ...interface{})   { c.line(false, args) }
func (c *TnConsole) info(args ...interface{})  { c.line(false, args) }
func (c *TnConsole) debug(args ...interface{}) { c.line(false, args) }
func (c *TnConsole) error(args ...interface{}) { c.line(true, args) }
func (c *TnConsole) warn(args ...interface{})  { c.line(true, args) }
func (c *TnConsole) dir(v interface{}, options ...interface{}) {
	if c.stdout != nil {
		c.stdout.write(TnInspect(v, options...) + "\\n")
	}
}`;

export function registerDiagnosticsChannel(r: NodeRegistry): void {
  defineModule(r, 'diagnostics_channel');
  defineHelper(r, 'nodeDiagnostics', [], ['nodeInvoke', 'nodeEvents'], channelHelper);
  defineClass(r, 'diagnostics_channel.Channel', '*TnChannel', 'class', 'publish=; subscribe=; unsubscribe=bool', '', 'name=string; hasSubscribers=bool', '');
  const use = () => r.helper('nodeDiagnostics');
  r.functions['diagnostics_channel.channel'] = (call: NodeCall) => {
    use();
    return `TnDiagnosticsChannel(${call.args[0]})`;
  };
  r.functions['diagnostics_channel.subscribe'] = (call: NodeCall) => {
    use();
    return `TnDiagnosticsChannel(${call.args[0]}).subscribe(${call.args[1]})`;
  };
  r.functions['diagnostics_channel.unsubscribe'] = (call: NodeCall) => {
    use();
    return `TnDiagnosticsChannel(${call.args[0]}).unsubscribe(${call.args[1]})`;
  };
  r.functions['diagnostics_channel.hasSubscribers'] = (call: NodeCall) => {
    use();
    return `TnDiagnosticsChannel(${call.args[0]}).Get_hasSubscribers()`;
  };
  setResults(r, 'diagnostics_channel', 'channel=*TnChannel; subscribe=; unsubscribe=bool; hasSubscribers=bool');
  r.paramTypers['diagnostics_channel.Channel#subscribe'] = (_n: any[]) => ['interface{}', 'string'];
  r.paramTypers['diagnostics_channel.subscribe'] = (_n: any[]) => ['interface{}', 'string'];

  // channel.bindStore / runStores and tracingChannel
  defineHelper(r, 'nodeTracing', ['reflect', 'strings', 'unsafe'], ['nodeDiagnostics', 'nodeAsyncHooks', 'dynamic', 'promise', 'eventLoop', 'nodeInvoke'], tracingHelper);
  const tracing = () => r.helper('nodeTracing');
  r.methods['diagnostics_channel.Channel#bindStore'] = (c: NodeCall) => {
    use();
    return `${c.recv}.bindStore(${c.args.join(', ')})`;
  };
  r.methods['diagnostics_channel.Channel#unbindStore'] = (c: NodeCall) => {
    use();
    return `${c.recv}.unbindStore(${c.args.join(', ')})`;
  };
  r.typers['diagnostics_channel.Channel#unbindStore'] = (_c: NodeCall) => 'bool';
  r.paramTypers['diagnostics_channel.Channel#bindStore'] = (_n: any[]) => ['interface{}'];
  // runStores(data, fn, thisArg, ...args): typed by fn's result
  r.methods['diagnostics_channel.Channel#runStores'] = (c: NodeCall) => {
    tracing();
    const fnType = c.types[1] || '';
    const fn = closure(c.args[1], fnType, c.args.slice(3));
    return goFuncResult(fnType) ? `TnRunStores(${c.recv}, ${c.args[0]}, ${fn})` : `TnRunStoresVoid(${c.recv}, ${c.args[0]}, ${fn})`;
  };
  r.typers['diagnostics_channel.Channel#runStores'] = (c: NodeCall) => goFuncResult(c.types[1] || '');

  defineClass(
    r,
    'diagnostics_channel.TracingChannel',
    '*TnTracingChannel',
    'class',
    'subscribe=; unsubscribe=bool',
    '',
    'start=*TnChannel; end=*TnChannel; asyncStart=*TnChannel; asyncEnd=*TnChannel; error=*TnChannel; hasSubscribers=bool',
    ''
  );
  r.functions['diagnostics_channel.tracingChannel'] = (c: NodeCall) => {
    tracing();
    return `TnNewTracingChannel(${c.args[0]})`;
  };
  r.results['diagnostics_channel.tracingChannel'] = '*TnTracingChannel';
  r.paramTypers['diagnostics_channel.TracingChannel#subscribe'] = (_n: any[]) => ['interface{}', 'string'];
  r.paramTypers['diagnostics_channel.TracingChannel#unsubscribe'] = r.paramTypers['diagnostics_channel.TracingChannel#subscribe'];
  const context = (c: NodeCall, i: number) => (c.args.length > i && c.args[i] !== 'nil' ? c.args[i] : 'nil');
  // traceSync(fn, context, thisArg, ...args) / tracePromise: typed by fn's result
  r.methods['diagnostics_channel.TracingChannel#traceSync'] = (c: NodeCall) => {
    tracing();
    const fnType = c.types[0] || '';
    const fn = closure(c.args[0], fnType, c.args.slice(3));
    return goFuncResult(fnType) ? `TnTraceSync(${c.recv}, ${context(c, 1)}, ${fn})` : `TnTraceSyncVoid(${c.recv}, ${context(c, 1)}, ${fn})`;
  };
  r.typers['diagnostics_channel.TracingChannel#traceSync'] = (c: NodeCall) => goFuncResult(c.types[0] || '');
  r.methods['diagnostics_channel.TracingChannel#tracePromise'] = (c: NodeCall) => {
    tracing();
    const fnType = c.types[0] || '';
    const result = goFuncResult(fnType);
    let fn = closure(c.args[0], fnType, c.args.slice(3));
    if (!result) fn = `TnTracePromiseOfVoid(${fn})`;
    else if (!result.startsWith('chan ')) fn = `TnTracePromiseOf(${fn})`;
    return `TnTracePromise(${c.recv}, ${context(c, 1)}, ${fn})`;
  };
  r.typers['diagnostics_channel.TracingChannel#tracePromise'] = (c: NodeCall) => {
    const result = goFuncResult(c.types[0] || '');
    if (!result) return 'chan struct{}';
    return result.startsWith('chan ') ? result : `chan ${result}`;
  };
  // traceCallback(fn, position, context, thisArg, ...args): args[position] (default: the last) is wrapped
  r.methods['diagnostics_channel.TracingChannel#traceCallback'] = (c: NodeCall) => {
    tracing();
    const fnType = c.types[0] || '';
    const extra = c.args.slice(4);
    let position = extra.length - 1;
    const posText = (c.args[1] || '').replace(/^float64\((.*)\)$/, '$1').replace(/[()\s]/g, '');
    const parsed = Number(posText);
    if (posText !== '' && !Number.isNaN(parsed)) position = parsed < 0 ? extra.length + parsed : parsed;
    const wrapped = extra.map((a: string, i: number) => (i === position ? `TnTraceWrapCallback(${c.recv}, tnTraceCtx, ${a})` : a));
    const result = goFuncResult(fnType);
    const call = `(${c.args[0]})(${wrapped.join(', ')})`;
    if (result) return `TnTraceCallback(${c.recv}, ${context(c, 2)}, func(tnTraceCtx interface{}) ${result} { return ${call} })`;
    return `TnTraceCallbackVoid(${c.recv}, ${context(c, 2)}, func(tnTraceCtx interface{}) { ${call} })`;
  };
  r.typers['diagnostics_channel.TracingChannel#traceCallback'] = (c: NodeCall) => goFuncResult(c.types[0] || '');

  // new Console(stdout, stderr) / new Console({ stdout, stderr })
  defineHelper(r, 'consoleClass', [], ['nodeStream', 'nodeUtil'], consoleClassHelper);
  defineClass(r, 'console.Console', '*TnConsole', 'class', 'log=; info=; debug=; error=; warn=; dir=', '', '', '');
  r.classes['globals.Console'] = r.classes['console.Console'];
  r.constructors['console.Console'] = (call: NodeCall) => {
    r.helper('consoleClass');
    return `TnNewConsole(${call.args.join(', ')})`;
  };
}
