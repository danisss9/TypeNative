// node:path (+ node:path/posix, node:path/win32): ports of Node's posix and
// win32 path algorithms, so results match Node on every OS. `path` itself is
// the platform's flavour, as in Node.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults, isObjectLiteral, getOption } from './registry.js';

const pathHelper = `// node:path — Node's posix and win32 algorithms (path is the platform's)
// A path argument held as any: a string, else Node's TypeError
func TnPathArg(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"path\\" argument must be of type string. Received "+TnTypeOf(v)))
}

type tnPathStyle struct {
	win bool
	sep string
}

var TnPathPosix = &tnPathStyle{win: false, sep: "/"}
var TnPathWin32 = &tnPathStyle{win: true, sep: "\\\\"}
var TnPathNative = func() *tnPathStyle {
	if runtime.GOOS == "windows" {
		return TnPathWin32
	}
	return TnPathPosix
}()

type TnParsedPath struct {
	root string
	dir  string
	base string
	ext  string
	name string
}

func (s *tnPathStyle) isSep(c byte) bool { return c == '/' || (s.win && c == '\\\\') }

func tnIsDriveLetter(c byte) bool { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') }

// matchesGlob(path, pattern): minimatch-style *, **, ?, [...], {a,b}; wildcards
// don't cross separators or match a leading dot (win32: both slashes separate)
func (s *tnPathStyle) matchesGlob(p string, pattern string) bool {
	if s.win {
		p = strings.ReplaceAll(p, "\\\\", "/")
		pattern = strings.ReplaceAll(pattern, "\\\\", "/")
	}
	for _, alt := range tnExpandBraces(pattern) {
		if re, err := regexp.Compile(tnGlobRegexp(alt, !s.win)); err == nil && re.MatchString(p) {
			return true
		}
	}
	return false
}

func tnExpandBraces(p string) []string {
	depth, start := 0, -1
	for i := 0; i < len(p); i++ {
		switch p[i] {
		case '\\\\':
			i++
		case '{':
			if depth == 0 {
				start = i
			}
			depth++
		case '}':
			depth--
			if depth == 0 && start >= 0 {
				inner := p[start+1 : i]
				parts := []string{}
				level, last := 0, 0
				for j := 0; j < len(inner); j++ {
					switch inner[j] {
					case '{':
						level++
					case '}':
						level--
					case ',':
						if level == 0 {
							parts = append(parts, inner[last:j])
							last = j + 1
						}
					}
				}
				parts = append(parts, inner[last:])
				if len(parts) > 1 {
					out := []string{}
					for _, part := range parts {
						out = append(out, tnExpandBraces(p[:start]+part+p[i+1:])...)
					}
					return out
				}
				start = -1
			}
		}
	}
	return []string{p}
}

func tnGlobRegexp(g string, escapes bool) string {
	var b strings.Builder
	b.WriteString("^")
	segStart := true
	for i := 0; i < len(g); i++ {
		c := g[i]
		wasStart := segStart
		segStart = false
		switch {
		case c == '*' && i+1 < len(g) && g[i+1] == '*' && wasStart && (i+2 == len(g) || g[i+2] == '/'):
			// a leading ** also matches an absolute path's root ('**/a.ts' matches '/x/a.ts')
			if i == 0 {
				b.WriteString("/?")
			}
			if i+2 == len(g) {
				b.WriteString("(?:[^/.][^/]*(?:/[^/.][^/]*)*)?")
				i++
			} else {
				b.WriteString("(?:[^/.][^/]*/)*")
				i += 2
				segStart = true
			}
		case c == '*':
			for i+1 < len(g) && g[i+1] == '*' {
				i++
			}
			if wasStart {
				b.WriteString("(?:[^/.][^/]*)?")
			} else {
				b.WriteString("[^/]*")
			}
		case c == '?':
			if wasStart {
				b.WriteString("[^/.]")
			} else {
				b.WriteString("[^/]")
			}
		case c == '[':
			end := strings.IndexByte(g[i+1:], ']')
			if end < 0 {
				b.WriteString("\\\\[")
				continue
			}
			class := g[i+1 : i+1+end]
			if end == 0 {
				end = strings.IndexByte(g[i+2:], ']') + 1
				if end <= 0 {
					b.WriteString("\\\\[")
					continue
				}
				class = g[i+1 : i+1+end]
			}
			negate := strings.HasPrefix(class, "!") || strings.HasPrefix(class, "^")
			if negate {
				class = class[1:]
			}
			class = strings.ReplaceAll(class, "\\\\", "\\\\\\\\")
			if negate {
				b.WriteString("[^/" + class + "]")
			} else {
				b.WriteString("[" + class + "]")
			}
			i += end + 1
		case c == '\\\\' && escapes && i+1 < len(g):
			i++
			b.WriteString(regexp.QuoteMeta(string(g[i])))
		case c == '/':
			b.WriteString("/")
			segStart = true
		default:
			b.WriteString(regexp.QuoteMeta(string(c)))
		}
	}
	b.WriteString("$")
	return b.String()
}

// Length of the path's root ("/", "C:\\\\", "C:", "\\\\\\\\server\\\\share\\\\") and whether it is absolute
func (s *tnPathStyle) rootOf(p string) (int, bool) {
	if p == "" {
		return 0, false
	}
	if !s.win {
		if p[0] == '/' {
			return 1, true
		}
		return 0, false
	}
	if s.isSep(p[0]) {
		if len(p) > 2 && s.isSep(p[1]) && !s.isSep(p[2]) {
			// UNC root: \\\\server\\share\\
			i := 2
			for i < len(p) && !s.isSep(p[i]) {
				i++
			}
			if i < len(p) {
				j := i + 1
				for j < len(p) && s.isSep(p[j]) {
					j++
				}
				k := j
				for k < len(p) && !s.isSep(p[k]) {
					k++
				}
				if k > j {
					if k < len(p) {
						return k + 1, true
					}
					return k, true
				}
			}
		}
		return 1, true
	}
	if len(p) >= 2 && p[1] == ':' && tnIsDriveLetter(p[0]) {
		if len(p) >= 3 && s.isSep(p[2]) {
			return 3, true
		}
		return 2, false
	}
	return 0, false
}

// The device part of a root ("C:", "\\\\\\\\server\\\\share"), with separators normalized
func (s *tnPathStyle) deviceOf(p string, rootLen int) string {
	if !s.win || rootLen == 0 {
		return ""
	}
	root := strings.ReplaceAll(p[:rootLen], "/", "\\\\")
	if len(root) >= 2 && root[1] == ':' {
		return root[:2]
	}
	if strings.HasPrefix(root, "\\\\\\\\") {
		return strings.TrimRight(root, "\\\\")
	}
	return ""
}

// Node's normalizeString: resolves . and .. segments
func (s *tnPathStyle) normalizeString(p string, allowAboveRoot bool) string {
	res := ""
	lastSegmentLength := 0
	lastSlash := -1
	dots := 0
	var code byte
	for i := 0; i <= len(p); i++ {
		if i < len(p) {
			code = p[i]
		} else if s.isSep(code) {
			break
		} else {
			code = '/'
		}
		if s.isSep(code) {
			if lastSlash == i-1 || dots == 1 {
				// noop
			} else if dots == 2 {
				if len(res) < 2 || lastSegmentLength != 2 || res[len(res)-1] != '.' || res[len(res)-2] != '.' {
					if len(res) > 2 {
						idx := strings.LastIndex(res, s.sep)
						if idx == -1 {
							res = ""
							lastSegmentLength = 0
						} else {
							res = res[:idx]
							lastSegmentLength = len(res) - 1 - strings.LastIndex(res, s.sep)
						}
						lastSlash = i
						dots = 0
						continue
					} else if len(res) != 0 {
						res = ""
						lastSegmentLength = 0
						lastSlash = i
						dots = 0
						continue
					}
				}
				if allowAboveRoot {
					if len(res) > 0 {
						res += s.sep + ".."
					} else {
						res = ".."
					}
					lastSegmentLength = 2
				}
			} else {
				if len(res) > 0 {
					res += s.sep + p[lastSlash+1:i]
				} else {
					res = p[lastSlash+1 : i]
				}
				lastSegmentLength = i - lastSlash - 1
			}
			lastSlash = i
			dots = 0
		} else if code == '.' && dots != -1 {
			dots++
		} else {
			dots = -1
		}
	}
	return res
}

func (s *tnPathStyle) normalize(p string) string {
	if p == "" {
		return "."
	}
	rootLen, absolute := s.rootOf(p)
	device := s.deviceOf(p, rootLen)
	tail := p[rootLen:]
	trailing := len(p) > rootLen && s.isSep(p[len(p)-1])
	tail = s.normalizeString(tail, !absolute)
	if tail == "" && !absolute {
		tail = "."
		if trailing {
			tail = "." + s.sep
		}
	} else if tail != "" && trailing {
		tail += s.sep
	}
	if !s.win {
		if absolute {
			return "/" + tail
		}
		return tail
	}
	if strings.HasPrefix(device, "\\\\\\\\") {
		return device + "\\\\" + tail
	}
	if absolute {
		return device + "\\\\" + tail
	}
	return device + tail
}

func (s *tnPathStyle) join(parts ...string) string {
	kept := []string{}
	for _, part := range parts {
		if part != "" {
			kept = append(kept, part)
		}
	}
	if len(kept) == 0 {
		return "."
	}
	return s.normalize(strings.Join(kept, s.sep))
}

func (s *tnPathStyle) cwd() string {
	d, _ := os.Getwd()
	if s.win == (runtime.GOOS == "windows") {
		return d
	}
	if !s.win {
		// posix paths on Windows: drop the drive, use forward slashes
		d = strings.ReplaceAll(d, "\\\\", "/")
		if i := strings.Index(d, "/"); i >= 0 {
			return d[i:]
		}
		return "/"
	}
	return d
}

func (s *tnPathStyle) resolve(parts ...string) string {
	resolvedDevice := ""
	resolvedTail := ""
	resolvedAbsolute := false
	for i := len(parts) - 1; i >= -1; i-- {
		p := ""
		if i >= 0 {
			p = parts[i]
		} else {
			p = s.cwd()
		}
		if p == "" {
			continue
		}
		rootLen, absolute := s.rootOf(p)
		device := s.deviceOf(p, rootLen)
		if device != "" && resolvedDevice != "" && !strings.EqualFold(device, resolvedDevice) {
			continue
		}
		if resolvedDevice == "" {
			resolvedDevice = device
		}
		if !resolvedAbsolute {
			resolvedTail = p[rootLen:] + s.sep + resolvedTail
			resolvedAbsolute = absolute
		}
		if resolvedAbsolute && (!s.win || resolvedDevice != "") {
			break
		}
	}
	tail := s.normalizeString(resolvedTail, !resolvedAbsolute)
	if !s.win {
		if resolvedAbsolute {
			return "/" + tail
		}
		if tail == "" {
			return "."
		}
		return tail
	}
	if resolvedAbsolute {
		return resolvedDevice + "\\\\" + tail
	}
	if resolvedDevice+tail == "" {
		return "."
	}
	return resolvedDevice + tail
}

func (s *tnPathStyle) isAbsolute(p string) bool {
	_, absolute := s.rootOf(p)
	return absolute
}

func (s *tnPathStyle) splitSegments(p string, rootLen int) []string {
	out := []string{}
	for _, seg := range strings.FieldsFunc(p[rootLen:], func(r rune) bool { return r < 128 && s.isSep(byte(r)) }) {
		out = append(out, seg)
	}
	return out
}

func (s *tnPathStyle) relative(from string, to string) string {
	if from == to {
		return ""
	}
	from = s.resolve(from)
	to = s.resolve(to)
	same := func(a, b string) bool {
		if s.win {
			return strings.EqualFold(a, b)
		}
		return a == b
	}
	if same(from, to) {
		return ""
	}
	fromRoot, _ := s.rootOf(from)
	toRoot, _ := s.rootOf(to)
	if s.win && !strings.EqualFold(s.deviceOf(from, fromRoot), s.deviceOf(to, toRoot)) {
		return to
	}
	fromSegs := s.splitSegments(from, fromRoot)
	toSegs := s.splitSegments(to, toRoot)
	common := 0
	for common < len(fromSegs) && common < len(toSegs) && same(fromSegs[common], toSegs[common]) {
		common++
	}
	out := []string{}
	for i := common; i < len(fromSegs); i++ {
		out = append(out, "..")
	}
	out = append(out, toSegs[common:]...)
	return strings.Join(out, s.sep)
}

func (s *tnPathStyle) dirname(p string) string {
	if p == "" {
		return "."
	}
	rootLen, _ := s.rootOf(p)
	if !s.win {
		hasRoot := p[0] == '/'
		end := -1
		matchedSlash := true
		for i := len(p) - 1; i >= 1; i-- {
			if p[i] == '/' {
				if !matchedSlash {
					end = i
					break
				}
			} else {
				matchedSlash = false
			}
		}
		if end == -1 {
			if hasRoot {
				return "/"
			}
			return "."
		}
		if hasRoot && end == 1 {
			return "//"
		}
		return p[:end]
	}
	if rootLen == len(p) {
		return p
	}
	end := -1
	matchedSlash := true
	for i := len(p) - 1; i >= rootLen; i-- {
		if s.isSep(p[i]) {
			if !matchedSlash {
				end = i
				break
			}
		} else {
			matchedSlash = false
		}
	}
	if end == -1 {
		if rootLen == 0 {
			return "."
		}
		return p[:rootLen]
	}
	return p[:end]
}

// Index where the last segment may start (after a drive letter on win32)
func (s *tnPathStyle) segmentStart(p string) int {
	if s.win && len(p) >= 2 && p[1] == ':' && tnIsDriveLetter(p[0]) {
		return 2
	}
	return 0
}

func (s *tnPathStyle) basename(p string, suffix ...string) string {
	start := s.segmentStart(p)
	end := -1
	matchedSlash := true
	ext := ""
	if len(suffix) > 0 {
		ext = suffix[0]
	}
	if ext != "" && len(ext) <= len(p) {
		if ext == p {
			return ""
		}
		extIdx := len(ext) - 1
		firstNonSlashEnd := -1
		for i := len(p) - 1; i >= start; i-- {
			code := p[i]
			if s.isSep(code) {
				if !matchedSlash {
					start = i + 1
					break
				}
			} else {
				if firstNonSlashEnd == -1 {
					matchedSlash = false
					firstNonSlashEnd = i + 1
				}
				if extIdx >= 0 {
					if code == ext[extIdx] {
						extIdx--
						if extIdx == -1 {
							end = i
						}
					} else {
						extIdx = -1
						end = firstNonSlashEnd
					}
				}
			}
		}
		if start == end {
			end = firstNonSlashEnd
		} else if end == -1 {
			end = len(p)
		}
		return p[start:end]
	}
	for i := len(p) - 1; i >= start; i-- {
		if s.isSep(p[i]) {
			if !matchedSlash {
				start = i + 1
				break
			}
		} else if end == -1 {
			matchedSlash = false
			end = i + 1
		}
	}
	if end == -1 {
		return ""
	}
	return p[start:end]
}

// Shared scan of extname / parse: the last segment's bounds and its dot
func (s *tnPathStyle) scanExt(p string, start int) (int, int, int, bool) {
	startDot := -1
	startPart := start
	end := -1
	matchedSlash := true
	preDotState := 0
	for i := len(p) - 1; i >= start; i-- {
		code := p[i]
		if s.isSep(code) {
			if !matchedSlash {
				startPart = i + 1
				break
			}
			continue
		}
		if end == -1 {
			matchedSlash = false
			end = i + 1
		}
		if code == '.' {
			if startDot == -1 {
				startDot = i
			} else if preDotState != 1 {
				preDotState = 1
			}
		} else if startDot != -1 {
			preDotState = -1
		}
	}
	noExt := startDot == -1 || end == -1 || preDotState == 0 ||
		(preDotState == 1 && startDot == end-1 && startDot == startPart+1)
	return startPart, startDot, end, noExt
}

func (s *tnPathStyle) extname(p string) string {
	_, startDot, end, noExt := s.scanExt(p, s.segmentStart(p))
	if noExt {
		return ""
	}
	return p[startDot:end]
}

func (s *tnPathStyle) parse(p string) *TnParsedPath {
	ret := &TnParsedPath{}
	if p == "" {
		return ret
	}
	rootLen, _ := s.rootOf(p)
	ret.root = p[:rootLen]
	if rootLen == len(p) {
		ret.dir = p
		return ret
	}
	startPart, startDot, end, noExt := s.scanExt(p, rootLen)
	if end != -1 {
		if noExt {
			ret.base = p[startPart:end]
			ret.name = ret.base
		} else {
			ret.name = p[startPart:startDot]
			ret.base = p[startPart:end]
			ret.ext = p[startDot:end]
		}
	}
	if startPart > rootLen {
		ret.dir = p[:startPart-1]
	} else {
		ret.dir = ret.root
	}
	return ret
}

func (s *tnPathStyle) format(obj *TnParsedPath) string {
	dir := obj.dir
	if dir == "" {
		dir = obj.root
	}
	base := obj.base
	if base == "" {
		ext := obj.ext
		if ext != "" && ext[0] != '.' {
			ext = "." + ext
		}
		base = obj.name + ext
	}
	if dir == "" {
		return base
	}
	if dir == obj.root {
		return dir + base
	}
	return dir + s.sep + base
}

func (s *tnPathStyle) toNamespacedPath(p string) string {
	if !s.win || p == "" {
		return p
	}
	resolved := s.resolve(p)
	if len(resolved) <= 2 {
		return p
	}
	if strings.HasPrefix(resolved, "\\\\\\\\") {
		if len(resolved) > 2 && resolved[2] != '.' && resolved[2] != '?' {
			return "\\\\\\\\?\\\\UNC\\\\" + resolved[2:]
		}
		return p
	}
	if tnIsDriveLetter(resolved[0]) && resolved[1] == ':' && resolved[2] == '\\\\' {
		return "\\\\\\\\?\\\\" + resolved
	}
	return p
}

func (s *tnPathStyle) delimiter() string {
	if s.win {
		return ";"
	}
	return ":"
}

// path.format() of a non-literal object: its fields read dynamically
func TnParsedPathOf(v interface{}) *TnParsedPath {
	if p, ok := v.(*TnParsedPath); ok {
		return p
	}
	str := func(key string) string {
		if s, ok := TnGet(v, key).(string); ok {
			return s
		}
		return ""
	}
	return &TnParsedPath{root: str("root"), dir: str("dir"), base: str("base"), ext: str("ext"), name: str("name")}
}`;

