// node:readline (+ node:readline/promises): createInterface over any readable
// stream ('line' / 'close' events, question, prompt, for await). The
// module-level `question(prompt)` is a TypeNative extension: synchronous,
// used by the self-hosted compiler's prompts.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const readlineHelper = `// node:readline Interface
type TnReadline struct {
	TnEventEmitter
	input           *TnStream
	output          *TnStream
	promptText      string
	partial         string
	closed          bool
	pendingQuestion interface{}
	lines           chan string
}

func TnCreateInterface(options interface{}, rest ...interface{}) *TnReadline {
	rl := &TnReadline{promptText: "> "}
	var input, output interface{}
	if s, ok := options.(tnStreamLike); ok {
		input = s
		if len(rest) > 0 {
			output = rest[0]
		}
	} else if options != nil {
		input = TnGet(options, "input")
		output = TnGet(options, "output")
		if p, ok := TnGet(options, "prompt").(string); ok {
			rl.promptText = p
		}
	}
	if s, ok := output.(tnStreamLike); ok && !TnIsNil(output) {
		rl.output = s.tnStream()
	}
	s, ok := input.(tnStreamLike)
	if !ok || TnIsNil(input) {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"input\\" argument must be a readable stream"))
	}
	rl.input = s.tnStream()
	rl.input.on("data", func(chunk interface{}) { rl.feed(TnJSString(chunk)) })
	rl.input.TnEventEmitter.once("end", func() {
		if rl.partial != "" {
			line := rl.partial
			rl.partial = ""
			rl.onLine(line)
		}
		rl.close()
	})
	if rl.input == tnStdinStream {
		rl.input.stdinRef(true)
	}
	return rl
}

func (rl *TnReadline) feed(text string) {
	rl.partial += text
	for {
		i := strings.IndexByte(rl.partial, '\\n')
		if i < 0 || rl.closed {
			return
		}
		line := strings.TrimSuffix(rl.partial[:i], "\\r")
		rl.partial = rl.partial[i+1:]
		rl.onLine(line)
	}
}

func (rl *TnReadline) onLine(line string) {
	if rl.pendingQuestion != nil {
		cb := rl.pendingQuestion
		rl.pendingQuestion = nil
		TnInvoke(cb, line)
		return
	}
	rl.emit("line", line)
}

func (rl *TnReadline) writeOut(text string) {
	if rl.output != nil {
		rl.output.write(text)
	}
}

// question(query, callback)
func (rl *TnReadline) question(query string, args ...interface{}) {
	if rl.closed {
		panic(TnNodeError("Error", "ERR_USE_AFTER_CLOSE", "readline was closed"))
	}
	rl.writeOut(query)
	if len(args) > 0 {
		rl.pendingQuestion = args[len(args)-1]
	}
}

// readline/promises: question(query) resolves with the answer
func (rl *TnReadline) questionAsync(query string, options ...interface{}) chan string {
	ch := make(chan string, 1)
	if rl.closed {
		TnReject(ch, TnNodeError("Error", "ERR_USE_AFTER_CLOSE", "readline was closed"))
		return ch
	}
	TnLoopRef()
	rl.writeOut(query)
	rl.pendingQuestion = func(answer string) {
		TnLoopUnref()
		TnAsyncSend(ch, answer)
	}
	return ch
}

func (rl *TnReadline) prompt(preserveCursor ...bool) { rl.writeOut(rl.promptText) }
func (rl *TnReadline) setPrompt(p string)             { rl.promptText = p }
func (rl *TnReadline) getPrompt() string              { return rl.promptText }
func (rl *TnReadline) write(data interface{}, key ...interface{}) {
	rl.feed(TnJSString(data))
}

func (rl *TnReadline) pause() *TnReadline {
	rl.input.pause()
	if rl.input == tnStdinStream {
		rl.input.stdinRef(false)
	}
	rl.emit("pause")
	return rl
}

func (rl *TnReadline) resume() *TnReadline {
	rl.input.resume()
	if rl.input == tnStdinStream {
		rl.input.stdinRef(true)
	}
	rl.emit("resume")
	return rl
}

