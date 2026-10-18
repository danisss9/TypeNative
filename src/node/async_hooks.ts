// node:async_hooks — AsyncLocalStorage and AsyncResource on the event loop's
// async context (TnAsyncContext): the stores active when a callback is
// scheduled (timers, immediates, nextTick, microtasks, promise callbacks,
// async function bodies, fs / dns callbacks, streams, sockets and servers)
// are active again when it runs, and an await resumes with its own stores.
// createHook is accepted but its callbacks are never called; executionAsyncId
// is always 1 (ids are not tracked).

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const asyncHooksHelper = `// node:async_hooks
type TnAsyncLocalStorage struct {
	name string
}

func TnNewAsyncLocalStorage(options ...interface{}) *TnAsyncLocalStorage {
	als := &TnAsyncLocalStorage{}
	if len(options) > 0 && options[0] != nil {
		if n, ok := TnGet(options[0], "name").(string); ok {
			als.name = n
		}
	}
	return als
}

func (als *TnAsyncLocalStorage) Get_name() string { return als.name }

// A copy of the current context with key set to store (nil removes it)
func tnAsyncWith(key interface{}, store interface{}, remove bool) TnAsyncContext {
	ctx := TnAsyncContext{}
	for k, v := range tnAsyncCtx {
		ctx[k] = v
	}
	if remove {
		delete(ctx, key)
	} else {
		ctx[key] = store
	}
	if len(ctx) == 0 {
		return nil
	}
	return ctx
}

func (als *TnAsyncLocalStorage) getStore() interface{} {
	if tnAsyncCtx == nil {
		return nil
	}
	return tnAsyncCtx[als]
}

func (als *TnAsyncLocalStorage) enterWith(store interface{}) {
	tnAsyncCtx = tnAsyncWith(als, store, false)
}

func (als *TnAsyncLocalStorage) disable() {
	tnAsyncCtx = tnAsyncWith(als, nil, true)
}

// run(store, fn): fn's result; fn (and everything it schedules) sees store
func TnAlsRun[R any](als *TnAsyncLocalStorage, store interface{}, fn func() R) R {
	var out R
	TnAsyncRun(tnAsyncWith(als, store, false), func() { out = fn() })
	return out
}

func TnAlsRunVoid(als *TnAsyncLocalStorage, store interface{}, fn func()) {
	TnAsyncRun(tnAsyncWith(als, store, false), fn)
}

func TnAlsRunAny(als *TnAsyncLocalStorage, store interface{}, fn interface{}, args ...interface{}) interface{} {
	var out interface{}
	TnAsyncRun(tnAsyncWith(als, store, false), func() { out = TnInvoke(fn, args...) })
	return out
}

func TnAlsExit[R any](als *TnAsyncLocalStorage, fn func() R) R {
	var out R
	TnAsyncRun(tnAsyncWith(als, nil, true), func() { out = fn() })
	return out
}

func TnAlsExitVoid(als *TnAsyncLocalStorage, fn func()) {
	TnAsyncRun(tnAsyncWith(als, nil, true), fn)
}

// A function of any type that runs in ctx
func tnAsyncBindTo[F any](ctx TnAsyncContext, fn F) F {
	fv := reflect.ValueOf(fn)
	if !fv.IsValid() || fv.Kind() != reflect.Func || fv.IsNil() {
		return fn
	}
	bound := reflect.MakeFunc(fv.Type(), func(in []reflect.Value) []reflect.Value {
		var out []reflect.Value
		TnAsyncRun(ctx, func() {
			if fv.Type().IsVariadic() {
				out = fv.CallSlice(in)
			} else {
				out = fv.Call(in)
			}
		})
		return out
	})
	return bound.Interface().(F)
}

// AsyncLocalStorage.bind(fn) / AsyncResource.bind(fn): fn bound to the current context
func TnAsyncBind[F any](fn F) F { return tnAsyncBindTo(tnAsyncCtx, fn) }

// AsyncLocalStorage.snapshot(): runs functions in the current context
func TnAsyncSnapshotRunner() func(fn interface{}, args ...interface{}) interface{} {
	ctx := tnAsyncCtx
	return func(fn interface{}, args ...interface{}) interface{} {
		var out interface{}
		TnAsyncRun(ctx, func() { out = TnInvoke(fn, args...) })
		return out
	}
}

var tnAsyncIDs float64 = 1

// AsyncResource: a context captured at construction
type TnAsyncResource struct {
	type_     string
	id        float64
	triggerID float64
	ctx       TnAsyncContext
}

func TnNewAsyncResource(kind string, options ...interface{}) *TnAsyncResource {
	tnAsyncIDs++
	res := &TnAsyncResource{type_: kind, id: tnAsyncIDs, triggerID: 1, ctx: tnAsyncCtx}
	if len(options) > 0 && options[0] != nil {
		if n, ok := tnNetNumberAsync(TnGet(options[0], "triggerAsyncId")); ok {
			res.triggerID = n
		}
	}
	return res
}

func tnNetNumberAsync(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	}
	return 0, false
}

func (res *TnAsyncResource) asyncId() float64        { return res.id }
func (res *TnAsyncResource) triggerAsyncId() float64 { return res.triggerID }
func (res *TnAsyncResource) emitDestroy() *TnAsyncResource { return res }

func TnAsyncResourceRun[R any](res *TnAsyncResource, fn func() R) R {
	var out R
	TnAsyncRun(res.ctx, func() { out = fn() })
	return out
}

func TnAsyncResourceRunVoid(res *TnAsyncResource, fn func()) {
	TnAsyncRun(res.ctx, fn)
}

func TnAsyncResourceBind[F any](res *TnAsyncResource, fn F) F { return tnAsyncBindTo(res.ctx, fn) }

// createHook: accepted, its callbacks are not called
type TnAsyncHook struct {
	enabled bool
}

func (h *TnAsyncHook) enable() *TnAsyncHook {
	h.enabled = true
	return h
}

func (h *TnAsyncHook) disable() *TnAsyncHook {
	h.enabled = false
	return h
}`;

