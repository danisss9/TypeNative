// Cross-cutting Node types: NodeJS.ErrnoException is the TnError every
// thrown Node error is (err.code / err.syscall / err.path / err.errno)

import { NodeRegistry, defineClass, defineHelper, defineModule } from './registry.js';

const invokeHelper = `// Node-style callbacks (cb(err, value)) take any arguments
type TnCallback = func(...interface{})

// Calls a JS callback of any Go func type with JS arguments: extra arguments
// are dropped, missing ones are zero values, numbers convert between kinds
func TnInvoke(fn interface{}, args ...interface{}) interface{} {
	fv := reflect.ValueOf(fn)
	if !fv.IsValid() || fv.Kind() != reflect.Func || fv.IsNil() {
		return nil
	}
	ft := fv.Type()
	in := []reflect.Value{}
	n := ft.NumIn()
	for i := 0; i < n; i++ {
		if ft.IsVariadic() && i == n-1 {
			elem := ft.In(i).Elem()
			for j := i; j < len(args); j++ {
				in = append(in, tnInvokeArg(args[j], elem))
			}
			break
		}
		var a interface{}
		if i < len(args) {
			a = args[i]
		}
		in = append(in, tnInvokeArg(a, ft.In(i)))
	}
	out := fv.Call(in)
	if len(out) > 0 {
		return out[0].Interface()
	}
	return nil
}

func tnInvokeArg(a interface{}, t reflect.Type) reflect.Value {
	if a == nil {
		return reflect.Zero(t)
	}
	v := reflect.ValueOf(a)
	if v.Type().AssignableTo(t) {
		return v
	}
	// Nullable primitives (*string / *float64) take a pointer to the value
	if t.Kind() == reflect.Pointer && v.Type().AssignableTo(t.Elem()) {
		p := reflect.New(t.Elem())
		p.Elem().Set(v)
		return p
	}
	// A callback of another func type: adapt the arguments through TnInvoke
	if t.Kind() == reflect.Func && v.Kind() == reflect.Func {
		target := a
		return reflect.MakeFunc(t, func(in []reflect.Value) []reflect.Value {
			args := make([]interface{}, len(in))
			for i, arg := range in {
				if arg.Kind() == reflect.Pointer && arg.IsNil() {
					args[i] = nil
				} else if arg.Kind() == reflect.Pointer && arg.Elem().Kind() != reflect.Struct {
					args[i] = arg.Elem().Interface()
				} else {
					args[i] = arg.Interface()
				}
			}
			result := TnInvoke(target, args...)
			out := []reflect.Value{}
			for i := 0; i < t.NumOut(); i++ {
				out = append(out, tnInvokeArg(result, t.Out(i)))
			}
			return out
		})
	}
	numeric := func(k reflect.Kind) bool {
		return (k >= reflect.Int && k <= reflect.Uint64) || k == reflect.Float32 || k == reflect.Float64
	}
	if numeric(v.Kind()) && numeric(t.Kind()) {
		return v.Convert(t)
	}
	// Decoded JSON-like values into typed parameters (worker messages …)
	if converted, ok := TnConvertDynamic(a, t); ok {
		return converted
	}
	return reflect.Zero(t)
}`;

export function registerCore(r: NodeRegistry): void {
  defineHelper(r, 'nodeInvoke', ['reflect'], ['dynamic'], invokeHelper);
  defineClass(
    r,
    'NodeJS.ErrnoException',
    '*TnError',
    'class',
    '',
    'message=string; code=string',
    'name=string; stack=string; cause=interface{}; syscall=string; path=string; errno=float64; hostname=string; address=string; port=float64; actual=interface{}; expected=interface{}; operator=string; generatedMessage=bool; errors=[]interface{}',
    ''
  );
  r.globals['NodeJS'] = 'NodeJS';
  // Callback types of Node's typings (TransformCallback …)
  for (const name of ['stream.TransformCallback', 'fs.NoParamCallback']) {
    defineClass(r, name, 'TnCallback', 'class', '', '', '', '');
  }
  r.classByGoType['TnCallback'] = '';
}

// node:constants (deprecated): fs.constants and os.constants.signals merged.
// Registered after the fs and os modules.
export function registerConstants(r: NodeRegistry): void {
  defineModule(r, 'constants');
  for (const key of Object.keys(r.values)) {
    let name = '';
    if (key.startsWith('fs.constants.')) name = key.slice('fs.constants.'.length);
    if (key.startsWith('os.constants.signals.')) name = key.slice('os.constants.signals.'.length);
    if (!name) continue;
    r.values[`constants.${name}`] = r.values[key];
    r.valueTypes[`constants.${name}`] = r.valueTypes[key];
  }
}
