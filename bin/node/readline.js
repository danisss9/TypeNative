// node:readline (+ node:readline/promises): createInterface over any readable
// stream ('line' / 'close' events, question, prompt, for await). The
// module-level `question(prompt)` is a TypeNative extension: synchronous,
// used by the self-hosted compiler's prompts.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
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
		ch <- answer
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
export function registerReadline(r) {
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
    r.functions['readline.question'] = (call) => {
        r.helper('question');
        return `TnQuestion(${call.args[0] ?? '""'})`;
    };
    setResults(r, 'readline', 'question=string');
    defineHelper(r, 'nodeReadline', ['strings'], ['nodeStream', 'nodeEvents', 'nodeInvoke', 'promise', 'eventLoop'], readlineHelper);
    const cls = defineClass(r, 'readline.Interface', '*TnReadline', 'class', 'on=*TnEventEmitter; once=*TnEventEmitter; off=*TnEventEmitter; emit=bool; prompt=; setPrompt=; getPrompt=string; write=; pause=*TnReadline; resume=*TnReadline; close=; tnIterator=chan string', '', 'closed=bool', '');
    r.classes['readline/promises.Interface'] = cls;
    r.iterators['*TnReadline'] = 'tnIterator';
    for (const mod of ['readline', 'readline/promises']) {
        r.functions[`${mod}.createInterface`] = (call) => {
            r.helper('nodeReadline');
            return `TnCreateInterface(${call.args.join(', ')})`;
        };
        r.results[`${mod}.createInterface`] = '*TnReadline';
    }
    // question(query, cb) — or, without a callback, the readline/promises form
    r.methods['readline.Interface#question'] = (c) => {
        r.helper('nodeReadline');
        const last = c.nodes[c.nodes.length - 1];
        const hasCallback = c.nodes.length >= 2 && (last.kind === 'ArrowFunction' || last.kind === 'FunctionExpression' || c.types[c.types.length - 1].startsWith('func('));
        if (hasCallback)
            return `${c.recv}.question(${c.args.join(', ')})`;
        return `${c.recv}.questionAsync(${c.args.join(', ')})`;
    };
    r.typers['readline.Interface#question'] = (c) => {
        const last = c.nodes[c.nodes.length - 1];
        const hasCallback = c.nodes.length >= 2 && !!last && (last.kind === 'ArrowFunction' || last.kind === 'FunctionExpression');
        return hasCallback ? '' : 'chan string';
    };
    r.paramTypers['readline.Interface#question'] = (_n) => ['string'];
    r.paramTypers['readline.Interface#on'] = (nodes) => {
        const event = nodes[0];
        return event && event.kind === 'StringLiteral' && event.text === 'line' ? ['string'] : [];
    };
    r.paramTypers['readline.Interface#once'] = r.paramTypers['readline.Interface#on'];
    defineHelper(r, 'nodeReadlineCursor', [], ['nodeStream', 'nodeInvoke', 'eventLoop'], cursorHelper);
    const cursorFns = {
        cursorTo: 'TnCursorTo',
        moveCursor: 'TnMoveCursor',
        clearLine: 'TnClearLine',
        clearScreenDown: 'TnClearScreenDown'
    };
    for (const name of Object.keys(cursorFns)) {
        const goFn = cursorFns[name];
        r.functions[`readline.${name}`] = (call) => {
            r.helper('nodeReadlineCursor');
            return `${goFn}(${call.args.join(', ')})`;
        };
        r.results[`readline.${name}`] = 'bool';
        r.paramTypers[`readline.${name}`] = (_n) => ['*TnError'];
    }
}