// The result type of a Go func type ('func(a string) float64' → 'float64', '' for none)
export function goFuncResult(goType: string): string {
  if (!goType || !goType.startsWith('func(')) return '';
  let depth = 0;
  for (let i = 4; i < goType.length; i++) {
    const ch = goType[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return goType.substring(i + 1).trim();
    }
  }
  return '';
}

// Calls fn with the extra arguments inside a zero-argument closure
export function closure(fn: string, fnType: string, extra: string[]): string {
  if (extra.length === 0 && fnType.startsWith('func()')) return fn;
  const result = goFuncResult(fnType);
  const call = `(${fn})(${extra.join(', ')})`;
  return result ? `func() ${result} { return ${call} }` : `func() { ${call} }`;
}

export function registerAsyncHooks(r: NodeRegistry): void {
  defineModule(r, 'async_hooks');
  defineHelper(r, 'nodeAsyncHooks', ['reflect'], ['eventLoop', 'dynamic', 'nodeInvoke'], asyncHooksHelper);
  const use = () => r.helper('nodeAsyncHooks');
  defineClass(r, 'async_hooks.AsyncLocalStorage', '*TnAsyncLocalStorage', 'class', 'getStore=interface{}; enterWith=; disable=', '', 'name=string', '');
  defineClass(r, 'async_hooks.AsyncResource', '*TnAsyncResource', 'class', 'asyncId=float64; triggerAsyncId=float64; emitDestroy=*TnAsyncResource', '', '', '');
  defineClass(r, 'async_hooks.AsyncHook', '*TnAsyncHook', 'class', 'enable=*TnAsyncHook; disable=*TnAsyncHook', '', '', '');
  r.constructors['async_hooks.AsyncLocalStorage'] = (c: NodeCall) => {
    use();
    return `TnNewAsyncLocalStorage(${c.args.join(', ')})`;
  };
  r.constructors['async_hooks.AsyncResource'] = (c: NodeCall) => {
    use();
    return `TnNewAsyncResource(${c.args.join(', ')})`;
  };

  // run(store, fn, ...args) / exit(fn, ...args): typed by the callback's result
  r.methods['async_hooks.AsyncLocalStorage#run'] = (c: NodeCall) => {
    use();
    const fnType = c.types[1] || '';
    if (!fnType.startsWith('func(')) return `TnAlsRunAny(${c.recv}, ${c.args.join(', ')})`;
    const fn = closure(c.args[1], fnType, c.args.slice(2));
    return goFuncResult(fnType) ? `TnAlsRun(${c.recv}, ${c.args[0]}, ${fn})` : `TnAlsRunVoid(${c.recv}, ${c.args[0]}, ${fn})`;
  };
  r.typers['async_hooks.AsyncLocalStorage#run'] = (c: NodeCall) => {
    const fnType = c.types[1] || '';
    return fnType.startsWith('func(') ? goFuncResult(fnType) : 'interface{}';
  };
  r.methods['async_hooks.AsyncLocalStorage#exit'] = (c: NodeCall) => {
    use();
    const fnType = c.types[0] || 'func()';
    const fn = closure(c.args[0], fnType, c.args.slice(1));
    return goFuncResult(fnType) ? `TnAlsExit(${c.recv}, ${fn})` : `TnAlsExitVoid(${c.recv}, ${fn})`;
  };
  r.typers['async_hooks.AsyncLocalStorage#exit'] = (c: NodeCall) => goFuncResult(c.types[0] || '');
  r.methods['async_hooks.AsyncResource#runInAsyncScope'] = (c: NodeCall) => {
    use();
    const fnType = c.types[0] || 'func()';
    // runInAsyncScope(fn, thisArg, ...args): thisArg is ignored
    const fn = closure(c.args[0], fnType, c.args.slice(2));
    return goFuncResult(fnType) ? `TnAsyncResourceRun(${c.recv}, ${fn})` : `TnAsyncResourceRunVoid(${c.recv}, ${fn})`;
  };
  r.typers['async_hooks.AsyncResource#runInAsyncScope'] = (c: NodeCall) => goFuncResult(c.types[0] || '');
  r.methods['async_hooks.AsyncResource#bind'] = (c: NodeCall) => {
    use();
    return `TnAsyncResourceBind(${c.recv}, ${c.args[0]})`;
  };
  r.typers['async_hooks.AsyncResource#bind'] = (c: NodeCall) => c.types[0] || 'interface{}';

  for (const cls of ['AsyncLocalStorage', 'AsyncResource']) {
    r.functions[`async_hooks.${cls}.bind`] = (c: NodeCall) => {
      use();
      return `TnAsyncBind(${c.args[0]})`;
    };
    r.typers[`async_hooks.${cls}.bind`] = (c: NodeCall) => c.types[0] || 'interface{}';
  }
  r.functions['async_hooks.AsyncLocalStorage.snapshot'] = (_c: NodeCall) => {
    use();
    return 'TnAsyncSnapshotRunner()';
  };
  r.results['async_hooks.AsyncLocalStorage.snapshot'] = 'func(interface{}, ...interface{}) interface{}';

  // Execution ids are not tracked: the top-level id (1) everywhere
  r.functions['async_hooks.executionAsyncId'] = (_c: NodeCall) => '1.0';
  r.functions['async_hooks.triggerAsyncId'] = (_c: NodeCall) => '0.0';
  r.functions['async_hooks.executionAsyncResource'] = (_c: NodeCall) => 'interface{}(map[string]interface{}{})';
  r.functions['async_hooks.createHook'] = (_c: NodeCall) => {
    use();
    return '&TnAsyncHook{}';
  };
  setResults(r, 'async_hooks', 'executionAsyncId=float64; triggerAsyncId=float64; executionAsyncResource=interface{}; createHook=*TnAsyncHook');
}