func (rl *TnReadline) close() {
	if rl.closed {
		return
	}
	rl.closed = true
	if rl.input == tnStdinStream {
		rl.input.pause()
		rl.input.stdinRef(false)
	}
	if rl.pendingQuestion != nil {
		rl.pendingQuestion = nil
	}
	rl.emit("close")
	if rl.lines != nil {
		close(rl.lines)
	}
}

func (rl *TnReadline) Get_closed() bool { return rl.closed }

// for await (const line of rl)
func (rl *TnReadline) tnIterator() chan string {
	if rl.lines == nil {
		rl.lines = make(chan string, 65536)
		rl.on("line", func(line string) { rl.lines <- line })
		if rl.closed {
			close(rl.lines)
		}
	}
	return rl.lines
}`;

// readline.cursorTo / moveCursor / clearLine / clearScreenDown: ANSI writes
const cursorHelper = `// node:readline cursor helpers
func tnCursorWrite(stream interface{}, data string, cb interface{}) bool {
	s, ok := stream.(tnStreamLike)
	if !ok || TnIsNil(stream) || data == "" {
		if cb != nil {
			TnQueueMicrotask(func() { TnInvoke(cb, nil) })
		}
		return true
	}
	if cb != nil {
		return s.tnStream().write(data, cb)
	}
	return s.tnStream().write(data)
}

func tnCursorCallback(args []interface{}) interface{} {
	for _, a := range args {
		if _, ok := a.(float64); !ok && a != nil {
			return a
		}
	}
	return nil
}

func TnCursorTo(stream interface{}, x float64, rest ...interface{}) bool {
	data := "\\x1b[" + TnJSString(x+1) + "G"
	if len(rest) > 0 {
		if y, ok := rest[0].(float64); ok {
			data = "\\x1b[" + TnJSString(y+1) + ";" + TnJSString(x+1) + "H"
		}
	}
	return tnCursorWrite(stream, data, tnCursorCallback(rest))
}

func TnMoveCursor(stream interface{}, dx float64, dy float64, rest ...interface{}) bool {
	data := ""
	if dx < 0 {
		data += "\\x1b[" + TnJSString(-dx) + "D"
	} else if dx > 0 {
		data += "\\x1b[" + TnJSString(dx) + "C"
	}
	if dy < 0 {
		data += "\\x1b[" + TnJSString(-dy) + "A"
	} else if dy > 0 {
		data += "\\x1b[" + TnJSString(dy) + "B"
	}
	return tnCursorWrite(stream, data, tnCursorCallback(rest))
}

func TnClearLine(stream interface{}, dir float64, rest ...interface{}) bool {
	data := "\\x1b[2K"
	if dir < 0 {
		data = "\\x1b[1K"
	} else if dir > 0 {
		data = "\\x1b[0K"
	}
	return tnCursorWrite(stream, data, tnCursorCallback(rest))
}

func TnClearScreenDown(stream interface{}, rest ...interface{}) bool {
	return tnCursorWrite(stream, "\\x1b[0J", tnCursorCallback(rest))
}`;

// readline.emitKeypressEvents(stream): 'keypress' (str, key) events decoded
// from the stream's data, a port of Node's emitKeys
const keypressHelper = `// A decoded key; "" stands for undefined
type TnKey struct {
	sequence string
	name     string
	ctrl     bool
	meta     bool
	shift    bool
	code     string
}

type tnKeyDecoder struct {
	buf   []rune // -1 is the escape timeout ('' in Node)
	timer *TnTimeout
}

var tnKeyDecoders = map[*TnStream]*tnKeyDecoder{}

