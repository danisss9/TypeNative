// node:readline (+ node:readline/promises): createInterface over any readable
// stream ('line' / 'close' events, question, prompt, for await). In terminal
// mode (terminal: true, or stdin and stdout both terminals) keypresses drive a
// line editor: cursor keys, Emacs-style ctrl / meta keys, history (up / down,
// prefix search, 'history' events) and a completer on Tab. The
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
	// terminal mode: the line being edited and the cursor in it (characters)
	terminal     bool
	line         []rune
	cursor       int
	history      []string
	historySize  int
	historyIndex int
	// (the text up to the cursor when history browsing began: a prefix search)
	search       *string
	removeDups   bool
	completer    interface{}
	lastTab      bool
	sawReturn    bool
	rawMode      bool
	oldPrompt    *string
}

// rl.getCursorPos(): where the cursor is, counting the prompt
type TnCursorPos struct {
	rows float64
	cols float64
}

func TnCreateInterface(options interface{}, rest ...interface{}) *TnReadline {
	rl := &TnReadline{promptText: "> ", historySize: 30, historyIndex: -1}
	var input, output interface{}
	terminal, terminalSet := false, false
	if s, ok := options.(tnStreamLike); ok {
		input = s
		if len(rest) > 0 {
			output = rest[0]
		}
		if len(rest) > 1 && tnRlIsFunc(rest[1]) {
			rl.completer = rest[1]
		}
		if len(rest) > 2 {
			if b, ok := rest[2].(bool); ok {
				terminal, terminalSet = b, true
			}
		}
	} else if options != nil {
		input = TnGet(options, "input")
		output = TnGet(options, "output")
		if p, ok := TnGetValue(options, "prompt").(string); ok {
			rl.promptText = p
		}
		if b, ok := TnGetValue(options, "terminal").(bool); ok {
			terminal, terminalSet = b, true
		}
		if fn := TnGet(options, "completer"); tnRlIsFunc(fn) {
			rl.completer = fn
		}
		if n, ok := TnGetValue(options, "historySize").(float64); ok {
			if n < 0 {
				panic(TnNodeError("RangeError", "ERR_INVALID_ARG_VALUE", "The argument 'historySize' must be a non-negative number"))
			}
			rl.historySize = int(n)
		}
		if b, ok := TnGetValue(options, "removeHistoryDuplicates").(bool); ok {
			rl.removeDups = b
		}
		if h := reflect.ValueOf(TnGetValue(options, "history")); h.IsValid() {
			if h.Kind() == reflect.Pointer && !h.IsNil() {
				h = h.Elem()
			}
			if h.Kind() == reflect.Slice {
				for i := 0; i < h.Len(); i++ {
					rl.history = append(rl.history, TnJSString(h.Index(i).Interface()))
				}
			}
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
	// (Node's default: a terminal when the output is one; here stdin and stdout)
	if !terminalSet {
		terminal = rl.input == tnStdinStream && rl.output == tnStdoutStream && TnIsTTY(os.Stdin) && TnIsTTY(os.Stdout)
	}
	if terminal {
		rl.startTerminal()
		return rl
	}
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

func tnRlIsFunc(v interface{}) bool {
	if v == nil {
		return false
	}
	rv := reflect.ValueOf(v)
	return rv.Kind() == reflect.Func && !rv.IsNil()
}

// --- terminal mode: a line editor over 'keypress' events ---

func (rl *TnReadline) startTerminal() {
	rl.terminal = true
	if len(rl.history) > rl.historySize {
		rl.history = rl.history[:rl.historySize]
	}
	rl.input.TnEventEmitter.on("keypress", func(str string, key *TnKey) {
		if !rl.closed {
			rl.ttyWrite(str, key)
		}
	})
	TnEmitKeypressEvents(rl.input)
	rl.input.TnEventEmitter.once("end", func() { rl.close() })
	if rl.input == tnStdinStream {
		if TnIsTTY(os.Stdin) && tnSetRawMode(os.Stdin, true) {
			rl.rawMode = true
			tnStdinRaw = true
			tnResetStdio = func() { tnSetRawMode(os.Stdin, false) }
		}
		rl.input.stdinRef(true)
	}
}

func (rl *TnReadline) Get_line() string     { return string(rl.line) }
func (rl *TnReadline) Get_cursor() float64  { return float64(rl.cursor) }
func (rl *TnReadline) Get_terminal() bool   { return rl.terminal }
func (rl *TnReadline) Get_history() []string {
	if rl.history == nil {
		return []string{}
	}
	return rl.history
}

func (rl *TnReadline) getCursorPos() *TnCursorPos {
	return &TnCursorPos{rows: 0, cols: float64(utf8.RuneCountInString(rl.promptText) + rl.cursor)}
}

// Redraws the prompt and the line, then puts the cursor back
func (rl *TnReadline) refreshLine() {
	col := utf8.RuneCountInString(rl.promptText) + rl.cursor
	rl.writeOut("\\x1b[1G\\x1b[0J" + rl.promptText + string(rl.line) + "\\x1b[" + strconv.Itoa(col+1) + "G")
}

func (rl *TnReadline) moveCursor(dx int) {
	to := rl.cursor + dx
	if to < 0 {
		to = 0
	}
	if to > len(rl.line) {
		to = len(rl.line)
	}
	d := to - rl.cursor
	rl.cursor = to
	if d < 0 {
		rl.writeOut("\\x1b[" + strconv.Itoa(-d) + "D")
	} else if d > 0 {
		rl.writeOut("\\x1b[" + strconv.Itoa(d) + "C")
	}
}

func (rl *TnReadline) insertString(text string) {
	if text == "" {
		return
	}
	r := []rune(text)
	if rl.cursor < len(rl.line) {
		rl.line = append(rl.line[:rl.cursor], append(r, rl.line[rl.cursor:]...)...)
		rl.cursor += len(r)
		rl.refreshLine()
		return
	}
	rl.line = append(rl.line, r...)
	rl.cursor += len(r)
	rl.writeOut(text)
}

func (rl *TnReadline) setLine(text []rune, cursor int) {
	rl.line = text
	rl.cursor = cursor
	rl.refreshLine()
}

func (rl *TnReadline) deleteLeft() {
	if rl.cursor > 0 {
		rl.setLine(append(append([]rune{}, rl.line[:rl.cursor-1]...), rl.line[rl.cursor:]...), rl.cursor-1)
	}
}

func (rl *TnReadline) deleteRight() {
	if rl.cursor < len(rl.line) {
		rl.setLine(append(append([]rune{}, rl.line[:rl.cursor]...), rl.line[rl.cursor+1:]...), rl.cursor)
	}
}

func tnRlWordChar(r rune) bool { return !unicode.IsSpace(r) && !unicode.IsPunct(r) }

// The start of the word before the cursor, and the end of the one after it
func (rl *TnReadline) wordLeft() int {
	i := rl.cursor
	for i > 0 && !tnRlWordChar(rl.line[i-1]) {
		i--
	}
	for i > 0 && tnRlWordChar(rl.line[i-1]) {
		i--
	}
	return i
}

func (rl *TnReadline) wordRight() int {
	i := rl.cursor
	for i < len(rl.line) && !tnRlWordChar(rl.line[i]) {
		i++
	}
	for i < len(rl.line) && tnRlWordChar(rl.line[i]) {
		i++
	}
	return i
}

func (rl *TnReadline) deleteRange(from, to int) {
	if from < to {
		rl.setLine(append(append([]rune{}, rl.line[:from]...), rl.line[to:]...), from)
	}
}

// Up / down: older and newer entries that start with what was typed
func (rl *TnReadline) historyStep(older bool) {
	if rl.search == nil {
		prefix := string(rl.line[:rl.cursor])
		rl.search = &prefix
	}
	search := *rl.search
	current := string(rl.line)
	if older {
		if len(rl.history) == 0 || rl.historyIndex >= len(rl.history) {
			return
		}
		i := rl.historyIndex + 1
		for i < len(rl.history) && (!strings.HasPrefix(rl.history[i], search) || rl.history[i] == current) {
			i++
		}
		rl.historyIndex = i
		if i == len(rl.history) {
			rl.setLine([]rune(search), utf8.RuneCountInString(search))
			return
		}
		rl.setLine([]rune(rl.history[i]), utf8.RuneCountInString(rl.history[i]))
		return
	}
	if rl.historyIndex < 0 {
		return
	}
	i := rl.historyIndex - 1
	for i >= 0 && (!strings.HasPrefix(rl.history[i], search) || rl.history[i] == current) {
		i--
	}
	rl.historyIndex = i
	if i < 0 {
		rl.setLine([]rune(search), utf8.RuneCountInString(search))
		return
	}
	rl.setLine([]rune(rl.history[i]), utf8.RuneCountInString(rl.history[i]))
}

func (rl *TnReadline) addHistory(text string) {
	if text == "" || rl.historySize == 0 {
		return
	}
	if len(rl.history) == 0 || rl.history[0] != text {
		if rl.removeDups {
			kept := rl.history[:0:0]
			for _, h := range rl.history {
				if h != text {
					kept = append(kept, h)
				}
			}
			rl.history = kept
		}
		rl.history = append([]string{text}, rl.history...)
		if len(rl.history) > rl.historySize {
			rl.history = rl.history[:rl.historySize]
		}
	}
	rl.emit("history", rl.history)
}

// Return: the line is done
func (rl *TnReadline) ttyLine() {
	text := string(rl.line)
	rl.addHistory(text)
	rl.historyIndex = -1
	rl.search = nil
	rl.line = nil
	rl.cursor = 0
	rl.writeOut("\\r\\n")
	if rl.oldPrompt != nil {
		rl.promptText = *rl.oldPrompt
		rl.oldPrompt = nil
	}
	rl.onLine(text)
}

// Tab: the completer's [completions, substring]; a common prefix is applied,
// a second Tab lists the completions
func (rl *TnReadline) tabComplete(lastWasTab bool) {
	text := string(rl.line[:rl.cursor])
	apply := func(result interface{}) {
		rv := reflect.ValueOf(result)
		if rv.IsValid() && rv.Kind() == reflect.Pointer && !rv.IsNil() {
			rv = rv.Elem()
		}
		if !rv.IsValid() || (rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array) || rv.Len() < 2 {
			return
		}
		hitsV := reflect.ValueOf(rv.Index(0).Interface())
		if hitsV.IsValid() && hitsV.Kind() == reflect.Pointer && !hitsV.IsNil() {
			hitsV = hitsV.Elem()
		}
		completeOn := TnJSString(rv.Index(1).Interface())
		hits := []string{}
		if hitsV.IsValid() && hitsV.Kind() == reflect.Slice {
			for i := 0; i < hitsV.Len(); i++ {
				hits = append(hits, TnJSString(hitsV.Index(i).Interface()))
			}
		}
		if len(hits) == 0 {
			return
		}
		prefix := ""
		first := true
		for _, h := range hits {
			if h == "" {
				continue
			}
			if first {
				prefix, first = h, false
				continue
			}
			for !strings.HasPrefix(h, prefix) {
				_, size := utf8.DecodeLastRuneInString(prefix)
				prefix = prefix[:len(prefix)-size]
			}
		}
		onLen := utf8.RuneCountInString(completeOn)
		if strings.HasPrefix(prefix, completeOn) && len(prefix) > len(completeOn) {
			rl.insertString(prefix[len(completeOn):])
			return
		}
		if !strings.HasPrefix(completeOn, prefix) && onLen <= rl.cursor {
			start := rl.cursor - onLen
			p := []rune(prefix)
			rl.setLine(append(append(append([]rune{}, rl.line[:start]...), p...), rl.line[rl.cursor:]...), start+len(p))
			return
		}
		if !lastWasTab || len(hits) < 2 {
			return
		}
		rl.writeOut("\\r\\n" + strings.Join(hits, "  ") + "\\r\\n")
		rl.refreshLine()
	}
	fv := reflect.ValueOf(rl.completer)
	if fv.Type().NumIn() >= 2 {
		// completer(line, callback(err, result))
		TnInvoke(rl.completer, text, func(err interface{}, result interface{}) {
			if err == nil || TnIsNil(err) {
				apply(result)
			}
		})
		return
	}
	result := TnInvoke(rl.completer, text)
	if rv := reflect.ValueOf(result); rv.IsValid() && rv.Kind() == reflect.Chan {
		// (an async completer: its promise)
		go func() {
			v, ok := rv.Recv()
			if !ok {
				return
			}
			TnLoopPost(func() { apply(v.Interface()) })
		}()
		return
	}
	apply(result)
}

// One keypress
func (rl *TnReadline) ttyWrite(str string, key *TnKey) {
	if key == nil {
		key = &TnKey{}
	}
	lastWasTab := rl.lastTab
	rl.lastTab = false
	if key.name != "up" && key.name != "down" {
		rl.search = nil
	}
	if key.name != "enter" {
		defer func() { rl.sawReturn = key.name == "return" }()
	}
	if key.ctrl && key.shift {
		switch key.name {
		case "backspace":
			rl.deleteRange(0, rl.cursor)
		case "delete":
			rl.deleteRange(rl.cursor, len(rl.line))
		}
		return
	}
	if key.ctrl {
		switch key.name {
		case "c":
			if rl.listenerCount("SIGINT") > 0 {
				rl.emit("SIGINT")
			} else {
				rl.close()
			}
		case "h":
			rl.deleteLeft()
		case "d":
			if rl.cursor == 0 && len(rl.line) == 0 {
				rl.close()
			} else {
				rl.deleteRight()
			}
		case "u":
			rl.deleteRange(0, rl.cursor)
		case "k":
			rl.deleteRange(rl.cursor, len(rl.line))
		case "a":
			rl.moveCursor(-rl.cursor)
		case "e":
			rl.moveCursor(len(rl.line) - rl.cursor)
		case "b":
			rl.moveCursor(-1)
		case "f":
			rl.moveCursor(1)
		case "l":
			rl.writeOut("\\x1b[1;1H\\x1b[0J")
			rl.refreshLine()
		case "n":
			rl.historyStep(false)
		case "p":
			rl.historyStep(true)
		case "w", "backspace":
			rl.deleteRange(rl.wordLeft(), rl.cursor)
		case "delete":
			rl.deleteRange(rl.cursor, rl.wordRight())
		case "left":
			rl.moveCursor(rl.wordLeft() - rl.cursor)
		case "right":
			rl.moveCursor(rl.wordRight() - rl.cursor)
		}
		return
	}
	if key.meta {
		switch key.name {
		case "b":
			rl.moveCursor(rl.wordLeft() - rl.cursor)
		case "f":
			rl.moveCursor(rl.wordRight() - rl.cursor)
		case "d", "delete":
			rl.deleteRange(rl.cursor, rl.wordRight())
		case "backspace":
			rl.deleteRange(rl.wordLeft(), rl.cursor)
		}
		return
	}
	switch key.name {
	case "return":
		rl.ttyLine()
		return
	case "enter":
		// (\\r\\n: the \\n after a return is part of it)
		if rl.sawReturn {
			rl.sawReturn = false
			return
		}
		rl.ttyLine()
		return
	case "backspace":
		rl.deleteLeft()
		return
	case "delete":
		rl.deleteRight()
		return
	case "left":
		rl.moveCursor(-1)
		return
	case "right":
		rl.moveCursor(1)
		return
	case "home":
		rl.moveCursor(-rl.cursor)
		return
	case "end":
		rl.moveCursor(len(rl.line) - rl.cursor)
		return
	case "up":
		rl.historyStep(true)
		return
	case "down":
		rl.historyStep(false)
		return
	case "tab":
		if rl.completer != nil {
			rl.lastTab = true
			rl.tabComplete(lastWasTab)
			return
		}
	}
	// text (rl.write('a\\nb') splits into lines)
	if str == "" {
		return
	}
	text := strings.ReplaceAll(strings.ReplaceAll(str, "\\r\\n", "\\n"), "\\r", "\\n")
	pieces := strings.Split(text, "\\n")
	for i, piece := range pieces {
		if i > 0 {
			rl.ttyLine()
		}
		rl.insertString(piece)
	}
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
	rl.askQuestion(query)
	if len(args) > 0 {
		rl.pendingQuestion = args[len(args)-1]
	}
}

// A question is the prompt until it's answered (terminal mode)
func (rl *TnReadline) askQuestion(query string) {
	if !rl.terminal {
		rl.writeOut(query)
		return
	}
	if rl.oldPrompt == nil {
		old := rl.promptText
		rl.oldPrompt = &old
	}
	rl.promptText = query
	rl.cursor = len(rl.line)
	rl.refreshLine()
}

// readline/promises: question(query) resolves with the answer
func (rl *TnReadline) questionAsync(query string, options ...interface{}) chan string {
	ch := make(chan string, 1)
	if rl.closed {
		TnReject(ch, TnNodeError("Error", "ERR_USE_AFTER_CLOSE", "readline was closed"))
		return ch
	}
	TnLoopRef()
	rl.askQuestion(query)
	rl.pendingQuestion = func(answer string) {
		TnLoopUnref()
		TnAsyncSend(ch, answer)
	}
	return ch
}

func (rl *TnReadline) prompt(preserveCursor ...bool) {
	if !rl.terminal {
		rl.writeOut(rl.promptText)
		return
	}
	if len(preserveCursor) == 0 || !preserveCursor[0] {
		rl.cursor = 0
	}
	rl.refreshLine()
}
func (rl *TnReadline) setPrompt(p string)             { rl.promptText = p }
func (rl *TnReadline) getPrompt() string              { return rl.promptText }
func (rl *TnReadline) write(data interface{}, key ...interface{}) {
	if !rl.terminal {
		rl.feed(TnJSString(data))
		return
	}
	// rl.write(text) types it; rl.write(null, { ctrl: true, name: 'u' }) presses a key
	k := &TnKey{}
	if len(key) > 0 && key[0] != nil && !TnIsNil(key[0]) {
		if tk, ok := key[0].(*TnKey); ok {
			k = tk
		} else {
			k.name, _ = TnGetValue(key[0], "name").(string)
			k.ctrl, _ = TnGetValue(key[0], "ctrl").(bool)
			k.meta, _ = TnGetValue(key[0], "meta").(bool)
			k.shift, _ = TnGetValue(key[0], "shift").(bool)
		}
	}
	text := ""
	if data != nil && !TnIsNil(data) {
		text = TnJSString(data)
	}
	rl.ttyWrite(text, k)
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
	if rl.rawMode {
		rl.rawMode = false
		tnSetRawMode(os.Stdin, false)
		tnStdinRaw = false
	}
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
    defineHelper(r, 'nodeReadline', ['os', 'reflect', 'strconv', 'strings', 'unicode', 'unicode/utf8'], ['nodeStream', 'nodeEvents', 'nodeInvoke', 'promise', 'eventLoop', 'nodeKeypress', 'nodeTty'], readlineHelper);
    const cls = defineClass(r, 'readline.Interface', '*TnReadline', 'class', 'on=*TnEventEmitter; once=*TnEventEmitter; off=*TnEventEmitter; emit=bool; prompt=; setPrompt=; getPrompt=string; write=; pause=*TnReadline; resume=*TnReadline; close=; tnIterator=chan string; getCursorPos=*TnCursorPos', '', 'closed=bool; line=string; cursor=float64; terminal=bool; history=[]string', '');
    defineClass(r, 'readline.CursorPos', '*TnCursorPos', 'class', '', 'rows=float64; cols=float64', '', '');
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
        if (event && event.kind === 'StringLiteral' && event.text === 'history')
            return ['[]string'];
        return event && event.kind === 'StringLiteral' && event.text === 'line' ? ['string'] : [];
    };
    r.paramTypers['readline.Interface#once'] = r.paramTypers['readline.Interface#on'];
    defineHelper(r, 'nodeKeypress', ['regexp', 'strconv', 'strings', 'unicode/utf8'], ['nodeStream', 'nodeEvents', 'timerWait'], keypressHelper);
    defineClass(r, 'readline.Key', '*TnKey', 'class', '', 'sequence=string; name=string; ctrl=bool; meta=bool; shift=bool; code=string', '', '');
    r.functions['readline.emitKeypressEvents'] = (call) => {
        r.helper('nodeKeypress');
        return `TnEmitKeypressEvents(${call.args.join(', ')})`;
    };
    r.results['readline.emitKeypressEvents'] = '';
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
