// @webviewjs/webview: native app windows that render a web page. Programs use
// the npm package's API, so they run unchanged under Node.js (the real package)
// and compiled (this subset). Windows embeds the system WebView2 through the
// pure-Go go-webview2 (govendor/); other platforms, and Windows without the
// WebView2 runtime, open Chrome, Edge or Chromium as an app window (no cgo).
//
// A window's UI loop never runs JS: it lives on its own goroutine, which reaches
// the program through TnLoopPost. A close is therefore reported as the window
// goes away, so the 'close' event can't be cancelled.
import { defineClass, defineHelper, defineModule } from './registry.js';
const webviewHelper = `// @webviewjs/webview: application, windows and webviews
type TnWebviewEvent struct {
	event string
}

type TnWebviewContext struct {
	dir string
}

// What a window runs on: an embedded webview, or a browser app window
type tnWebviewBackend interface {
	navigate(url string)
	setHtml(html string)
	eval(js string)
	reload()
	setTitle(title string)
	close()
}

// The ref a running app holds keeps the process alive until its last window closes
type TnWebviewApp struct {
	TnEventEmitter
	windows []*TnWebviewWindow
	running bool
	ready   bool
	exited  bool
	held    bool
	waiters []chan struct{}
}

type TnWebviewWindow struct {
	TnEventEmitter
	app       *TnWebviewApp
	title     string
	width     uint
	height    uint
	logical   bool
	resizable bool
	webview   *TnWebview
	backend   tnWebviewBackend
	scripted  bool
	closed    bool
}

type TnWebview struct {
	window   *TnWebviewWindow
	url      string
	html     string
	dir      string
	devtools bool
}

func tnWebviewString(options interface{}, key string) string {
	switch v := TnGetValue(options, key).(type) {
	case string:
		return v
	case *string:
		if v != nil {
			return *v
		}
	}
	return ""
}

func tnWebviewBool(options interface{}, key string, def bool) bool {
	switch v := TnGetValue(options, key).(type) {
	case bool:
		return v
	case *bool:
		if v != nil {
			return *v
		}
	}
	return def
}

func tnWebviewSize(options interface{}, key string, def uint) uint {
	switch v := TnGetValue(options, key).(type) {
	case float64:
		return uint(v)
	case *float64:
		if v != nil {
			return uint(*v)
		}
	}
	return def
}

func TnNewWebviewApp() *TnWebviewApp {
	return &TnWebviewApp{}
}

func (a *TnWebviewApp) createWebContext(options ...interface{}) *TnWebviewContext {
	c := &TnWebviewContext{}
	if len(options) > 0 && options[0] != nil {
		c.dir = tnWebviewString(options[0], "dataDirectory")
	}
	return c
}

func (a *TnWebviewApp) createBrowserWindow(options ...interface{}) *TnWebviewWindow {
	w := &TnWebviewWindow{app: a, width: 800, height: 600, resizable: true}
	if len(options) > 0 && options[0] != nil {
		w.title = tnWebviewString(options[0], "title")
		w.width = tnWebviewSize(options[0], "width", w.width)
		w.height = tnWebviewSize(options[0], "height", w.height)
		w.logical = tnWebviewBool(options[0], "logical", false)
		w.resizable = tnWebviewBool(options[0], "resizable", true)
	}
	a.windows = append(a.windows, w)
	return w
}

func (a *TnWebviewApp) isReady() bool {
	return a.ready
}

// Starts the app: windows open now, or as soon as they get a webview
func (a *TnWebviewApp) run() {
	if a.running {
		return
	}
	a.running = true
	a.held = true
	TnLoopRef()
	TnLoopPost(func() {
		a.ready = true
		a.emit("ready", &TnWebviewEvent{event: "ready"})
		for _, ch := range a.waiters {
			TnAsyncClose(ch)
		}
		a.waiters = nil
	})
	for _, w := range a.windows {
		w.open()
	}
}

func (a *TnWebviewApp) whenReady() chan struct{} {
	ch := make(chan struct{})
	if a.ready {
		close(ch)
		return ch
	}
	a.waiters = append(a.waiters, ch)
	a.run()
	return ch
}

// Closes every window; unlike a last window closing, this emits nothing
func (a *TnWebviewApp) exit() {
	a.exited = true
	for _, w := range a.windows {
		w.close()
	}
	a.release()
}

func (a *TnWebviewApp) release() {
	if a.held {
		a.held = false
		TnLoopUnref()
	}
}

func (a *TnWebviewApp) anyOpen() bool {
	for _, w := range a.windows {
		if w.backend != nil && !w.closed {
			return true
		}
	}
	return false
}

func (w *TnWebviewWindow) createWebview(options ...interface{}) *TnWebview {
	if w.webview != nil {
		panic(TnNodeError("Error", "ERR_WEBVIEW_MULTIPLE", "A window holds one webview"))
	}
	v := &TnWebview{window: w}
	if len(options) > 0 && options[0] != nil {
		v.url = tnWebviewString(options[0], "url")
		v.html = tnWebviewString(options[0], "html")
		v.devtools = tnWebviewBool(options[0], "enableDevtools", false)
		if c, ok := TnGetValue(options[0], "webContext").(*TnWebviewContext); ok && c != nil {
			v.dir = c.dir
		}
	}
	w.webview = v
	if w.app.running {
		w.open()
	}
	return v
}

func (w *TnWebviewWindow) open() {
	if w.webview == nil || w.backend != nil || w.closed {
		return
	}
	w.backend = tnWebviewOpen(w, func() { TnLoopPost(w.finished) })
}

func (w *TnWebviewWindow) setTitle(title string) {
	w.title = title
	if w.backend != nil && !w.closed {
		w.backend.setTitle(title)
	}
}

func (w *TnWebviewWindow) close() {
	if w.closed {
		return
	}
	if w.backend == nil {
		w.closed = true
		return
	}
	w.scripted = true
	w.backend.close()
}

// (loop task) The window is gone. As in the npm package, only a close the user
// asked for emits the first two events.
func (w *TnWebviewWindow) finished() {
	w.closed = true
	a := w.app
	if !w.scripted {
		w.emit("close", &TnWebviewEvent{event: "close"})
		a.emit("window-close-requested", &TnWebviewEvent{event: "window-close-requested"})
	}
	if a.anyOpen() {
		return
	}
	if !a.exited {
		a.emit("application-close-requested", &TnWebviewEvent{event: "application-close-requested"})
	}
	a.release()
}

func (v *TnWebview) live() bool {
	return v.window.backend != nil && !v.window.closed
}

func (v *TnWebview) loadUrl(url string) {
	v.url, v.html = url, ""
	if v.live() {
		v.window.backend.navigate(url)
	}
}

func (v *TnWebview) loadHtml(html string) {
	v.url, v.html = "", html
	if v.live() {
		v.window.backend.setHtml(html)
	}
}

func (v *TnWebview) evaluateScript(js string) {
	if v.live() {
		v.window.backend.eval(js)
	}
}

func (v *TnWebview) reload() {
	if v.live() {
		v.window.backend.reload()
	}
}

// The browser app window: the program can't reach into it, so only its own
// page and its closing are available
type tnWebviewBrowser struct {
	kill func()
}

func tnWebviewUnsupported(call string) *TnError {
	return TnNodeError("Error", "ERR_WEBVIEW_UNSUPPORTED", call+" needs an embedded webview, and this window is a browser app window")
}

func (b *tnWebviewBrowser) navigate(url string)   { panic(tnWebviewUnsupported("loadUrl")) }
func (b *tnWebviewBrowser) setHtml(html string)   { panic(tnWebviewUnsupported("loadHtml")) }
func (b *tnWebviewBrowser) eval(js string)        { panic(tnWebviewUnsupported("evaluateScript")) }
func (b *tnWebviewBrowser) reload()               { panic(tnWebviewUnsupported("reload")) }
func (b *tnWebviewBrowser) setTitle(title string) {}
func (b *tnWebviewBrowser) close()                { b.kill() }

func tnWebviewFindBrowser() string {
	var candidates []string
	switch runtime.GOOS {
	case "windows":
		for _, root := range []string{os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"), os.Getenv("LocalAppData")} {
			candidates = append(candidates, filepath.Join(root, "Microsoft", "Edge", "Application", "msedge.exe"))
			candidates = append(candidates, filepath.Join(root, "Google", "Chrome", "Application", "chrome.exe"))
		}
	case "darwin":
		home, _ := os.UserHomeDir()
		for _, root := range []string{"/Applications", filepath.Join(home, "Applications")} {
			candidates = append(candidates, filepath.Join(root, "Google Chrome.app", "Contents", "MacOS", "Google Chrome"))
			candidates = append(candidates, filepath.Join(root, "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge"))
			candidates = append(candidates, filepath.Join(root, "Chromium.app", "Contents", "MacOS", "Chromium"))
		}
	default:
		for _, name := range []string{"google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "microsoft-edge-stable"} {
			if found, err := exec.LookPath(name); err == nil {
				return found
			}
		}
	}
	for _, path := range candidates {
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			return path
		}
	}
	return ""
}

func tnWebviewOpenBrowser(w *TnWebviewWindow, closed func()) tnWebviewBackend {
	browser := tnWebviewFindBrowser()
	if browser == "" {
		panic(TnNodeError("Error", "ERR_WEBVIEW_NO_BROWSER", "No webview to open a window with: install Chrome, Edge or Chromium"))
	}
	var removals []string
	target := w.webview.url
	if w.webview.html != "" {
		// A file, since a page in a data: URL is limited by the command line's length
		page, err := os.CreateTemp("", "tnwebview-*.html")
		if err != nil {
			panic(TnNewError(err.Error()))
		}
		page.WriteString(w.webview.html)
		page.Close()
		removals = append(removals, page.Name())
		slashed := filepath.ToSlash(page.Name())
		if !strings.HasPrefix(slashed, "/") {
			slashed = "/" + slashed
		}
		target = (&tnurl.URL{Scheme: "file", Path: slashed}).String()
	}
	if target == "" {
		target = "about:blank"
	}
	// A profile of its own: the browser process then lives as long as this window,
	// instead of handing it to a browser that is already running
	var profile string
	if w.webview.dir != "" {
		profile = filepath.Join(w.webview.dir, "Browser")
	} else {
		dir, err := os.MkdirTemp("", "tnwebview-")
		if err != nil {
			panic(TnNewError(err.Error()))
		}
		profile = dir
		removals = append(removals, dir)
	}
	cmd := exec.Command(browser,
		"--app="+target,
		"--user-data-dir="+profile,
		fmt.Sprintf("--window-size=%d,%d", w.width, w.height),
		"--no-first-run",
		"--no-default-browser-check",
		// An app window, not a browser session: no account sign-in or translate prompts
		"--disable-sync",
		"--disable-features=msImplicitSignin,Translate")
	wait, kill, err := tnWebviewStartBrowser(cmd)
	if err != nil {
		panic(TnNewError(err.Error()))
	}
	go func() {
		wait()
		for _, path := range removals {
			os.RemoveAll(path)
		}
		closed()
	}()
	return &tnWebviewBrowser{kill: kill}
}`;
// WebView2 on a locked thread of its own, one per window. Calls from the program
// wait in pending until the window exists, then go through its message loop.
const webviewWindowsHelper = `type tnWebview2 struct {
	mu      sync.Mutex
	view    webview2.WebView
	pending []func(view webview2.WebView)
}

func (b *tnWebview2) do(fn func(view webview2.WebView)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.view == nil {
		b.pending = append(b.pending, fn)
		return
	}
	view := b.view
	view.Dispatch(func() { fn(view) })
}

func (b *tnWebview2) navigate(url string) {
	b.do(func(view webview2.WebView) { view.Navigate(url) })
}

func (b *tnWebview2) setHtml(html string) {
	b.do(func(view webview2.WebView) { view.SetHtml(html) })
}

func (b *tnWebview2) eval(js string) {
	b.do(func(view webview2.WebView) { view.Eval(js) })
}

func (b *tnWebview2) reload() {
	b.do(func(view webview2.WebView) { view.Eval("location.reload()") })
}

func (b *tnWebview2) setTitle(title string) {
	b.do(func(view webview2.WebView) { view.SetTitle(title) })
}

func (b *tnWebview2) close() {
	b.do(func(view webview2.WebView) { view.Destroy() })
}

// Sharp text on scaled displays: pixels per logical pixel, in percent
func tnWebviewDpiScale() uint {
	user32 := syscall.NewLazyDLL("user32.dll")
	if aware := user32.NewProc("SetProcessDpiAwarenessContext"); aware.Find() == nil {
		aware.Call(^uintptr(3)) // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2
	}
	if system := user32.NewProc("GetDpiForSystem"); system.Find() == nil {
		if dpi, _, _ := system.Call(); dpi > 0 {
			return uint(dpi) * 100 / 96
		}
	}
	return 100
}

// Beside the executable there may be no write access; the runtime needs the folder
func tnWebviewDataDir() string {
	base, err := os.UserCacheDir()
	if err != nil {
		base = os.TempDir()
	}
	exe, _ := os.Executable()
	name := strings.TrimSuffix(filepath.Base(exe), filepath.Ext(exe))
	return filepath.Join(base, name, "WebView2")
}

func tnWebviewOpenEmbedded(w *TnWebviewWindow, closed func()) tnWebviewBackend {
	b := &tnWebview2{}
	title, width, height, logical, resizable := w.title, w.width, w.height, w.logical, w.resizable
	target, html, devtools := w.webview.url, w.webview.html, w.webview.devtools
	dir := w.webview.dir
	if dir == "" {
		dir = tnWebviewDataDir()
	}
	go func() {
		runtime.LockOSThread()
		scale := tnWebviewDpiScale()
		pixelWidth, pixelHeight := width, height
		if logical {
			pixelWidth, pixelHeight = width*scale/100, height*scale/100
		}
		view := webview2.NewWithOptions(webview2.WebViewOptions{
			Debug:         devtools,
			DataPath:      dir,
			AutoFocus:     true,
			WindowOptions: webview2.WindowOptions{Title: title, Width: pixelWidth, Height: pixelHeight},
		})
		if view == nil {
			TnLoopPost(func() {
				panic(TnNodeError("Error", "ERR_WEBVIEW_CREATE", "Could not create the WebView2 window"))
			})
			closed()
			return
		}
		if !resizable {
			view.SetSize(int(pixelWidth), int(pixelHeight), webview2.HintFixed)
		}
		if html != "" {
			view.SetHtml(html)
		} else if target != "" {
			view.Navigate(target)
		}
		b.mu.Lock()
		b.view = view
		pending := b.pending
		b.pending = nil
		b.mu.Unlock()
		for _, fn := range pending {
			fn(view)
		}
		view.Run()
		closed()
	}()
	return b
}

func tnWebviewOpen(w *TnWebviewWindow, closed func()) tnWebviewBackend {
	if os.Getenv("TYPENATIVE_WEBVIEW") != "browser" {
		// Checked first: go-webview2 ends the process when the runtime can't start
		if version, err := webviewloader.GetInstalledVersion(); err == nil && version != "" {
			return tnWebviewOpenEmbedded(w, closed)
		}
	}
	return tnWebviewOpenBrowser(w, closed)
}

type tnWebviewJobCounts struct {
	times      [4]int64
	pageFaults uint32
	processes  uint32
	active     uint32
	terminated uint32
}

// Edge restarts itself, so the process started here isn't the one showing the
// window. A job holds them all, and ends them if this program dies first.
func tnWebviewStartBrowser(cmd *exec.Cmd) (func(), func(), error) {
	job, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return nil, nil, err
	}
	var limits windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION
	limits.BasicLimitInformation.LimitFlags = windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
	windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation, uintptr(unsafe.Pointer(&limits)), uint32(unsafe.Sizeof(limits)))
	if err := cmd.Start(); err != nil {
		windows.CloseHandle(job)
		return nil, nil, err
	}
	process, err := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(cmd.Process.Pid))
	if err == nil {
		err = windows.AssignProcessToJobObject(job, process)
		windows.CloseHandle(process)
	}
	if err != nil {
		cmd.Process.Kill()
		cmd.Wait()
		windows.CloseHandle(job)
		return nil, nil, err
	}
	wait := func() {
		cmd.Wait()
		for {
			var counts tnWebviewJobCounts
			// 1: JobObjectBasicAccountingInformation
			err := windows.QueryInformationJobObject(job, 1, uintptr(unsafe.Pointer(&counts)), uint32(unsafe.Sizeof(counts)), nil)
			if err != nil || counts.active == 0 {
				break
			}
			time.Sleep(200 * time.Millisecond)
		}
		windows.CloseHandle(job)
	}
	return wait, func() { windows.TerminateJobObject(job, 0) }, nil
}`;
// Elsewhere only the browser app window. The DevTools pipe says when its page
// closes: on macOS the browser process outlives its last window.
const webviewOtherHelper = `func tnWebviewOpen(w *TnWebviewWindow, closed func()) tnWebviewBackend {
	return tnWebviewOpenBrowser(w, closed)
}

func tnWebviewStartBrowser(cmd *exec.Cmd) (func(), func(), error) {
	// The browser reads fd 3 and writes fd 4
	browserIn, toBrowser, err := os.Pipe()
	if err != nil {
		return nil, nil, err
	}
	fromBrowser, browserOut, err := os.Pipe()
	if err != nil {
		return nil, nil, err
	}
	cmd.ExtraFiles = []*os.File{browserIn, browserOut}
	cmd.Args = append(cmd.Args, "--remote-debugging-pipe")
	err = cmd.Start()
	browserIn.Close()
	browserOut.Close()
	if err != nil {
		toBrowser.Close()
		fromBrowser.Close()
		return nil, nil, err
	}
	go tnWebviewWatchPages(cmd, toBrowser, fromBrowser)
	return func() { cmd.Wait() }, func() { cmd.Process.Kill() }, nil
}

// Ends the browser once its last page is gone
func tnWebviewWatchPages(cmd *exec.Cmd, toBrowser *os.File, fromBrowser *os.File) {
	defer toBrowser.Close()
	defer fromBrowser.Close()
	io.WriteString(toBrowser, "{\\"id\\":1,\\"method\\":\\"Target.setDiscoverTargets\\",\\"params\\":{\\"discover\\":true}}\\x00")
	pages := map[string]bool{}
	reader := bufio.NewReader(fromBrowser)
	for {
		line, err := reader.ReadBytes(0)
		if err != nil {
			return
		}
		var message struct {
			Method string
			Params struct {
				TargetId   string
				TargetInfo struct {
					TargetId string
					Type     string
				}
			}
		}
		if json.Unmarshal(line[:len(line)-1], &message) != nil {
			continue
		}
		switch message.Method {
		case "Target.targetCreated":
			if message.Params.TargetInfo.Type == "page" {
				pages[message.Params.TargetInfo.TargetId] = true
			}
		case "Target.targetDestroyed":
			if pages[message.Params.TargetId] {
				delete(pages, message.Params.TargetId)
				if len(pages) == 0 {
					cmd.Process.Kill()
					return
				}
			}
		}
	}
}`;
const WEBVIEW_EMITTER = 'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64';
export function registerWebview(r) {
    const mod = '@webviewjs/webview';
    defineModule(r, mod);
    defineHelper(r, 'nodeWebviewOS@windows', ['github.com/jchv/go-webview2', 'github.com/jchv/go-webview2/webviewloader', 'golang.org/x/sys/windows', 'os', 'os/exec', 'path/filepath', 'runtime', 'strings', 'sync', 'syscall', 'time', 'unsafe'], [], webviewWindowsHelper);
    defineHelper(r, 'nodeWebviewOS@other', ['bufio', 'encoding/json', 'io', 'os', 'os/exec'], [], webviewOtherHelper);
    defineHelper(r, 'nodeWebview', ['fmt', 'net/url', 'os', 'os/exec', 'path/filepath', 'runtime', 'strings'], ['dynamic', 'nodeEvents', 'eventLoop', 'promise', 'error', 'nodeWebviewOS@os'], webviewHelper);
    defineClass(r, `${mod}.Application`, '*TnWebviewApp', 'class', `${WEBVIEW_EMITTER}; createWebContext=*TnWebviewContext; createBrowserWindow=*TnWebviewWindow; isReady=bool; run=; whenReady=chan struct{}; exit=`, '', '', '');
    defineClass(r, `${mod}.BrowserWindow`, '*TnWebviewWindow', 'class', `${WEBVIEW_EMITTER}; createWebview=*TnWebview; setTitle=; close=`, '', '', '');
    defineClass(r, `${mod}.Webview`, '*TnWebview', 'class', 'loadUrl=; loadHtml=; evaluateScript=; reload=', '', '', '');
    defineClass(r, `${mod}.WebContext`, '*TnWebviewContext', 'class', '', '', '', '');
    defineClass(r, `${mod}.ApplicationEvent`, '*TnWebviewEvent', 'class', '', 'event=string', '', '');
    const listeners = (_n) => ['*TnWebviewEvent'];
    r.paramTypers[`${mod}.Application#on`] = listeners;
    r.paramTypers[`${mod}.Application#once`] = listeners;
    r.paramTypers[`${mod}.BrowserWindow#on`] = listeners;
    r.paramTypers[`${mod}.BrowserWindow#once`] = listeners;
    r.constructors[`${mod}.Application`] = (_c) => {
        r.helper('nodeWebview');
        return 'TnNewWebviewApp()';
    };
}