func TnEmitKeypressEvents(stream interface{}, rest ...interface{}) {
	sl, ok := stream.(tnStreamLike)
	if !ok || TnIsNil(stream) {
		return
	}
	s := sl.tnStream()
	if tnKeyDecoders[s] != nil {
		return
	}
	d := &tnKeyDecoder{}
	tnKeyDecoders[s] = d
	var pending []byte
	s.TnEventEmitter.on("data", func(chunk interface{}) {
		if s.listenerCount("keypress") == 0 {
			return
		}
		switch c := chunk.(type) {
		case string:
			pending = append(pending, c...)
		case []byte:
			pending = append(pending, c...)
		default:
			pending = append(pending, TnJSString(chunk)...)
		}
		// whole UTF-8 characters only, as a StringDecoder would
		text := []rune{}
		for len(pending) > 0 && utf8.FullRune(pending) {
			r, size := utf8.DecodeRune(pending)
			text = append(text, r)
			pending = pending[size:]
		}
		if len(text) == 0 {
			return
		}
		if d.timer != nil {
			TnClearTimeout(d.timer)
			d.timer = nil
		}
		for _, r := range text {
			d.feed(s, r)
		}
		// a lone ESC at the end is the Escape key unless more follows soon
		if text[len(text)-1] == 0x1b {
			d.timer = TnSetTimeout(500, func() {
				d.timer = nil
				if len(d.buf) > 0 {
					d.feed(s, -1)
				}
			})
		}
	})
	s.listening("data")
}

func (d *tnKeyDecoder) feed(s *TnStream, r rune) {
	d.buf = append(d.buf, r)
	for len(d.buf) > 0 {
		key, str, emit, n := tnDecodeKey(d.buf)
		if n == 0 {
			return
		}
		d.buf = d.buf[n:]
		if emit {
			s.emit("keypress", str, key)
		}
	}
}

type tnKeyNeedMore struct{}

var tnKeyTilde = regexp.MustCompile("^(?:(\\\\d\\\\d?)(?:;(\\\\d))?([~^$])|(\\\\d{3}~))$")
var tnKeyLetter = regexp.MustCompile("^((\\\\d;)?(\\\\d))?([A-Za-z])$")

var tnKeyCodes = map[string]string{
	"[P": "f1", "[Q": "f2", "[R": "f3", "[S": "f4",
	"OP": "f1", "OQ": "f2", "OR": "f3", "OS": "f4",
	"[11~": "f1", "[12~": "f2", "[13~": "f3", "[14~": "f4",
	"[200~": "paste-start", "[201~": "paste-end",
	"[[A": "f1", "[[B": "f2", "[[C": "f3", "[[D": "f4", "[[E": "f5",
	"[15~": "f5", "[17~": "f6", "[18~": "f7", "[19~": "f8", "[20~": "f9", "[21~": "f10", "[23~": "f11", "[24~": "f12",
	"[A": "up", "[B": "down", "[C": "right", "[D": "left", "[E": "clear", "[F": "end", "[H": "home",
	"OA": "up", "OB": "down", "OC": "right", "OD": "left", "OE": "clear", "OF": "end", "OH": "home",
	"[1~": "home", "[2~": "insert", "[3~": "delete", "[4~": "end", "[5~": "pageup", "[6~": "pagedown",
	"[[5~": "pageup", "[[6~": "pagedown", "[7~": "home", "[8~": "end",
	"[a": "up shift", "[b": "down shift", "[c": "right shift", "[d": "left shift", "[e": "clear shift",
	"[2$": "insert shift", "[3$": "delete shift", "[5$": "pageup shift", "[6$": "pagedown shift", "[7$": "home shift", "[8$": "end shift",
	"Oa": "up ctrl", "Ob": "down ctrl", "Oc": "right ctrl", "Od": "left ctrl", "Oe": "clear ctrl",
	"[2^": "insert ctrl", "[3^": "delete ctrl", "[5^": "pageup ctrl", "[6^": "pagedown ctrl", "[7^": "home ctrl", "[8^": "end ctrl",
	"[Z": "tab shift",
}

