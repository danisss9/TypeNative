// The JS regex engine of compiled programs (Go source, the fancyRegex helper's
// engine): a backtracking VM over a flat program. tnRxCompile flattens the
// parser's tree; tnRxMatcher.run executes it on byte offsets with an explicit
// stack, so a match allocates nothing but its result.
const REGEX_VM = `// ---- Regex VM ----
const (
	tnRxChar       = iota // one ASCII byte (c)
	tnRxLit               // a string (lit)
	tnRxSet               // one rune of a set
	tnRxSplit             // try x, then y
	tnRxSplitFirst        // the same, but x only when the next byte can start it (first)
	tnRxSplitLazy         // try x, then y, but x only when the next byte can start it (first)
	tnRxJmp               // go to x
	tnRxSave              // the position into slot x
	tnRxBol               // ^
	tnRxBolLine           // ^ with m
	tnRxEol               // $
	tnRxEolLine           // $ with m
	tnRxWordB             // \\\\b
	tnRxNotWordB          // \\\\B
	tnRxBackref           // the text of group slots x, x+1
	tnRxBackrefFold       // the same, ignoring case
	tnRxLook              // a lookaround: its body follows, the rest of the pattern is at y
	tnRxLookEnd           // the end of a lookaround's body
	tnRxPeek              // a lookahead of one rune (set)
	tnRxRepGreedy         // a greedy repeat of one rune (set, min, max)
	tnRxRepLazy           // the lazy one
	tnRxLoopInit          // a counted loop starts: registers x, x+1
	tnRxLoopHead          // iterate (next instruction) or leave (y)
	tnRxLoopEnter         // an iteration starts
	tnRxLoopTail          // an iteration ends: back to y
	tnRxResetCaps         // slots x up to y are unset (each iteration, as in JS)
	tnRxEnd               // the match
)

// Backtrack stack entries
const (
	tnRxChoice  = iota // resume at pc, pos
	tnRxUndo           // slot pc held pos
	tnRxGreedy         // a tnRxRepGreedy at pc can give back n more runes
	tnRxLazy           // a tnRxRepLazy at pc can take n more runes (-1: no limit)
	tnRxBarrier        // a lookaround's start
)

type tnRxCharSet struct {
	ascii [utf8.RuneSelf]bool
	match func(rune) bool // (any rune; ascii answers for the ASCII ones)
	high  bool            // it can match a non-ASCII rune
}

type tnRxInst struct {
	op         uint8
	c          byte
	neg        bool
	behind     bool
	greedy     bool
	possessive bool  // what follows can't match inside the repeat: nothing to give back
	next       int16 // the byte what follows must start with (-1: unknown)
	x, y       int32
	min, max   int32
	set        *tnRxCharSet
	first      *[256]bool
	lit        string
}

type tnRxProg struct {
	insts      []tnRxInst
	ncaps      int // capture slots
	nslots     int // capture slots, then loop registers
	first      *[256]bool // the bytes a match can start with (nil: it can be empty)
	prefix     string     // the text every match starts with
	anchored   bool       // it can only match at the input's start
	contextual bool       // its ^, \\\\b or \\\\B see the text before the match
	limit      int        // backtracks before RE2 takes over (0: RE2 can't run it)
}

type tnRxFrame struct {
	kind int32
	pc   int32
	pos  int
	n    int
}

type tnRxMatcher struct {
	s     string
	caps  []int
	stack []tnRxFrame
	chunk []string // what's left of the block match arrays are carved from
	end   int
	steps int
	limit int
	over  bool
}

// (one idle matcher: regexes run one at a time, unless workers share them)
var tnRxIdle atomic.Pointer[tnRxMatcher]

func tnRxAcquire(p *tnRxProg, s string, start int) *tnRxMatcher {
	m := tnRxIdle.Swap(nil)
	if m == nil {
		m = &tnRxMatcher{stack: make([]tnRxFrame, 0, 256)}
	}
	if cap(m.caps) < p.nslots {
		m.caps = make([]int, p.nslots, p.nslots+16)
	}
	m.caps = m.caps[:p.nslots]
	m.s, m.steps, m.over, m.limit = s, 0, false, 0
	// (past offset 0 RE2 can't serve a contextual pattern: no budget, as JS)
	if p.limit > 0 && (start == 0 || !p.contextual) {
		m.limit = p.limit + 8*len(s)
	}
	return m
}

func tnRxRelease(m *tnRxMatcher) {
	m.s = ""
	if cap(m.stack) > 1<<16 {
		m.stack = make([]tnRxFrame, 0, 256)
	}
	tnRxIdle.Store(m)
}

// A miss found without running anything
func (p *tnRxProg) miss(s string, start int, sticky bool) bool {
	if p.anchored && start > 0 {
		return true
	}
	if sticky || p.anchored {
		return p.first != nil && (start >= len(s) || !p.first[s[start]])
	}
	return p.candidate(s, start) < 0
}

// The next place at or after pos a match can start (-1: none)
func (p *tnRxProg) candidate(s string, pos int) int {
	if p.prefix != "" {
		i := strings.Index(s[pos:], p.prefix)
		if i < 0 {
			return -1
		}
		return pos + i
	}
	if p.first != nil {
		for pos < len(s) && !p.first[s[pos]] {
			pos++
		}
		if pos == len(s) {
			return -1
		}
	}
	return pos
}

// The leftmost match at or after start (only at start when sticky), or -1;
// its captures are in m.caps, its end in m.end
func (p *tnRxProg) search(m *tnRxMatcher, start int, sticky bool) int {
	s := m.s
	scan := !sticky && !p.anchored
	for pos := start; ; {
		if scan {
			if pos = p.candidate(s, pos); pos < 0 {
				return -1
			}
		}
		caps := m.caps[:p.ncaps]
		for i := range caps {
			caps[i] = -1
		}
		m.stack = m.stack[:0]
		if m.run(p.insts, 0, pos, -1) {
			return pos
		}
		if !scan || m.over || pos >= len(s) {
			return -1
		}
		if s[pos] < utf8.RuneSelf {
			pos++
		} else {
			_, w := utf8.DecodeRuneInString(s[pos:])
			pos += w
		}
	}
}

// Line terminators (as JS defines them) around a byte offset
// The match array of the match at lo, hi: n groups from the captures
func (m *tnRxMatcher) groups(n int, lo int, hi int) []string {
	s := m.s
	// (capped at their hidden slots: an append moves them out of the chunk)
	if len(m.chunk) < n+2 {
		m.chunk = make([]string, max(n+2, 256))
	}
	groups := m.chunk[:n:n+2]
	m.chunk = m.chunk[n+2:]
	groups[0] = s[lo:hi]
	for i := 1; i < n; i++ {
		if a, b := m.caps[2*i], m.caps[2*i+1]; a >= 0 && b >= a {
			groups[i] = s[a:b]
		} else {
			groups[i] = tnUnmatched
		}
	}
	tnMatchTag(groups, s, lo)
	return groups
}

func tnRxLineEndAt(s string, pos int) bool {
	switch c := s[pos]; c {
	case '\\n', '\\r':
		return true
	case 0xe2:
		return strings.HasPrefix(s[pos:], "\\u2028") || strings.HasPrefix(s[pos:], "\\u2029")
	}
	return false
}

func tnRxLineEndBefore(s string, pos int) bool {
	if c := s[pos-1]; c == '\\n' || c == '\\r' {
		return true
	}
	return pos >= 3 && (s[pos-3:pos] == "\\u2028" || s[pos-3:pos] == "\\u2029")
}

var tnRxWord = func() (t [256]bool) {
	for c := range t {
		t[c] = c == '_' || c >= '0' && c <= '9' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z'
	}
	return
}()

// Runs from pc at pos until tnRxEnd, or tnRxLookEnd (at target, when one is
// given). True leaves the frames it pushed on the stack; false unwinds them.
func (m *tnRxMatcher) run(prog []tnRxInst, pc int32, pos int, target int) bool {
	s, caps, st := m.s, m.caps, m.stack
	base := len(st)
vm:
	for {
		in := &prog[pc]
		// (a case that matches continues; one that falls out of the switch fails)
		switch in.op {
		case tnRxChar:
			if pos < len(s) && s[pos] == in.c {
				pos++
				pc++
				continue
			}
		case tnRxLit:
			if strings.HasPrefix(s[pos:], in.lit) {
				pos += len(in.lit)
				pc++
				continue
			}
		case tnRxSet:
			if pos < len(s) {
				if c := s[pos]; c < utf8.RuneSelf {
					if in.set.ascii[c] {
						pos++
						pc++
						continue
					}
				} else if r, w := utf8.DecodeRuneInString(s[pos:]); in.set.match(r) {
					pos += w
					pc++
					continue
				}
			}
		case tnRxSplit:
			st = append(st, tnRxFrame{kind: tnRxChoice, pc: in.y, pos: pos})
			pc = in.x
			continue
		case tnRxSplitFirst:
			if pos < len(s) && in.first[s[pos]] {
				st = append(st, tnRxFrame{kind: tnRxChoice, pc: in.y, pos: pos})
				pc = in.x
			} else {
				pc = in.y
			}
			continue
		case tnRxSplitLazy:
			// (a lazy loop's exit: only worth trying where what follows can start)
			if pos < len(s) && !in.first[s[pos]] {
				pc = in.y
			} else {
				st = append(st, tnRxFrame{kind: tnRxChoice, pc: in.y, pos: pos})
				pc = in.x
			}
			continue
		case tnRxJmp:
			pc = in.x
			continue
		case tnRxSave:
			if len(st) > 0 {
				st = append(st, tnRxFrame{kind: tnRxUndo, pc: in.x, pos: caps[in.x]})
			}
			caps[in.x] = pos
			pc++
			continue
		case tnRxBol:
			if pos == 0 {
				pc++
				continue
			}
		case tnRxBolLine:
			if pos == 0 || tnRxLineEndBefore(s, pos) {
				pc++
				continue
			}
		case tnRxEol:
			if pos == len(s) {
				pc++
				continue
			}
		case tnRxEolLine:
			if pos == len(s) || tnRxLineEndAt(s, pos) {
				pc++
				continue
			}
		case tnRxWordB, tnRxNotWordB:
			boundary := (pos > 0 && tnRxWord[s[pos-1]]) != (pos < len(s) && tnRxWord[s[pos]])
			if boundary == (in.op == tnRxWordB) {
				pc++
				continue
			}
		case tnRxBackref:
			a, b := caps[in.x], caps[in.x+1]
			if a < 0 || b < 0 {
				pc++
				continue
			}
			if pos+b-a <= len(s) && s[pos:pos+b-a] == s[a:b] {
				pos += b - a
				pc++
				continue
			}
		case tnRxBackrefFold:
			a, b := caps[in.x], caps[in.x+1]
			if a < 0 || b < 0 {
				pc++
				continue
			}
			p, same := pos, true
			for _, r := range s[a:b] {
				if p >= len(s) {
					same = false
					break
				}
				r2, w := utf8.DecodeRuneInString(s[p:])
				if unicode.ToLower(r) != unicode.ToLower(r2) {
					same = false
					break
				}
				p += w
			}
			if same {
				pos = p
				pc++
				continue
			}
		case tnRxLook:
			// (a lookahead whose body can't start at the next byte)
			if in.first != nil && pos < len(s) && !in.first[s[pos]] {
				if in.neg {
					pc = in.y
					continue
				}
				break
			}
			// (the barrier keeps undo entries on: a body's captures must be undone)
			st = append(st, tnRxFrame{kind: tnRxBarrier})
			mark := len(st)
			m.stack = st
			matched := false
			if !in.behind {
				matched = m.run(prog, pc+1, pos, -1)
			} else {
				// (starts from pos back, as far as the lookbehind's longest match)
				start := pos
				for steps := 0; ; steps++ {
					if m.run(prog, pc+1, start, pos) {
						matched = true
						break
					}
					if m.over || start == 0 || (in.max >= 0 && steps >= int(in.max)) {
						break
					}
					if s[start-1] < utf8.RuneSelf {
						start--
					} else {
						_, w := utf8.DecodeLastRuneInString(s[:start])
						start -= w
					}
				}
			}
			st = m.stack
			if m.over {
				m.stack = st[:base]
				return false
			}
			if matched && !in.neg {
				// atomic: its choices go, but its captures stay undoable
				w := mark - 1
				for i := mark; i < len(st); i++ {
					if st[i].kind == tnRxUndo {
						st[w] = st[i]
						w++
					}
				}
				st = st[:w]
				pc = in.y
				continue
			}
			if matched {
				for i := len(st) - 1; i >= mark; i-- {
					if st[i].kind == tnRxUndo {
						caps[st[i].pc] = st[i].pos
					}
				}
			}
			st = st[:mark-1]
			if !matched && in.neg {
				pc = in.y
				continue
			}
		case tnRxLookEnd:
			if target < 0 || pos == target {
				m.stack = st
				return true
			}
		case tnRxPeek:
			hit := false
			if pos < len(s) {
				if c := s[pos]; c < utf8.RuneSelf {
					hit = in.set.ascii[c]
				} else {
					r, _ := utf8.DecodeRuneInString(s[pos:])
					hit = in.set.match(r)
				}
			}
			if hit != in.neg {
				pc++
				continue
			}
		case tnRxRepGreedy:
			set, count := in.set, 0
			for pos < len(s) && (in.max < 0 || count < int(in.max)) {
				if c := s[pos]; c < utf8.RuneSelf {
					if !set.ascii[c] {
						break
					}
					pos++
				} else {
					r, w := utf8.DecodeRuneInString(s[pos:])
					if !set.match(r) {
						break
					}
					pos += w
				}
				count++
			}
			if count >= int(in.min) {
				if extra := count - int(in.min); extra > 0 && !in.possessive {
					st = append(st, tnRxFrame{kind: tnRxGreedy, pc: pc, pos: pos, n: extra})
				}
				pc++
				continue
			}
		case tnRxRepLazy:
			set, count := in.set, 0
			for count < int(in.min) && pos < len(s) {
				if c := s[pos]; c < utf8.RuneSelf {
					if !set.ascii[c] {
						break
					}
					pos++
				} else {
					r, w := utf8.DecodeRuneInString(s[pos:])
					if !set.match(r) {
						break
					}
					pos += w
				}
				count++
			}
			if count >= int(in.min) {
				if in.max < 0 {
					st = append(st, tnRxFrame{kind: tnRxLazy, pc: pc, pos: pos, n: -1})
				} else if in.max > in.min {
					st = append(st, tnRxFrame{kind: tnRxLazy, pc: pc, pos: pos, n: int(in.max - in.min)})
				}
				pc++
				continue
			}
		case tnRxLoopInit:
			if len(st) > 0 {
				st = append(st, tnRxFrame{kind: tnRxUndo, pc: in.x, pos: caps[in.x]}, tnRxFrame{kind: tnRxUndo, pc: in.x + 1, pos: caps[in.x+1]})
			}
			caps[in.x], caps[in.x+1] = 0, -1
			pc++
			continue
		case tnRxLoopHead:
			count := caps[in.x]
			switch {
			case count < int(in.min):
				pc++
			case in.max >= 0 && count >= int(in.max):
				pc = in.y
			case in.greedy:
				st = append(st, tnRxFrame{kind: tnRxChoice, pc: in.y, pos: pos})
				pc++
			default:
				st = append(st, tnRxFrame{kind: tnRxChoice, pc: pc + 1, pos: pos})
				pc = in.y
			}
			continue
		case tnRxLoopEnter:
			if len(st) > 0 {
				st = append(st, tnRxFrame{kind: tnRxUndo, pc: in.x, pos: caps[in.x]}, tnRxFrame{kind: tnRxUndo, pc: in.x + 1, pos: caps[in.x+1]})
			}
			caps[in.x]++
			caps[in.x+1] = pos
			pc++
			continue
		case tnRxLoopTail:
			// (past the minimum, an iteration that matched nothing fails)
			if pos != caps[in.x+1] || caps[in.x] <= int(in.min) {
				pc = in.y
				continue
			}
		case tnRxResetCaps:
			for i := in.x; i < in.y; i++ {
				if caps[i] != -1 {
					if len(st) > 0 {
						st = append(st, tnRxFrame{kind: tnRxUndo, pc: i, pos: caps[i]})
					}
					caps[i] = -1
				}
			}
			pc++
			continue
		case tnRxEnd:
			m.end = pos
			m.stack = st
			return true
		}
		// Failure: back to the latest choice
		for {
			if len(st) == base {
				m.stack = st
				return false
			}
			m.steps++
			if m.limit > 0 && m.steps > m.limit {
				m.over = true
				m.stack = st[:base]
				return false
			}
			f := &st[len(st)-1]
			switch f.kind {
			case tnRxChoice:
				pc, pos = f.pc, f.pos
				st = st[:len(st)-1]
				continue vm
			case tnRxUndo:
				caps[f.pc] = f.pos
				st = st[:len(st)-1]
			case tnRxGreedy:
				// one rune back, or to where what follows can start
				next, p, n := prog[f.pc].next, f.pos, f.n
				found := false
				for n > 0 && !found {
					if s[p-1] < utf8.RuneSelf {
						p--
					} else {
						_, w := utf8.DecodeLastRuneInString(s[:p])
						p -= w
					}
					n--
					found = next < 0 || (p < len(s) && s[p] == byte(next))
				}
				pcNext := f.pc + 1
				if n == 0 {
					st = st[:len(st)-1]
				} else {
					f.pos, f.n = p, n
				}
				if found {
					pc, pos = pcNext, p
					continue vm
				}
			case tnRxLazy:
				// one rune more, or on to where what follows can start
				inst := &prog[f.pc]
				next, p, n := inst.next, f.pos, f.n
				found := false
				for !found && n != 0 && p < len(s) {
					if c := s[p]; c < utf8.RuneSelf {
						if !inst.set.ascii[c] {
							n = 0
							break
						}
						p++
					} else {
						r, w := utf8.DecodeRuneInString(s[p:])
						if !inst.set.match(r) {
							n = 0
							break
						}
						p += w
					}
					if n > 0 {
						n--
					}
					found = next < 0 || (p < len(s) && s[p] == byte(next))
				}
				pcNext := f.pc + 1
				if found && n != 0 {
					f.pos, f.n = p, n
				} else {
					st = st[:len(st)-1]
				}
				if found {
					pc, pos = pcNext, p
					continue vm
				}
			default:
				st = st[:len(st)-1]
			}
		}
	}
}

// ---- Compiling the tree to a program ----

type tnRxCompiler struct {
	insts                   []tnRxInst
	sets                    map[*tnBtNode]*tnRxCharSet
	icase, multiline, dotAll bool
	slots                   int
}

var tnRxPrograms = map[string]*tnRxProg{}
var tnRxProgramsMu sync.Mutex

// A pattern's program, compiled once however many regex objects use it (nil:
// the parser can't read it)
func tnRxProgramOf(source string, flags string) *tnRxProg {
	key := flags + "/" + source
	tnRxProgramsMu.Lock()
	defer tnRxProgramsMu.Unlock()
	p, ok := tnRxPrograms[key]
	if !ok {
		p = tnRxCompile(source, flags)
		tnRxPrograms[key] = p
	}
	return p
}

func tnRxCompile(source string, flags string) *tnRxProg {
	// (v: unicode mode with class set syntax; RE2 can't read it, so a v pattern
	// the parser rejects gets no program)
	sets := strings.Contains(flags, "v")
	bt := tnBtCompile(source, sets || strings.Contains(flags, "u"), sets, strings.Contains(flags, "i"))
	if bt == nil {
		return nil
	}
	c := &tnRxCompiler{sets: map[*tnBtNode]*tnRxCharSet{}, icase: strings.Contains(flags, "i"), multiline: strings.Contains(flags, "m"), dotAll: strings.Contains(flags, "s")}
	ncaps := (bt.ngroups + 1) * 2
	c.slots = ncaps
	c.node(bt.root, nil, true)
	c.emit(tnRxInst{op: tnRxEnd})
	p := &tnRxProg{insts: c.insts, ncaps: ncaps, nslots: c.slots, contextual: tnPatternUsesContext(source)}
	p.anchored = !c.multiline && tnBtStartAnchored(bt.root)
	first := new([256]bool)
	if !c.firstOf(bt.root, first) {
		p.first = first
	}
	p.prefix = c.prefixOf(bt.root)
	if p.prefix == "" && p.first != nil {
		count, only := 0, 0
		for b, in := range p.first {
			if in {
				count, only = count+1, b
			}
		}
		if count == 1 && only < utf8.RuneSelf {
			p.prefix = string(rune(only))
		}
	}
	if !tnBtNeedsBacktracking(bt.root) {
		p.limit = 1 << 22
	}
	return p
}

// Whether a tree uses what only backtracking can run (RE2 can't take over)
func tnBtNeedsBacktracking(n *tnBtNode) bool {
	if n == nil {
		return false
	}
	if n.op == "look" || n.op == "backref" {
		return true
	}
	for _, c := range n.seq {
		if tnBtNeedsBacktracking(c) {
			return true
		}
	}
	for _, b := range n.branches {
		for _, c := range b {
			if tnBtNeedsBacktracking(c) {
				return true
			}
		}
	}
	return tnBtNeedsBacktracking(n.child)
}

func (c *tnRxCompiler) emit(in tnRxInst) int32 {
	in.next = -1
	c.insts = append(c.insts, in)
	return int32(len(c.insts) - 1)
}

func (c *tnRxCompiler) here() int32 {
	return int32(len(c.insts))
}

func (c *tnRxCompiler) setOf(n *tnBtNode) *tnRxCharSet {
	if set, ok := c.sets[n]; ok {
		return set
	}
	icase := c.icase
	var in func(rune) bool
	high := true
	switch n.op {
	case "char":
		ch := n.ch
		high = ch >= utf8.RuneSelf || icase
		if icase {
			lower := unicode.ToLower(ch)
			in = func(r rune) bool { return r == ch || unicode.ToLower(r) == lower }
		} else {
			in = func(r rune) bool { return r == ch }
		}
	case "any":
		if c.dotAll {
			in = func(rune) bool { return true }
		} else {
			in = func(r rune) bool { return !tnBtLineEnd(r) }
		}
	default:
		cls, neg := n.cls, n.negCls
		high = !n.asciiOnly || neg || icase
		in = func(r rune) bool {
			v := cls(r)
			if !v && icase {
				v = cls(unicode.ToLower(r)) || cls(unicode.ToUpper(r))
			}
			return v != neg
		}
	}
	set := &tnRxCharSet{match: in, high: high}
	for b := rune(0); b < utf8.RuneSelf; b++ {
		set.ascii[b] = in(b)
	}
	c.sets[n] = set
	return set
}

func tnBtIsSingle(n *tnBtNode) bool {
	return n.op == "char" || n.op == "any" || n.op == "class"
}

// Adds the bytes n can start with to set; reports whether n can match
// without consuming anything (a zero-width test counts as that)
func (c *tnRxCompiler) firstOf(n *tnBtNode, set *[256]bool) bool {
	switch n.op {
	case "char", "any", "class":
		rs := c.setOf(n)
		for b, in := range rs.ascii {
			set[b] = set[b] || in
		}
		if rs.high {
			for b := utf8.RuneSelf; b < 256; b++ {
				set[b] = true
			}
		}
		return false
	case "cat":
		return c.firstOfSeq(n.seq, set)
	case "alt":
		nullable := false
		for _, br := range n.branches {
			nullable = c.firstOfSeq(br, set) || nullable
		}
		return nullable
	case "group":
		return c.firstOf(n.child, set)
	case "rep":
		nullable := c.firstOf(n.child, set)
		return nullable || n.min == 0
	case "anchor", "look":
		return true
	}
	// (a backreference: its text is not known here)
	for b := range set {
		set[b] = true
	}
	return true
}

func (c *tnRxCompiler) firstOfSeq(nodes []*tnBtNode, set *[256]bool) bool {
	for _, n := range nodes {
		if !c.firstOf(n, set) {
			return false
		}
	}
	return true
}

// firstOf for a lookahead's body, tested where there is a next byte: there
// a $ without m can't match, so it adds nothing
func (c *tnRxCompiler) firstOfLook(n *tnBtNode, set *[256]bool) bool {
	switch n.op {
	case "anchor":
		return c.multiline || n.anchor != '$'
	case "cat":
		for _, item := range n.seq {
			if !c.firstOfLook(item, set) {
				return false
			}
		}
		return true
	case "alt":
		nullable := false
		for _, br := range n.branches {
			if c.firstOfLook(&tnBtNode{op: "cat", seq: br}, set) {
				nullable = true
			}
		}
		return nullable
	case "group":
		return c.firstOfLook(n.child, set)
	}
	return c.firstOf(n, set)
}

// The literal text every match starts with
func (c *tnRxCompiler) prefixOf(n *tnBtNode) string {
	if n.op != "cat" || c.icase {
		return ""
	}
	var b strings.Builder
	for _, item := range n.seq {
		if item.op != "char" {
			break
		}
		b.WriteRune(item.ch)
	}
	return b.String()
}

// What the code after a repeat of one rune tells: whether its runes can be
// kept (nothing after can match inside them), and the byte it must start with
func (c *tnRxCompiler) repHints(in *tnRxInst, tail []*tnBtNode, end bool) {
	if len(tail) == 0 {
		in.possessive = end && in.greedy
		return
	}
	var first [256]bool
	if c.firstOfSeq(tail, &first) {
		return
	}
	count, only, high := 0, 0, false
	for b, on := range first {
		if on {
			count, only = count+1, b
			high = high || b >= utf8.RuneSelf
		}
	}
	if count == 1 && !high {
		in.next = int16(only)
	}
	if !in.greedy || high {
		return
	}
	for b, on := range in.set.ascii {
		if on && first[b] {
			return
		}
	}
	in.possessive = true
}

// A lazy loop's exit at inst at: tested against the bytes tail can start with
func (c *tnRxCompiler) lazyExit(at int32, tail []*tnBtNode) {
	first := new([256]bool)
	if len(tail) > 0 && !c.firstOfTail(tail, first) {
		c.insts[at].op = tnRxSplitLazy
		c.insts[at].first = first
	}
}

// firstOf for what follows a position: as in firstOfLook, a $ can't match
// before a next byte (the exit test only trusts the set there)
func (c *tnRxCompiler) firstOfTail(nodes []*tnBtNode, set *[256]bool) bool {
	return c.firstOfLook(&tnBtNode{op: "cat", seq: nodes}, set)
}

func tnRxConcat(a []*tnBtNode, b []*tnBtNode) []*tnBtNode {
	return append(append([]*tnBtNode{}, a...), b...)
}

func (c *tnRxCompiler) exact(n *tnBtNode) bool {
	if n.op != "char" {
		return false
	}
	return !c.icase || n.ch < utf8.RuneSelf && !unicode.IsLetter(n.ch)
}

// Emits nodes; tail is what follows them (for the hints above), end says the
// match ends right after tail
func (c *tnRxCompiler) seq(nodes []*tnBtNode, tail []*tnBtNode, end bool) {
	for i := 0; i < len(nodes); i++ {
		n := nodes[i]
		// (runs of plain characters are one literal)
		if c.exact(n) {
			j := i
			var b strings.Builder
			for j < len(nodes) && c.exact(nodes[j]) {
				b.WriteRune(nodes[j].ch)
				j++
			}
			if lit := b.String(); len(lit) == 1 {
				c.emit(tnRxInst{op: tnRxChar, c: lit[0]})
			} else {
				c.emit(tnRxInst{op: tnRxLit, lit: lit})
			}
			i = j - 1
			continue
		}
		c.node(n, tnRxConcat(nodes[i+1:], tail), end)
	}
}

// A branch point: body (at pc+1) or else, which the caller patches into y
func (c *tnRxCompiler) split(body *tnBtNode, seq []*tnBtNode) int32 {
	first := new([256]bool)
	nullable := false
	if body != nil {
		nullable = c.firstOf(body, first)
	} else {
		nullable = c.firstOfSeq(seq, first)
	}
	in := tnRxInst{op: tnRxSplitFirst, first: first, x: c.here() + 1}
	if nullable {
		in.op = tnRxSplit
		in.first = nil
	}
	return c.emit(in)
}

func (c *tnRxCompiler) node(n *tnBtNode, tail []*tnBtNode, end bool) {
	switch n.op {
	case "char", "any", "class":
		c.emit(tnRxInst{op: tnRxSet, set: c.setOf(n)})
	case "anchor":
		switch n.anchor {
		case '^':
			if c.multiline {
				c.emit(tnRxInst{op: tnRxBolLine})
			} else {
				c.emit(tnRxInst{op: tnRxBol})
			}
		case '$':
			if c.multiline {
				c.emit(tnRxInst{op: tnRxEolLine})
			} else {
				c.emit(tnRxInst{op: tnRxEol})
			}
		case 'b':
			c.emit(tnRxInst{op: tnRxWordB})
		default:
			c.emit(tnRxInst{op: tnRxNotWordB})
		}
	case "cat":
		c.seq(n.seq, tail, end)
	case "alt":
		var exits []int32
		for i, br := range n.branches {
			if i == len(n.branches)-1 {
				c.seq(br, tail, end)
				break
			}
			split := c.split(nil, br)
			c.seq(br, tail, end)
			exits = append(exits, c.emit(tnRxInst{op: tnRxJmp}))
			c.insts[split].y = c.here()
		}
		for _, at := range exits {
			c.insts[at].x = c.here()
		}
	case "group":
		c.emit(tnRxInst{op: tnRxSave, x: int32(n.group * 2)})
		c.node(n.child, tail, end)
		c.emit(tnRxInst{op: tnRxSave, x: int32(n.group*2 + 1)})
	case "backref":
		op := uint8(tnRxBackref)
		if c.icase {
			op = tnRxBackrefFold
		}
		c.emit(tnRxInst{op: op, x: int32(n.group * 2)})
	case "look":
		c.look(n)
	case "rep":
		c.rep(n, tail, end)
	}
}

func (c *tnRxCompiler) look(n *tnBtNode) {
	if !n.behind && n.child.op == "cat" && len(n.child.seq) == 1 && tnBtIsSingle(n.child.seq[0]) {
		c.emit(tnRxInst{op: tnRxPeek, set: c.setOf(n.child.seq[0]), neg: n.negative})
		return
	}
	at := c.emit(tnRxInst{op: tnRxLook, neg: n.negative, behind: n.behind, max: int32(n.max)})
	if !n.behind {
		first := new([256]bool)
		if !c.firstOfLook(n.child, first) {
			c.insts[at].first = first
		}
	}
	c.node(n.child, nil, !n.behind)
	c.emit(tnRxInst{op: tnRxLookEnd})
	c.insts[at].y = c.here()
}

// The capture slots inside a tree (lo == hi: none)
func tnBtCaptureSlots(n *tnBtNode) (int32, int32) {
	lo, hi := int32(-1), int32(-1)
	var walk func(*tnBtNode)
	walk = func(n *tnBtNode) {
		if n == nil {
			return
		}
		if n.op == "group" {
			if lo < 0 || int32(n.group*2) < lo {
				lo = int32(n.group * 2)
			}
			if int32(n.group*2+2) > hi {
				hi = int32(n.group*2 + 2)
			}
		}
		for _, s := range n.seq {
			walk(s)
		}
		for _, b := range n.branches {
			for _, s := range b {
				walk(s)
			}
		}
		walk(n.child)
	}
	walk(n)
	return lo, hi
}

func (c *tnRxCompiler) rep(n *tnBtNode, tail []*tnBtNode, end bool) {
	if n.max == 0 {
		return
	}
	if tnBtIsSingle(n.child) {
		in := tnRxInst{op: tnRxRepGreedy, greedy: n.greedy, set: c.setOf(n.child), min: int32(n.min), max: int32(n.max), next: -1}
		if !n.greedy {
			in.op = tnRxRepLazy
		}
		c.repHints(&in, tail, end)
		next := in.next
		at := c.emit(in)
		c.insts[at].next = next
		return
	}
	lo, hi := tnBtCaptureSlots(n.child)
	reset := func() {
		if hi > lo {
			c.emit(tnRxInst{op: tnRxResetCaps, x: lo, y: hi})
		}
	}
	var first [256]bool
	nullable := c.firstOf(n.child, &first)
	switch {
	case !nullable && n.min == 0 && n.max == 1:
		var at int32
		if n.greedy {
			at = c.split(n.child, nil)
		} else {
			at = c.emit(tnRxInst{op: tnRxSplit})
			c.insts[at].y = at + 1
		}
		reset()
		c.node(n.child, nil, false)
		if n.greedy {
			c.insts[at].y = c.here()
		} else {
			c.insts[at].x = c.here()
		}
	case !nullable && n.min == 0 && n.max < 0:
		var at int32
		if n.greedy {
			at = c.split(n.child, nil)
		} else {
			at = c.emit(tnRxInst{op: tnRxSplit})
			c.insts[at].y = at + 1
		}
		reset()
		c.node(n.child, nil, false)
		c.emit(tnRxInst{op: tnRxJmp, x: at})
		if n.greedy {
			c.insts[at].y = c.here()
		} else {
			c.insts[at].x = c.here()
			c.lazyExit(at, tail)
		}
	case !nullable && n.min == 1 && n.max < 0:
		loop := c.here()
		reset()
		c.node(n.child, nil, false)
		at := c.emit(tnRxInst{op: tnRxSplit, x: loop})
		if n.greedy {
			c.insts[at].y = c.here()
		} else {
			c.insts[at].x = c.here()
			c.insts[at].y = loop
			c.lazyExit(at, tail)
		}
	default:
		r := int32(c.slots)
		c.slots += 2
		c.emit(tnRxInst{op: tnRxLoopInit, x: r})
		head := c.emit(tnRxInst{op: tnRxLoopHead, x: r, min: int32(n.min), max: int32(n.max), greedy: n.greedy})
		c.emit(tnRxInst{op: tnRxLoopEnter, x: r})
		reset()
		c.node(n.child, nil, false)
		c.emit(tnRxInst{op: tnRxLoopTail, x: r, y: head, min: int32(n.min)})
		c.insts[head].y = c.here()
	}
}

// ---- The pattern parser ----

type tnBtNode struct {
	op       string
	ch       rune
	cls      func(rune) bool
	negCls   bool
	asciiOnly bool // (a class that matches no non-ASCII rune, negation aside)
	seq      []*tnBtNode
	branches [][]*tnBtNode
	child    *tnBtNode
	min, max int
	greedy   bool
	anchor   byte
	group    int
	behind   bool
	negative bool
}

type tnBt struct {
	root    *tnBtNode
	ngroups int
}

type tnBtParser struct {
	src     []rune
	pos     int
	ngrp    int
	names   map[string]int
	unicode bool
	// v flag: classes are set expressions (nesting, &&, --, \\q{…}), and with
	// icase each operand is case-closed before the set operations, as in JS
	sets  bool
	icase bool
}

func tnBtCompile(pattern string, unicode bool, sets bool, icase bool) *tnBt {
	p := &tnBtParser{src: []rune(pattern), unicode: unicode, sets: sets, icase: icase}
	root, err := p.parseAlt()
	if err != nil || p.pos < len(p.src) {
		return nil
	}
	return &tnBt{root: root, ngroups: p.ngrp}
}

func (p *tnBtParser) peek() (rune, bool) {
	if p.pos < len(p.src) {
		return p.src[p.pos], true
	}
	return 0, false
}

func (p *tnBtParser) parseAlt() (*tnBtNode, error) {
	var branches [][]*tnBtNode
	for {
		seq, err := p.parseSeq()
		if err != nil {
			return nil, err
		}
		branches = append(branches, seq)
		if ch, ok := p.peek(); ok && ch == '|' {
			p.pos++
			continue
		}
		break
	}
	if len(branches) == 1 {
		return &tnBtNode{op: "cat", seq: branches[0]}, nil
	}
	return &tnBtNode{op: "alt", branches: branches}, nil
}

func (p *tnBtParser) parseSeq() ([]*tnBtNode, error) {
	var seq []*tnBtNode
	for {
		ch, ok := p.peek()
		if !ok || ch == '|' || ch == ')' {
			break
		}
		atom, err := p.parseAtom()
		if err != nil {
			return nil, err
		}
		if atom == nil {
			continue
		}
		node, err := p.parseQuantifier(atom)
		if err != nil {
			return nil, err
		}
		seq = append(seq, node)
	}
	return seq, nil
}

func (p *tnBtParser) parseQuantifier(atom *tnBtNode) (*tnBtNode, error) {
	ch, ok := p.peek()
	if !ok {
		return atom, nil
	}
	lo, hi := 0, 0
	switch ch {
	case '*':
		lo, hi = 0, -1
	case '+':
		lo, hi = 1, -1
	case '?':
		lo, hi = 0, 1
	case '{':
		save := p.pos
		p.pos++
		parsedLo, parsedHi, ok2 := p.parseBraces()
		if !ok2 {
			p.pos = save
			return atom, nil
		}
		lo, hi = parsedLo, parsedHi
	default:
		return atom, nil
	}
	p.pos++
	greedy := true
	if c, ok2 := p.peek(); ok2 && c == '?' {
		greedy = false
		p.pos++
	}
	return &tnBtNode{op: "rep", child: atom, min: lo, max: hi, greedy: greedy}, nil
}

// {m}, {m,}, {m,n} — returns ok=false when the brace is a literal
func (p *tnBtParser) parseBraces() (int, int, bool) {
	lo := 0
	digits := 0
	for {
		c, ok := p.peek()
		if !ok || c < '0' || c > '9' {
			break
		}
		lo = lo*10 + int(c-'0')
		digits++
		p.pos++
	}
	if digits == 0 {
		return 0, 0, false
	}
	hi := lo
	if c, ok := p.peek(); ok && c == ',' {
		p.pos++
		hi = -1
		hv := 0
		hd := 0
		for {
			c2, ok2 := p.peek()
			if !ok2 || c2 < '0' || c2 > '9' {
				break
			}
			hv = hv*10 + int(c2-'0')
			hd++
			p.pos++
		}
		if hd > 0 {
			hi = hv
		}
	}
	if c, ok := p.peek(); !ok || c != '}' {
		return 0, 0, false
	}
	return lo, hi, true
}

// JS's whitespace escape: ASCII whitespace, Unicode space separators, line terminators and the BOM
func tnJSSpace(r rune) bool {
	switch r {
	case ' ', '\\t', '\\n', '\\r', '\\f', '\\v', 0xa0, 0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff:
		return true
	}
	return r >= 0x2000 && r <= 0x200a
}

func tnCharClass(escape rune) func(rune) bool {
	switch escape {
	case 'd':
		return func(r rune) bool { return r >= '0' && r <= '9' }
	case 'D':
		return func(r rune) bool { return !(r >= '0' && r <= '9') }
	case 'w':
		return func(r rune) bool {
			return r == '_' || (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')
		}
	case 'W':
		return func(r rune) bool {
			return !(r == '_' || (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z'))
		}
	case 's':
		return tnJSSpace
	case 'S':
		return func(r rune) bool { return !tnJSSpace(r) }
	}
	return nil
}

func (p *tnBtParser) parseAtom() (*tnBtNode, error) {
	ch, ok := p.peek()
	if !ok {
		return nil, fmt.Errorf("unexpected end")
	}
	p.pos++
	switch ch {
	case '(':
		kind := "group"
		negative := false
		behind := false
		if c, ok2 := p.peek(); ok2 && c == '?' {
			p.pos++
			c2, _ := p.peek()
			switch c2 {
			case ':':
				p.pos++
				kind = "noncap"
			case '=':
				p.pos++
				kind = "look"
			case '!':
				p.pos++
				kind = "look"
				negative = true
			case '<':
				p.pos++
				c3, ok3 := p.peek()
				if !ok3 {
					return nil, fmt.Errorf("bad (?<")
				}
				if c3 == '=' || c3 == '!' {
					p.pos++
					kind = "look"
					behind = true
					negative = c3 == '!'
				} else {
					name := p.groupName()
					if name == "" {
						return nil, fmt.Errorf("unterminated group name")
					}
					if p.names == nil {
						p.names = map[string]int{}
					}
					p.names[name] = p.ngrp + 1
				}
			case 'P':
				p.pos++
				if c3, ok3 := p.peek(); ok3 && c3 == '<' {
					p.pos++
					name := p.groupName()
					if name == "" {
						return nil, fmt.Errorf("unterminated group name")
					}
					if p.names == nil {
						p.names = map[string]int{}
					}
					p.names[name] = p.ngrp + 1
				} else {
					return nil, fmt.Errorf("bad (?P")
				}
			default:
				return nil, fmt.Errorf("unsupported group")
			}
		}
		// (a group's number is its opening parenthesis's position, as in JS)
		group := 0
		if kind == "group" {
			p.ngrp++
			group = p.ngrp
		}
		body, err := p.parseAlt()
		if err != nil {
			return nil, err
		}
		if c, ok2 := p.peek(); !ok2 || c != ')' {
			return nil, fmt.Errorf("missing )")
		}
		p.pos++
		switch kind {
		case "noncap":
			return body, nil
		case "look":
			return &tnBtNode{op: "look", child: body, behind: behind, negative: negative, max: tnBtMaxRunes(body)}, nil
		default:
			return &tnBtNode{op: "group", group: group, child: body}, nil
		}
	case '[':
		return p.parseClass()
	case '.':
		return &tnBtNode{op: "any"}, nil
	case '^':
		return &tnBtNode{op: "anchor", anchor: '^'}, nil
	case '$':
		return &tnBtNode{op: "anchor", anchor: '$'}, nil
	case '\\\\':
		return p.parseEscape()
	default:
		return &tnBtNode{op: "char", ch: ch}, nil
	}
}

// The name of a (?<name> group, after the '<', through the '>'
func (p *tnBtParser) groupName() string {
	start := p.pos
	for p.pos < len(p.src) && p.src[p.pos] != '>' {
		p.pos++
	}
	if p.pos >= len(p.src) {
		return ""
	}
	name := string(p.src[start:p.pos])
	p.pos++
	return name
}

// The hex digits from the cursor (n of them, or {…} when n is 0): their value
func (p *tnBtParser) hexValue(n int) (rune, bool) {
	end := p.pos + n
	if n == 0 {
		if p.pos >= len(p.src) || p.src[p.pos] != '{' {
			return 0, false
		}
		close := p.pos + 1
		for close < len(p.src) && p.src[close] != '}' {
			close++
		}
		if close >= len(p.src) {
			return 0, false
		}
		v, err := strconv.ParseUint(string(p.src[p.pos+1:close]), 16, 32)
		if err != nil {
			return 0, false
		}
		p.pos = close + 1
		return rune(v), true
	}
	if end > len(p.src) {
		return 0, false
	}
	v, err := strconv.ParseUint(string(p.src[p.pos:end]), 16, 32)
	if err != nil {
		return 0, false
	}
	p.pos = end
	return rune(v), true
}

// The character or class an escape (after its backslash) stands for, as JS
// reads it: d w s (JS whitespace), p{…} / P{…}, xHH, x{…}, uHHHH, u{…}, cX, 0,
// n t r f v (and b, a backspace in a class)
func (p *tnBtParser) escapeValue(inClass bool) (rune, func(rune) bool, bool) {
	c, ok := p.peek()
	if !ok {
		return 0, nil, false
	}
	p.pos++
	switch c {
	case 'n':
		return '\\n', nil, true
	case 't':
		return '\\t', nil, true
	case 'r':
		return '\\r', nil, true
	case 'f':
		return '\\f', nil, true
	case 'v':
		return '\\v', nil, true
	case '0':
		return 0, nil, true
	case 'b':
		if inClass {
			return '\\b', nil, true
		}
	case 'x':
		if v, ok := p.hexValue(2); ok {
			return v, nil, true
		}
		if v, ok := p.hexValue(0); ok {
			return v, nil, true
		}
		return 'x', nil, true
	case 'u':
		if v, ok := p.hexValue(4); ok {
			return v, nil, true
		}
		if v, ok := p.hexValue(0); ok {
			return v, nil, true
		}
		return 'u', nil, true
	case 'c':
		if n, ok := p.peek(); ok && ((n >= 'a' && n <= 'z') || (n >= 'A' && n <= 'Z')) {
			p.pos++
			return n % 32, nil, true
		}
		return '\\\\', nil, true
	case 'p', 'P':
		if n, ok := p.peek(); ok && n == '{' && p.unicode {
			close := p.pos + 1
			for close < len(p.src) && p.src[close] != '}' {
				close++
			}
			if close < len(p.src) {
				if table := tnUnicodeProperty(string(p.src[p.pos+1 : close])); table != nil {
					p.pos = close + 1
					if c == 'P' {
						return 0, func(r rune) bool { return !unicode.Is(table, r) }, true
					}
					return 0, func(r rune) bool { return unicode.Is(table, r) }, true
				}
			}
		}
	}
	if cls := tnCharClass(c); cls != nil {
		return 0, cls, true
	}
	return c, nil, true
}

// A p{…} property's table: a general category (L, Lu, P, Letter…), a
// script (Greek, Script=Greek) or a binary property
func tnUnicodeProperty(name string) *unicode.RangeTable {
	if eq := strings.IndexByte(name, '='); eq >= 0 {
		name = name[eq+1:]
	}
	long := map[string]string{
		"Letter": "L", "Lowercase_Letter": "Ll", "Uppercase_Letter": "Lu", "Titlecase_Letter": "Lt", "Modifier_Letter": "Lm", "Other_Letter": "Lo",
		"Mark": "M", "Number": "N", "Decimal_Number": "Nd", "Letter_Number": "Nl", "Other_Number": "No",
		"Punctuation": "P", "Connector_Punctuation": "Pc", "Dash_Punctuation": "Pd", "Open_Punctuation": "Ps", "Close_Punctuation": "Pe",
		"Initial_Punctuation": "Pi", "Final_Punctuation": "Pf", "Other_Punctuation": "Po",
		"Symbol": "S", "Math_Symbol": "Sm", "Currency_Symbol": "Sc", "Modifier_Symbol": "Sk", "Other_Symbol": "So",
		"Separator": "Z", "Space_Separator": "Zs", "Line_Separator": "Zl", "Paragraph_Separator": "Zp",
		"Other": "C", "Control": "Cc", "Format": "Cf", "Private_Use": "Co", "Surrogate": "Cs",
	}
	if short, ok := long[name]; ok {
		name = short
	}
	if t, ok := unicode.Categories[name]; ok {
		return t
	}
	if t, ok := unicode.Scripts[name]; ok {
		return t
	}
	if t, ok := unicode.Properties[name]; ok {
		return t
	}
	return nil
}

func (p *tnBtParser) parseEscape() (*tnBtNode, error) {
	c, ok := p.peek()
	if !ok {
		return nil, fmt.Errorf("trailing backslash")
	}
	switch c {
	case 'b':
		p.pos++
		return &tnBtNode{op: "anchor", anchor: 'b'}, nil
	case 'B':
		p.pos++
		return &tnBtNode{op: "anchor", anchor: 'B'}, nil
	case '1', '2', '3', '4', '5', '6', '7', '8', '9':
		p.pos++
		return &tnBtNode{op: "backref", group: int(c - '0')}, nil
	case 'k':
		// k<name>: the named group's text
		if n, ok := p.peekAt(1); ok && n == '<' {
			p.pos += 2
			name := p.groupName()
			if index, found := p.names[name]; found {
				return &tnBtNode{op: "backref", group: index}, nil
			}
			return nil, fmt.Errorf("unknown group name")
		}
	}
	ch, cls, ok := p.escapeValue(false)
	if !ok {
		return nil, fmt.Errorf("trailing backslash")
	}
	if cls != nil {
		return &tnBtNode{op: "class", cls: cls, asciiOnly: c == 'd' || c == 'w'}, nil
	}
	return &tnBtNode{op: "char", ch: ch}, nil
}

// A v-flag class's contents: the code points it matches, plus its strings of
// zero or two-plus code points (from \\q{…})
type tnBtClassSet struct {
	has  func(rune) bool
	strs map[string]bool
}

// A v-flag class (after its [) as a node: a class, or when it has strings an
// alternation trying them longest first, then the code points, then the
// empty string, as JS does
func (p *tnBtParser) parseClassSetNode() (*tnBtNode, error) {
	set, negate, err := p.parseClassSet()
	if err != nil {
		return nil, err
	}
	cls := &tnBtNode{op: "class", cls: set.has, negCls: negate}
	if len(set.strs) == 0 {
		return cls, nil
	}
	var strs []string
	empty := false
	for s := range set.strs {
		if s == "" {
			empty = true
			continue
		}
		strs = append(strs, s)
	}
	// longest first; equal lengths in code point order, so programs are stable
	for i := 1; i < len(strs); i++ {
		for j := i; j > 0; j-- {
			a, b := utf8.RuneCountInString(strs[j-1]), utf8.RuneCountInString(strs[j])
			if a > b || (a == b && strs[j-1] < strs[j]) {
				break
			}
			strs[j-1], strs[j] = strs[j], strs[j-1]
		}
	}
	var branches [][]*tnBtNode
	for _, s := range strs {
		var seq []*tnBtNode
		for _, r := range s {
			seq = append(seq, &tnBtNode{op: "char", ch: r})
		}
		branches = append(branches, seq)
	}
	branches = append(branches, []*tnBtNode{cls})
	if empty {
		branches = append(branches, nil)
	}
	return &tnBtNode{op: "alt", branches: branches}, nil
}

// A v-flag class's set expression, after the [ through the ]: a union
// (operands side by side, with a-z ranges), an intersection (A&&B&&…) or a
// subtraction (A--B--…); mixing them needs a nested class, as in JS
func (p *tnBtParser) parseClassSet() (*tnBtClassSet, bool, error) {
	negate := false
	if c, ok := p.peek(); ok && c == '^' {
		negate = true
		p.pos++
	}
	var operands []*tnBtClassSet
	var op rune // 0: union, '&': intersection, '-': subtraction
	for {
		c, ok := p.peek()
		if !ok {
			return nil, false, fmt.Errorf("unterminated class")
		}
		if c == ']' {
			p.pos++
			break
		}
		if n, _ := p.peekAt(1); (c == '&' || c == '-') && n == c {
			if len(operands) == 0 || (op == 0 && len(operands) > 1) || (op != 0 && op != c) {
				return nil, false, fmt.Errorf("class set operators mixed")
			}
			op = c
			p.pos += 2
			operand, _, _, err := p.classSetOperand()
			if err != nil {
				return nil, false, err
			}
			operands = append(operands, operand)
			continue
		}
		if op != 0 {
			return nil, false, fmt.Errorf("class set operand without an operator")
		}
		operand, lo, single, err := p.classSetOperand()
		if err != nil {
			return nil, false, err
		}
		// a range: one character, a single -, another character
		if n, _ := p.peekAt(1); single && n != '-' {
			if c, ok := p.peek(); ok && c == '-' {
				p.pos++
				_, hi, single2, err := p.classSetOperand()
				if err != nil {
					return nil, false, err
				}
				if !single2 || hi < lo {
					return nil, false, fmt.Errorf("bad class range")
				}
				operand = &tnBtClassSet{has: p.caseClosed(func(r rune) bool { return r >= lo && r <= hi })}
			}
		}
		operands = append(operands, operand)
	}
	set := &tnBtClassSet{has: func(rune) bool { return false }}
	if len(operands) > 0 {
		set = operands[0]
	}
	if len(operands) > 1 {
		has := make([]func(rune) bool, len(operands))
		for i, o := range operands {
			has[i] = o.has
		}
		strs := map[string]bool{}
		switch op {
		case 0:
			set = &tnBtClassSet{has: func(r rune) bool {
				for _, h := range has {
					if h(r) {
						return true
					}
				}
				return false
			}}
			for _, o := range operands {
				for s := range o.strs {
					strs[s] = true
				}
			}
		case '&':
			set = &tnBtClassSet{has: func(r rune) bool {
				for _, h := range has {
					if !h(r) {
						return false
					}
				}
				return true
			}}
			for s := range operands[0].strs {
				all := true
				for _, o := range operands[1:] {
					all = all && o.strs[s]
				}
				if all {
					strs[s] = true
				}
			}
		default:
			first, rest := has[0], has[1:]
			set = &tnBtClassSet{has: func(r rune) bool {
				if !first(r) {
					return false
				}
				for _, h := range rest {
					if h(r) {
						return false
					}
				}
				return true
			}}
			for s := range operands[0].strs {
				kept := true
				for _, o := range operands[1:] {
					kept = kept && !o.strs[s]
				}
				if kept {
					strs[s] = true
				}
			}
		}
		set.strs = strs
	}
	if negate && len(set.strs) > 0 {
		return nil, false, fmt.Errorf("negated class with strings")
	}
	return set, negate, nil
}

// One operand of a v-flag class: a nested class, a \\q{…} string list, an
// escape or a character (single: a character, which can start or end a range)
func (p *tnBtParser) classSetOperand() (*tnBtClassSet, rune, bool, error) {
	c, ok := p.peek()
	if !ok {
		return nil, 0, false, fmt.Errorf("unterminated class")
	}
	p.pos++
	switch c {
	case '[':
		set, negate, err := p.parseClassSet()
		if err != nil {
			return nil, 0, false, err
		}
		if negate {
			has := set.has
			set = &tnBtClassSet{has: func(r rune) bool { return !has(r) }}
		}
		return set, 0, false, nil
	case ']':
		return nil, 0, false, fmt.Errorf("missing class operand")
	case '\\\\':
		if n, _ := p.peek(); n == 'q' {
			if b, _ := p.peekAt(1); b == '{' {
				p.pos += 2
				return p.classStrings()
			}
		}
		ch, cls, ok := p.escapeValue(true)
		if !ok {
			return nil, 0, false, fmt.Errorf("trailing backslash in class")
		}
		if cls != nil {
			return &tnBtClassSet{has: p.caseClosed(cls)}, 0, false, nil
		}
		c = ch
	}
	ch := c
	return &tnBtClassSet{has: p.caseClosed(func(r rune) bool { return r == ch })}, ch, true, nil
}

// \\q{a|bc|…} (after the {, through the }): one-code-point strings join the
// code points, the rest are the class's strings
func (p *tnBtParser) classStrings() (*tnBtClassSet, rune, bool, error) {
	var singles []rune
	strs := map[string]bool{}
	var cur []rune
	for {
		c, ok := p.peek()
		if !ok {
			return nil, 0, false, fmt.Errorf("unterminated \\\\q{")
		}
		p.pos++
		if c == '|' || c == '}' {
			if len(cur) == 1 {
				singles = append(singles, cur[0])
			} else {
				strs[string(cur)] = true
			}
			cur = nil
			if c == '}' {
				break
			}
			continue
		}
		if c == '\\\\' {
			ch, cls, ok := p.escapeValue(true)
			if !ok || cls != nil {
				return nil, 0, false, fmt.Errorf("bad escape in \\\\q{")
			}
			c = ch
		}
		cur = append(cur, c)
	}
	in := func(r rune) bool {
		for _, s := range singles {
			if r == s {
				return true
			}
		}
		return false
	}
	return &tnBtClassSet{has: p.caseClosed(in), strs: strs}, 0, false, nil
}

// With the i flag, a v-flag operand matches every case of what it holds, so
// [\\p{L}--[a-z]] leaves out A-Z too
func (p *tnBtParser) caseClosed(in func(rune) bool) func(rune) bool {
	if !p.icase {
		return in
	}
	return func(r rune) bool { return in(r) || in(unicode.ToLower(r)) || in(unicode.ToUpper(r)) }
}

func (p *tnBtParser) parseClass() (*tnBtNode, error) {
	if p.sets {
		return p.parseClassSetNode()
	}
	negate := false
	if c, ok := p.peek(); ok && c == '^' {
		negate = true
		p.pos++
	}
	var items []func(rune) bool
	asciiOnly := true
	for {
		c, ok := p.peek()
		if !ok {
			return nil, fmt.Errorf("unterminated class")
		}
		// (as in JS, a ] right at the start closes it: [] matches nothing, [^] anything)
		if c == ']' {
			p.pos++
			break
		}
		p.pos++
		var lo rune
		if c == '\\\\' {
			ch, cls, ok2 := p.escapeValue(true)
			if !ok2 {
				return nil, fmt.Errorf("trailing backslash in class")
			}
			if cls != nil {
				items = append(items, cls)
				e := p.src[p.pos-1]
				asciiOnly = asciiOnly && (e == 'd' || e == 'w')
				continue
			}
			lo = ch
		} else {
			lo = c
		}
		// range?
		if c3, ok3 := p.peek(); ok3 && c3 == '-' {
			if c4, ok4 := p.peekAt(1); ok4 && c4 != ']' {
				p.pos++ // consume '-'
				hiChar, _ := p.peek()
				p.pos++
				hi := hiChar
				if hiChar == '\\\\' {
					hc, _, ok5 := p.escapeValue(true)
					if !ok5 {
						return nil, fmt.Errorf("trailing backslash in class")
					}
					hi = hc
				}
				l, h := lo, hi
				asciiOnly = asciiOnly && h < utf8.RuneSelf
				items = append(items, func(r rune) bool { return r >= l && r <= h })
				continue
			}
		}
		l := lo
		asciiOnly = asciiOnly && l < utf8.RuneSelf
		items = append(items, func(r rune) bool { return r == l })
	}
	matchers := items
	return &tnBtNode{op: "class", cls: func(r rune) bool {
		for _, m := range matchers {
			if m(r) {
				return true
			}
		}
		return false
	}, negCls: negate, asciiOnly: asciiOnly}, nil
}

func (p *tnBtParser) peekAt(offset int) (rune, bool) {
	if p.pos+offset < len(p.src) {
		return p.src[p.pos+offset], true
	}
	return 0, false
}

// Line terminators for . and multiline ^ $ (as JS defines them)
func tnBtLineEnd(r rune) bool {
	return r == '\\n' || r == '\\r' || r == 0x2028 || r == 0x2029
}

// The most runes a node can match (-1: no bound), for lookbehinds
func tnBtMaxRunes(n *tnBtNode) int {
	switch n.op {
	case "char", "any", "class":
		return 1
	case "anchor", "look":
		return 0
	case "cat":
		total := 0
		for _, c := range n.seq {
			w := tnBtMaxRunes(c)
			if w < 0 {
				return -1
			}
			total += w
		}
		return total
	case "alt":
		most := 0
		for _, br := range n.branches {
			w := tnBtMaxRunes(&tnBtNode{op: "cat", seq: br})
			if w < 0 {
				return -1
			}
			if w > most {
				most = w
			}
		}
		return most
	case "group":
		return tnBtMaxRunes(n.child)
	case "rep":
		w := tnBtMaxRunes(n.child)
		if w < 0 || n.max < 0 {
			return -1
		}
		return w * n.max
	}
	return -1
}

// Whether a pattern only matches at the input's start (it begins with ^)
func tnBtStartAnchored(n *tnBtNode) bool {
	switch n.op {
	case "anchor":
		return n.anchor == '^'
	case "cat":
		return len(n.seq) > 0 && tnBtStartAnchored(n.seq[0])
	case "group":
		return tnBtStartAnchored(n.child)
	case "alt":
		for _, br := range n.branches {
			if len(br) == 0 || !tnBtStartAnchored(br[0]) {
				return false
			}
		}
		return len(n.branches) > 0
	}
	return false
}
`;
export const REGEX_ENGINE_HELPER = REGEX_VM;