const PATH_STYLES: Record<string, string> = {
  path: 'TnPathNative',
  'path/posix': 'TnPathPosix',
  'path/win32': 'TnPathWin32'
};

export function registerPath(r: NodeRegistry): void {
  defineHelper(r, 'nodePath', ['os', 'regexp', 'runtime', 'strings'], ['dynamic', 'error', 'typeOf'], pathHelper);
  defineClass(r, 'path.ParsedPath', '*TnParsedPath', 'class', '', 'root=string; dir=string; base=string; ext=string; name=string', '', '');

  for (const mod of Object.keys(PATH_STYLES)) {
    const style = PATH_STYLES[mod];
    defineModule(r, mod);
    const fn = (name: string) => (call: NodeCall) => {
      r.helper('nodePath');
      // (a dynamic argument must hold a string, as Node checks)
      const args = call.args.map((a: string, i: number) => (call.types[i] === 'interface{}' ? `TnPathArg(${a})` : a));
      return `${style}.${name}(${args.join(', ')})`;
    };
    for (const name of ['join', 'resolve', 'normalize', 'relative', 'dirname', 'basename', 'extname', 'isAbsolute', 'parse', 'toNamespacedPath', 'matchesGlob']) {
      r.functions[`${mod}.${name}`] = fn(name);
    }
    r.functions[`${mod}.format`] = (call: NodeCall) => {
      r.helper('nodePath');
      const node = call.nodes[0];
      if (isObjectLiteral(node)) {
        const fields: string[] = [];
        for (const key of ['root', 'dir', 'base', 'ext', 'name']) {
          const value = getOption(node, key);
          if (value) fields.push(`${key}: ${r.visit(value)}`);
        }
        return `${style}.format(&TnParsedPath{${fields.join(', ')}})`;
      }
      if (call.types[0] === '*TnParsedPath') return `${style}.format(${call.args[0]})`;
      return `${style}.format(TnParsedPathOf(${call.args[0]}))`;
    };
    r.values[`${mod}.sep`] = (_c: NodeCall) => {
      r.helper('nodePath');
      return `${style}.sep`;
    };
    r.values[`${mod}.delimiter`] = (_c: NodeCall) => {
      r.helper('nodePath');
      return `${style}.delimiter()`;
    };
    r.valueTypes[`${mod}.sep`] = 'string';
    r.valueTypes[`${mod}.delimiter`] = 'string';
    setResults(
      r,
      mod,
      'join=string; resolve=string; normalize=string; relative=string; dirname=string; basename=string; extname=string; isAbsolute=bool; parse=*TnParsedPath; format=string; toNamespacedPath=string; matchesGlob=bool'
    );
    r.namespaces[`${mod}.posix`] = 'path/posix';
    r.namespaces[`${mod}.win32`] = 'path/win32';
  }
}