// One key from the start of in: n is how many characters it used (0 when
// it needs more input)
func tnDecodeKey(in []rune) (key *TnKey, str string, emit bool, n int) {
	defer func() {
		if x := recover(); x != nil {
			if _, ok := x.(tnKeyNeedMore); !ok {
				panic(x)
			}
			key, str, emit, n = nil, "", false, 0
		}
	}()
	i := 0
	s := ""
	next := func() rune {
		if i >= len(in) {
			panic(tnKeyNeedMore{})
		}
		r := in[i]
		i++
		if r >= 0 {
			s += string(r)
		}
		return r
	}
	isDigit := func(r rune) bool { return r >= '0' && r <= '9' }
	k := &TnKey{}
	ch := next()
	escaped := false
	if ch == 0x1b {
		escaped = true
		ch = next()
		if ch == 0x1b {
			ch = next()
		}
	}
	if escaped && (ch == 'O' || ch == '[') {
		code := string(ch)
		modifier := 0
		if ch == 'O' {
			ch = next()
			if isDigit(ch) {
				modifier = int(ch-'0') - 1
				ch = next()
			}
			if ch >= 0 {
				code += string(ch)
			}
		} else {
			ch = next()
			if ch == '[' {
				code += "["
				ch = next()
			}
			// the command starts at ch (Node: s.length - 1)
			cmdStart := len(s) - 1
			if ch >= 0 {
				cmdStart = len(s) - utf8.RuneLen(ch)
			}
			if isDigit(ch) {
				ch = next()
				if isDigit(ch) {
					ch = next()
					if isDigit(ch) {
						ch = next()
					}
				}
			}
			if ch == ';' {
				ch = next()
				if isDigit(ch) {
					next()
				}
			}
			cmd := s[cmdStart:]
			if m := tnKeyTilde.FindStringSubmatch(cmd); m != nil {
				if m[4] != "" {
					code += m[4]
				} else {
					code += m[1] + m[3]
					modifier = 0
					if m[2] != "" {
						modifier, _ = strconv.Atoi(m[2])
						modifier--
					}
				}
			} else if m := tnKeyLetter.FindStringSubmatch(cmd); m != nil {
				code += m[4]
				modifier = 0
				if m[3] != "" {
					modifier, _ = strconv.Atoi(m[3])
					modifier--
				}
			} else {
				code += cmd
			}
		}
		k.ctrl = modifier&4 != 0
		k.meta = modifier&10 != 0
		k.shift = modifier&1 != 0
		k.code = code
		if named, ok := tnKeyCodes[code]; ok {
			parts := strings.SplitN(named, " ", 2)
			k.name = parts[0]
			if len(parts) == 2 && parts[1] == "shift" {
				k.shift = true
			} else if len(parts) == 2 {
				k.ctrl = true
			}
		} else {
			k.name = "undefined"
		}
	} else {
		named := true
		switch {
		case ch == '\\r':
			k.name, k.meta = "return", escaped
		case ch == '\\n':
			k.name, k.meta = "enter", escaped
		case ch == '\\t':
			k.name, k.meta = "tab", escaped
		case ch == '\\b' || ch == 0x7f:
			k.name, k.meta = "backspace", escaped
		case ch == 0x1b:
			k.name, k.meta = "escape", escaped
		case ch == ' ':
			k.name, k.meta = "space", escaped
		case !escaped && ch >= 0 && ch <= 0x1a:
			k.name, k.ctrl = string(rune(ch+'a'-1)), true
		case isDigit(ch) || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'):
			k.name = strings.ToLower(string(ch))
			k.shift = ch >= 'A' && ch <= 'Z'
			k.meta = escaped
		case escaped:
			if ch < 0 {
				k.name = "escape"
			} else {
				named = false
			}
			k.meta = true
		default:
			named = false
		}
		if !named && !escaped {
			k.sequence = s
			// a single unnamed character, e.g. "."
			return k, s, utf8.RuneCountInString(s) == 1, i
		}
	}
	k.sequence = s
	if escaped {
		return k, "", s != "", i
	}
	return k, s, s != "", i
}`;

export function registerReadline(r: NodeRegistry): void {
  defineModule(r, 'readline');
  defineModule(r, 'readline/promises');
  r.namespaces['readline.promises'] = 'readline/promises';
  defineHelper(r, 'question', ['fmt', 'strings'], ['stdinReader'], `func TnQuestion(prompt string) string {
	if prompt != "" {
		fmt.Print(prompt)
	}
	// One shared buffered reader: a fresh reader per call would discard
	// buffered stdin and hit EOF on the second question.
	line, err := tnStdin().ReadString('\\n')
	if err != nil && line == "" {
		panic(err)
	}
	return strings.TrimRight(line, "\\r\\n")
}`);
  r.functions['readline.question'] = (call: NodeCall) => {
    r.helper('question');
    return `TnQuestion(${call.args[0] ?? '""'})`;
  };
  setResults(r, 'readline', 'question=string');

  defineHelper(r, 'nodeReadline', ['strings'], ['nodeStream', 'nodeEvents', 'nodeInvoke', 'promise', 'eventLoop'], readlineHelper);
  const cls = defineClass(
    r,
    'readline.Interface',
    '*TnReadline',
    'class',
    'on=*TnEventEmitter; once=*TnEventEmitter; off=*TnEventEmitter; emit=bool; prompt=; setPrompt=; getPrompt=string; write=; pause=*TnReadline; resume=*TnReadline; close=; tnIterator=chan string',
    '',
    'closed=bool',
    ''
  );
  r.classes['readline/promises.Interface'] = cls;
  r.iterators['*TnReadline'] = 'tnIterator';
  for (const mod of ['readline', 'readline/promises']) {
    r.functions[`${mod}.createInterface`] = (call: NodeCall) => {
      r.helper('nodeReadline');
      return `TnCreateInterface(${call.args.join(', ')})`;
    };
    r.results[`${mod}.createInterface`] = '*TnReadline';
  }
  // question(query, cb) — or, without a callback, the readline/promises form
  r.methods['readline.Interface#question'] = (c: NodeCall) => {
    r.helper('nodeReadline');
    const last = c.nodes[c.nodes.length - 1];
    const hasCallback = c.nodes.length >= 2 && (last.kind === 'ArrowFunction' || last.kind === 'FunctionExpression' || c.types[c.types.length - 1].startsWith('func('));
    if (hasCallback) return `${c.recv}.question(${c.args.join(', ')})`;
    return `${c.recv}.questionAsync(${c.args.join(', ')})`;
  };
  r.typers['readline.Interface#question'] = (c: NodeCall) => {
    const last = c.nodes[c.nodes.length - 1];
    const hasCallback = c.nodes.length >= 2 && !!last && (last.kind === 'ArrowFunction' || last.kind === 'FunctionExpression');
    return hasCallback ? '' : 'chan string';
  };
  r.paramTypers['readline.Interface#question'] = (_n: any[]) => ['string'];
  r.paramTypers['readline.Interface#on'] = (nodes: any[]) => {
    const event = nodes[0];
    return event && event.kind === 'StringLiteral' && event.text === 'line' ? ['string'] : [];
  };
  r.paramTypers['readline.Interface#once'] = r.paramTypers['readline.Interface#on'];

  defineHelper(r, 'nodeKeypress', ['regexp', 'strconv', 'strings', 'unicode/utf8'], ['nodeStream', 'nodeEvents', 'timerWait'], keypressHelper);
  defineClass(r, 'readline.Key', '*TnKey', 'class', '', 'sequence=string; name=string; ctrl=bool; meta=bool; shift=bool; code=string', '', '');
  r.functions['readline.emitKeypressEvents'] = (call: NodeCall) => {
    r.helper('nodeKeypress');
    return `TnEmitKeypressEvents(${call.args.join(', ')})`;
  };
  r.results['readline.emitKeypressEvents'] = '';

  defineHelper(r, 'nodeReadlineCursor', [], ['nodeStream', 'nodeInvoke', 'eventLoop'], cursorHelper);
  const cursorFns: Record<string, string> = {
    cursorTo: 'TnCursorTo',
    moveCursor: 'TnMoveCursor',
    clearLine: 'TnClearLine',
    clearScreenDown: 'TnClearScreenDown'
  };
  for (const name of Object.keys(cursorFns)) {
    const goFn = cursorFns[name];
    r.functions[`readline.${name}`] = (call: NodeCall) => {
      r.helper('nodeReadlineCursor');
      return `${goFn}(${call.args.join(', ')})`;
    };
    r.results[`readline.${name}`] = 'bool';
    r.paramTypers[`readline.${name}`] = (_n: any[]) => ['*TnError'];
  }
}
