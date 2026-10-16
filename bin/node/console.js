// node:console + the global console's extra methods (count / group / time /
// assert / trace / dir). console.log / error / warn themselves are lowered in
// the transpiler (callHandlers); node:console's functions route there.
import { defineHelper, defineModule } from './registry.js';
const consoleHelper = `// console: group indentation, counters and timers (Node's output formats)
var tnConsoleIndent = ""
var tnConsoleCounts = map[string]int{}
var tnConsoleTimers = map[string]time.Time{}
var tnConsoleMu sync.Mutex

func TnConsoleWrite(w *os.File, line string) {
	tnConsoleMu.Lock()
	defer tnConsoleMu.Unlock()
	if tnConsoleIndent != "" {
		line = tnConsoleIndent + strings.ReplaceAll(line, "\\n", "\\n"+tnConsoleIndent)
	}
	fmt.Fprintln(w, line)
}

func TnConsoleGroup(label ...interface{}) {
	if len(label) > 0 {
		TnConsoleWrite(os.Stdout, strings.TrimSuffix(fmt.Sprintln(label...), "\\n"))
	}
	tnConsoleMu.Lock()
	tnConsoleIndent += "  "
	tnConsoleMu.Unlock()
}

func TnConsoleGroupEnd() {
	tnConsoleMu.Lock()
	if len(tnConsoleIndent) >= 2 {
		tnConsoleIndent = tnConsoleIndent[2:]
	}
	tnConsoleMu.Unlock()
}

func TnConsoleCount(label ...string) {
	name := "default"
	if len(label) > 0 {
		name = label[0]
	}
	tnConsoleMu.Lock()
	tnConsoleCounts[name]++
	n := tnConsoleCounts[name]
	tnConsoleMu.Unlock()
	TnConsoleWrite(os.Stdout, fmt.Sprintf("%s: %d", name, n))
}

func TnConsoleCountReset(label ...string) {
	name := "default"
	if len(label) > 0 {
		name = label[0]
	}
	tnConsoleMu.Lock()
	delete(tnConsoleCounts, name)
	tnConsoleMu.Unlock()
}

func tnTimerLabel(label []string) string {
	if len(label) > 0 {
		return label[0]
	}
	return "default"
}

func TnConsoleTime(label ...string) {
	tnConsoleMu.Lock()
	tnConsoleTimers[tnTimerLabel(label)] = time.Now()
	tnConsoleMu.Unlock()
}

// Node's duration format: 1.234ms, 1.234s, 1:02.345 (m:ss.mmm)
func tnFormatDuration(d time.Duration) string {
	ms := float64(d.Nanoseconds()) / 1e6
	if ms < 1000 {
		return fmt.Sprintf("%.3fms", ms)
	}
	if ms < 60000 {
		return fmt.Sprintf("%.3fs", ms/1000)
	}
	minutes := int(ms / 60000)
	return fmt.Sprintf("%d:%06.3f (m:ss.mmm)", minutes, (ms-float64(minutes)*60000)/1000)
}

func tnConsoleElapsed(label string, end bool) (string, bool) {
	tnConsoleMu.Lock()
	defer tnConsoleMu.Unlock()
	start, ok := tnConsoleTimers[label]
	if !ok {
		return "", false
	}
	if end {
		delete(tnConsoleTimers, label)
	}
	return label + ": " + tnFormatDuration(time.Since(start)), true
}

func TnConsoleTimeEnd(label ...string) {
	name := tnTimerLabel(label)
	if line, ok := tnConsoleElapsed(name, true); ok {
		TnConsoleWrite(os.Stdout, line)
	} else {
		TnConsoleWrite(os.Stderr, "Warning: No such label '"+name+"' for console.timeEnd()")
	}
}

func TnConsoleTimeLog(label string, extra string) {
	if line, ok := tnConsoleElapsed(label, false); ok {
		if extra != "" {
			line += " " + extra
		}
		TnConsoleWrite(os.Stdout, line)
	} else {
		TnConsoleWrite(os.Stderr, "Warning: No such label '"+label+"' for console.timeLog()")
	}
}`;
export function registerConsole(r) {
    defineModule(r, 'console');
    defineHelper(r, 'console', ['fmt', 'os', 'strings', 'sync', 'time'], [], consoleHelper);
    r.namespaces['console.default'] = 'console';
}
