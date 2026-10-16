// node:diagnostics_channel — named synchronous pub/sub channels, and the
// node:console Console class (new Console(stdout, stderr))
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
const channelHelper = `// node:diagnostics_channel
type TnChannel struct {
	name        string
	subscribers []interface{}
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

func (c *TnChannel) unsubscribe(fn interface{}) bool {
	for i, s := range c.subscribers {
		if tnFuncID(s) == tnFuncID(fn) {
			c.subscribers = append(append([]interface{}{}, c.subscribers[:i]...), c.subscribers[i+1:]...)
			return true
		}
	}
	return false
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
export function registerDiagnosticsChannel(r) {
    defineModule(r, 'diagnostics_channel');
    defineHelper(r, 'nodeDiagnostics', [], ['nodeInvoke', 'nodeEvents'], channelHelper);
    defineClass(r, 'diagnostics_channel.Channel', '*TnChannel', 'class', 'publish=; subscribe=; unsubscribe=bool', '', 'name=string; hasSubscribers=bool', '');
    const use = () => r.helper('nodeDiagnostics');
    r.functions['diagnostics_channel.channel'] = (call) => {
        use();
        return `TnDiagnosticsChannel(${call.args[0]})`;
    };
    r.functions['diagnostics_channel.subscribe'] = (call) => {
        use();
        return `TnDiagnosticsChannel(${call.args[0]}).subscribe(${call.args[1]})`;
    };
    r.functions['diagnostics_channel.unsubscribe'] = (call) => {
        use();
        return `TnDiagnosticsChannel(${call.args[0]}).unsubscribe(${call.args[1]})`;
    };
    r.functions['diagnostics_channel.hasSubscribers'] = (call) => {
        use();
        return `TnDiagnosticsChannel(${call.args[0]}).Get_hasSubscribers()`;
    };
    setResults(r, 'diagnostics_channel', 'channel=*TnChannel; subscribe=; unsubscribe=bool; hasSubscribers=bool');
    r.paramTypers['diagnostics_channel.Channel#subscribe'] = (_n) => ['interface{}', 'string'];
    r.paramTypers['diagnostics_channel.subscribe'] = (_n) => ['interface{}', 'string'];
    // new Console(stdout, stderr) / new Console({ stdout, stderr })
    defineHelper(r, 'consoleClass', [], ['nodeStream', 'nodeUtil'], consoleClassHelper);
    defineClass(r, 'console.Console', '*TnConsole', 'class', 'log=; info=; debug=; error=; warn=; dir=', '', '', '');
    r.classes['globals.Console'] = r.classes['console.Console'];
    r.constructors['console.Console'] = (call) => {
        r.helper('consoleClass');
        return `TnNewConsole(${call.args.join(', ')})`;
    };
}
