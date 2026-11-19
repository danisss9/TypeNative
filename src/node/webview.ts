// @webviewjs/webview: native app windows that render a web page. Programs use
// the npm package's API, so they run unchanged under Node.js (the real package)
// and compiled (this subset). Windows embeds the system WebView2 through the
// pure-Go go-webview2/pkg/edge (govendor/) with native Win32 menus, tray icons,
// notifications, IPC, custom protocols and window controls; other platforms,
// and Windows without the WebView2 runtime, open Chrome, Edge or Chromium as an
// app window (no cgo).
//
// A window's UI loop never runs JS: it lives on its own goroutine, which reaches
// the program through TnLoopPost. A close is therefore reported as the window
// goes away, so the 'close' event can't be cancelled.
import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule } from './registry.js';

const webviewHelper = `// @webviewjs/webview: application, windows, webviews, menus, tray icons, notifications, IPC, protocols
type TnWebviewCustomMenuEvent struct {
	id       string
	windowId float64
}

type TnWebviewEvent struct {
	event           string
	customMenuEvent *TnWebviewCustomMenuEvent
	x               float64
	y               float64
	width           float64
	height          float64
}

type TnWebviewHeaderData struct {
	key   string
	value string
}

type TnWebviewIpcMessage struct {
	body    []byte
	method  string
	headers []*TnWebviewHeaderData
	uri     string
}

type TnWebviewDimensions struct {
	width  float64
	height float64
}

type TnWebviewPosition struct {
	x float64
	y float64
}

type TnWebviewTrayRect struct {
	x      float64
	y      float64
	width  float64
	height float64
}

type TnWebviewTrayEvent struct {
	event       string
	id          string
	x           float64
	y           float64
	rect        *TnWebviewTrayRect
	button      string
	buttonState string
}

type TnWebviewMenuItem struct {
	id          string
	label       string
	enabled     bool
	accelerator string
	role        string
	submenu     []*TnWebviewMenuItem
}

type TnWebviewContext struct {
	dir              string
	protocols        map[string]bool
	allowsAutomation bool
	disposed         bool
}

func (c *TnWebviewContext) Get_dataDirectory() string {
	return c.dir
}

func (c *TnWebviewContext) isCustomProtocolRegistered(scheme string) bool {
	if c.protocols == nil {
		return false
	}
	return c.protocols[strings.ToLower(scheme)]
}

func (c *TnWebviewContext) setAllowsAutomation(flag bool) {
	c.allowsAutomation = flag
}

func (c *TnWebviewContext) dispose() {
	c.disposed = true
}

func (c *TnWebviewContext) isDisposed() bool {
	return c.disposed
}

type tnWebviewProtocolResp struct {
	statusCode int
	mimeType   string
	headers    string
	body       []byte
}

// What a window runs on: an embedded webview, or a browser app window
type tnWebviewBackend interface {
	navigate(url string)
	setHtml(html string)
	eval(js string)
	initScript(js string)
	reload()
	setTitle(title string)
	setMenu(items []*TnWebviewMenuItem)
	registerProtocol(scheme string)
	setVisible(visible bool)
	focus()
	setMaximized(v bool)
	setMinimized(v bool)
	setResizable(v bool)
	setDecorations(v bool)
	setClosable(v bool)
	setMaximizable(v bool)
	setMinimizable(v bool)
	setAlwaysOnTop(v bool)
	setAlwaysOnBottom(v bool)
	setContentProtection(v bool)
	setSkipTaskbar(v bool)
	setEnable(v bool)
	setFullscreen(ft int)
	setSize(width uint, height uint, logical bool)
	setMinSize(width uint, height uint, logical bool)
	setMaxSize(width uint, height uint, logical bool)
	getInnerSize(logical bool) (float64, float64)
	getOuterSize(logical bool) (float64, float64)
	setPosition(x int, y int, logical bool)
	getPosition(logical bool) (float64, float64)
	center()
	scaleFactor() float64
	startDragging()
	requestRedraw()
	setZoom(scale float64)
	setWebviewVisibility(visible bool)
	focusWebview()
	openFileDialog(opts interface{}) []string
	close()
}

type tnWebviewTrayBackend interface {
	setIcon(data []byte, width int, height int)
	removeIcon()
	setMenu(items []*TnWebviewMenuItem)
	setTooltip(tooltip string)
	setTitle(title string)
	setVisible(visible bool)
	rect() *TnWebviewTrayRect
	showMenu()
	dispose()
}

// The ref a running app holds keeps the process alive until its last window closes
type TnWebviewApp struct {
	TnEventEmitter
	windows      []*TnWebviewWindow
	trays        []*TnWebviewTrayIcon
	menu         []*TnWebviewMenuItem
	nextWindowId float64
	nextTrayId   int
	running      bool
	ready        bool
	exited       bool
	held         bool
	waiters      []chan struct{}
}

type TnWebviewWindow struct {
	TnEventEmitter
	app               *TnWebviewApp
	windowId          float64
	child             bool
	title             string
	width             uint
	height            uint
	x                 int
	y                 int
	hasPos            bool
	logical           bool
	resizable         bool
	visible           bool
	decorated         bool
	closable          bool
	maximizable       bool
	minimizable       bool
	maximized         bool
	minimized         bool
	focused           bool
	alwaysOnTop       bool
	alwaysOnBottom    bool
	contentProtection bool
	skipTaskbar       bool
	enabled           bool
	fullscreen        int // -1 = none, 0 = Exclusive, 1 = Borderless
	minWidth          uint
	minHeight         uint
	maxWidth          uint
	maxHeight         uint
	menu              []*TnWebviewMenuItem
	hasMenuFlag       bool
	protocols         map[string]interface{}
	webview           *TnWebview
	backend           tnWebviewBackend
	scripted          bool
	closed            bool
	disposed          bool
}

type tnWebviewExposedNs struct {
	target      interface{}
	funcs       map[string]interface{}
	staticsJson string
	funcNames   []string
}

type TnWebview struct {
	window               *TnWebviewWindow
	context              *TnWebviewContext
	url                  string
	html                 string
	dir                  string
	devtools             bool
	ipcName              string
	useHttpsScheme       bool
	autoNormalizeLoadUrl bool
	ipcHandler           interface{}
	exposed              map[string]*tnWebviewExposedNs
	exposedOrder         []string
	disposed             bool
}

type TnWebviewTrayIcon struct {
	TnEventEmitter
	app          *TnWebviewApp
	id           string
	tooltip      string
	title        string
	menu         []*TnWebviewMenuItem
	visible      bool
	iconData     []byte
	iconW        int
	iconH        int
	iconTemplate bool
	menuOnLeft   bool
	menuOnRight  bool
	disposed     bool
	backend      tnWebviewTrayBackend
}

type TnWebviewNotificationEvent struct {
	eventType string
	target    *TnWebviewNotification
	action    string
	err       *TnError
}

func (e *TnWebviewNotificationEvent) Get_type_() string  { return e.eventType }
func (e *TnWebviewNotificationEvent) Get_error() *TnError { return e.err }

type TnWebviewNotification struct {
	TnEventEmitter
	title              string
	body               string
	icon               string
	image              interface{}
	badge              string
	tag                string
	data               interface{}
	dir                string
	lang               string
	renotify           bool
	requireInteraction bool
	persistent         bool
	actions            []interface{}
	silent             bool
	timestamp          float64
	vibrate            interface{}
	onclick            interface{}
	onclose            interface{}
	onerror            interface{}
	onshow             interface{}
	closed             bool
	cancel             func()
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
	case int:
		return uint(v)
	}
	return def
}

func tnWebviewInt(options interface{}, key string) (int, bool) {
	switch v := TnGetValue(options, key).(type) {
	case float64:
		return int(v), true
	case *float64:
		if v != nil {
			return int(*v), true
		}
	case int:
		return v, true
	}
	return 0, false
}

func tnWebviewBytes(val interface{}) []byte {
	switch b := val.(type) {
	case []byte:
		return b
	case *[]byte:
		if b != nil {
			return *b
		}
	case []float64:
		out := make([]byte, len(b))
		for i, n := range b {
			out[i] = byte(n)
		}
		return out
	case []interface{}:
		out := make([]byte, len(b))
		for i, x := range b {
			if n, ok := x.(float64); ok {
				out[i] = byte(n)
			}
		}
		return out
	}
	return nil
}

func tnWebviewParseMenu(raw interface{}) []*TnWebviewMenuItem {
	if raw == nil {
		return nil
	}
	itemsVal := TnGetValue(raw, "items")
	if itemsVal == nil {
		return nil
	}
	rv := reflect.ValueOf(itemsVal)
	if rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return nil
		}
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Slice {
		return nil
	}
	out := make([]*TnWebviewMenuItem, 0, rv.Len())
	for i := 0; i < rv.Len(); i++ {
		el := rv.Index(i).Interface()
		if el == nil {
			continue
		}
		item := &TnWebviewMenuItem{
			id:          tnWebviewString(el, "id"),
			label:       tnWebviewString(el, "label"),
			enabled:     tnWebviewBool(el, "enabled", true),
			accelerator: tnWebviewString(el, "accelerator"),
			role:        tnWebviewString(el, "role"),
		}
		if sub := TnGetValue(el, "submenu"); sub != nil {
			item.submenu = tnWebviewParseMenu(sub)
		}
		out = append(out, item)
	}
	return out
}

// --- URI workaround helpers (matching @webviewjs/webview) ---

func TnWebviewOriginalUriPrefix(protocol string) string {
	return protocol + "://"
}

func TnWebviewWorkAroundUriPrefix(httpOrHttps string, protocol string) string {
	return httpOrHttps + "://" + protocol + "."
}

func TnWebviewApplyUriWorkAround(uri string, httpOrHttps string, protocol string) string {
	orig := TnWebviewOriginalUriPrefix(protocol)
	if strings.HasPrefix(uri, orig) {
		return TnWebviewWorkAroundUriPrefix(httpOrHttps, protocol) + strings.TrimPrefix(uri, orig)
	}
	return uri
}

func TnWebviewRevertUriWorkAround(uri string, httpOrHttps string, protocol string) string {
	wa := TnWebviewWorkAroundUriPrefix(httpOrHttps, protocol)
	if strings.HasPrefix(uri, wa) {
		return TnWebviewOriginalUriPrefix(protocol) + strings.TrimPrefix(uri, wa)
	}
	return uri
}

func TnWebviewIsWorkAroundUri(uri string, httpOrHttps string, protocol string) bool {
	return strings.HasPrefix(uri, TnWebviewWorkAroundUriPrefix(httpOrHttps, protocol))
}

// --- Application ---

func TnNewWebviewApp(options ...interface{}) *TnWebviewApp {
	return &TnWebviewApp{}
}

func (a *TnWebviewApp) createWebContext(options ...interface{}) *TnWebviewContext {
	c := &TnWebviewContext{protocols: map[string]bool{}}
	if len(options) > 0 && options[0] != nil {
		c.dir = tnWebviewString(options[0], "dataDirectory")
		c.allowsAutomation = tnWebviewBool(options[0], "allowsAutomation", false)
	}
	return c
}

func (a *TnWebviewApp) setMenu(options ...interface{}) {
	if len(options) == 0 || options[0] == nil {
		a.menu = nil
	} else {
		a.menu = tnWebviewParseMenu(options[0])
	}
	for _, w := range a.windows {
		if !w.hasMenuFlag {
			w.menu = a.menu
			if w.backend != nil && !w.closed {
				w.backend.setMenu(w.menu)
			}
		}
	}
}

func (a *TnWebviewApp) setDockIcon(icon interface{}) {}
func (a *TnWebviewApp) removeDockIcon()              {}

func (a *TnWebviewApp) createTrayIcon(options ...interface{}) *TnWebviewTrayIcon {
	a.nextTrayId++
	t := &TnWebviewTrayIcon{
		app:         a,
		id:          fmt.Sprintf("tray-%d", a.nextTrayId),
		visible:     true,
		menuOnLeft:  false,
		menuOnRight: true,
	}
	if len(options) > 0 && options[0] != nil {
		opts := options[0]
		if id := tnWebviewString(opts, "id"); id != "" {
			t.id = id
		}
		t.tooltip = tnWebviewString(opts, "tooltip")
		t.title = tnWebviewString(opts, "title")
		t.iconTemplate = tnWebviewBool(opts, "iconIsTemplate", false)
		t.menuOnLeft = tnWebviewBool(opts, "menuOnLeftClick", false)
		t.menuOnRight = tnWebviewBool(opts, "menuOnRightClick", true)
		if m := TnGetValue(opts, "menu"); m != nil {
			t.menu = tnWebviewParseMenu(m)
		}
		if img := TnGetValue(opts, "icon"); img != nil {
			t.iconData = tnWebviewBytes(TnGetValue(img, "data"))
			if w, ok := tnWebviewInt(img, "width"); ok {
				t.iconW = w
			}
			if h, ok := tnWebviewInt(img, "height"); ok {
				t.iconH = h
			}
		}
	}
	a.trays = append(a.trays, t)
	if a.running {
		t.open()
	}
	return t
}

func (a *TnWebviewApp) newWindow(child bool, options ...interface{}) *TnWebviewWindow {
	a.nextWindowId++
	w := &TnWebviewWindow{
		app:         a,
		windowId:    a.nextWindowId,
		child:       child,
		width:       800,
		height:      600,
		resizable:   true,
		visible:     true,
		decorated:   true,
		closable:    true,
		maximizable: true,
		minimizable: true,
		focused:     true,
		enabled:     true,
		fullscreen:  -1,
		menu:        a.menu,
		protocols:   map[string]interface{}{},
	}
	if len(options) > 0 && options[0] != nil {
		opts := options[0]
		w.title = tnWebviewString(opts, "title")
		w.width = tnWebviewSize(opts, "width", w.width)
		w.height = tnWebviewSize(opts, "height", w.height)
		w.logical = tnWebviewBool(opts, "logical", false)
		w.resizable = tnWebviewBool(opts, "resizable", true)
		w.visible = tnWebviewBool(opts, "visible", true)
		w.decorated = tnWebviewBool(opts, "decorations", true)
		w.maximizable = tnWebviewBool(opts, "maximizable", true)
		w.minimizable = tnWebviewBool(opts, "minimizable", true)
		w.maximized = tnWebviewBool(opts, "maximized", false)
		w.focused = tnWebviewBool(opts, "focused", true)
		w.alwaysOnTop = tnWebviewBool(opts, "alwaysOnTop", false)
		w.alwaysOnBottom = tnWebviewBool(opts, "alwaysOnBottom", false)
		w.contentProtection = tnWebviewBool(opts, "contentProtection", false)
		w.skipTaskbar = tnWebviewBool(opts, "windowsSkipTaskbar", false)
		if x, ok := tnWebviewInt(opts, "x"); ok {
			w.x = x
			w.hasPos = true
		}
		if y, ok := tnWebviewInt(opts, "y"); ok {
			w.y = y
			w.hasPos = true
		}
		if fs, ok := tnWebviewInt(opts, "fullscreen"); ok {
			w.fullscreen = fs
		}
		if m := TnGetValue(opts, "menu"); m != nil {
			w.menu = tnWebviewParseMenu(m)
			w.hasMenuFlag = true
		}
	}
	a.windows = append(a.windows, w)
	return w
}

func (a *TnWebviewApp) createBrowserWindow(options ...interface{}) *TnWebviewWindow {
	return a.newWindow(false, options...)
}

func (a *TnWebviewApp) createChildBrowserWindow(options ...interface{}) *TnWebviewWindow {
	return a.newWindow(true, options...)
}

func (a *TnWebviewApp) isReady() bool {
	return a.ready
}

// Starts the app: windows and tray icons open now, or as soon as they are created
func (a *TnWebviewApp) run(options ...interface{}) {
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
	for _, t := range a.trays {
		t.open()
	}
	for _, w := range a.windows {
		w.open()
	}
}

func (a *TnWebviewApp) whenReady(options ...interface{}) chan struct{} {
	ch := make(chan struct{})
	if a.ready {
		close(ch)
		return ch
	}
	a.waiters = append(a.waiters, ch)
	a.run()
	return ch
}

// Closes every window and tray icon; unlike a last window closing, this emits nothing
func (a *TnWebviewApp) exit() {
	a.exited = true
	for _, t := range a.trays {
		t.dispose()
	}
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

// --- TrayIcon ---

func (t *TnWebviewTrayIcon) open() {
	if t.disposed || t.backend != nil {
		return
	}
	t.backend = tnWebviewOpenTray(t)
}

func (t *TnWebviewTrayIcon) Get_id() string { return t.id }

func (t *TnWebviewTrayIcon) setIcon(icon interface{}, rest ...interface{}) {
	if t.disposed {
		return
	}
	t.iconData = tnWebviewBytes(icon)
	t.iconW, t.iconH = 0, 0
	if len(rest) > 0 && rest[0] != nil {
		if n, ok := rest[0].(float64); ok {
			t.iconW = int(n)
		}
	}
	if len(rest) > 1 && rest[1] != nil {
		if n, ok := rest[1].(float64); ok {
			t.iconH = int(n)
		}
	}
	if t.backend != nil {
		t.backend.setIcon(t.iconData, t.iconW, t.iconH)
	}
}

func (t *TnWebviewTrayIcon) removeIcon() {
	if t.disposed {
		return
	}
	t.iconData = nil
	t.iconW, t.iconH = 0, 0
	if t.backend != nil {
		t.backend.removeIcon()
	}
}

func (t *TnWebviewTrayIcon) setMenu(menu ...interface{}) {
	if t.disposed {
		return
	}
	if len(menu) == 0 || menu[0] == nil {
		t.menu = nil
	} else {
		t.menu = tnWebviewParseMenu(menu[0])
	}
	if t.backend != nil {
		t.backend.setMenu(t.menu)
	}
}

func (t *TnWebviewTrayIcon) setTooltip(tooltip ...interface{}) {
	if t.disposed {
		return
	}
	if len(tooltip) == 0 || tooltip[0] == nil {
		t.tooltip = ""
	} else if s, ok := tooltip[0].(string); ok {
		t.tooltip = s
	}
	if t.backend != nil {
		t.backend.setTooltip(t.tooltip)
	}
}

func (t *TnWebviewTrayIcon) setTitle(title ...interface{}) {
	if t.disposed {
		return
	}
	if len(title) == 0 || title[0] == nil {
		t.title = ""
	} else if s, ok := title[0].(string); ok {
		t.title = s
	}
	if t.backend != nil {
		t.backend.setTitle(t.title)
	}
}

func (t *TnWebviewTrayIcon) setVisible(visible bool) {
	if t.disposed {
		return
	}
	t.visible = visible
	if t.backend != nil {
		t.backend.setVisible(visible)
	}
}

func (t *TnWebviewTrayIcon) setIconAsTemplate(value bool) {
	t.iconTemplate = value
}

func (t *TnWebviewTrayIcon) setShowMenuOnLeftClick(value bool) {
	t.menuOnLeft = value
}

func (t *TnWebviewTrayIcon) setShowMenuOnRightClick(value bool) {
	t.menuOnRight = value
}

func (t *TnWebviewTrayIcon) showMenu() {
	if !t.disposed && t.backend != nil {
		t.backend.showMenu()
	}
}

func (t *TnWebviewTrayIcon) rect() *TnWebviewTrayRect {
	if !t.disposed && t.backend != nil {
		return t.backend.rect()
	}
	return nil
}

func (t *TnWebviewTrayIcon) dispose() {
	if t.disposed {
		return
	}
	t.disposed = true
	if t.backend != nil {
		t.backend.dispose()
		t.backend = nil
	}
}

func (t *TnWebviewTrayIcon) isDisposed() bool {
	return t.disposed
}

// --- Notification ---

func TnWebviewNotificationRequestPermission() chan string {
	ch := make(chan string, 1)
	ch <- "granted"
	close(ch)
	return ch
}

func TnNewWebviewNotification(title string, options ...interface{}) *TnWebviewNotification {
	n := &TnWebviewNotification{
		title:     title,
		image:     "",
		dir:       "auto",
		timestamp: float64(time.Now().UnixMilli()),
		vibrate:   []float64{},
		actions:   []interface{}{},
	}
	if len(options) > 0 && options[0] != nil {
		opts := options[0]
		n.body = tnWebviewString(opts, "body")
		n.icon = tnWebviewString(opts, "icon")
		if img := TnGetValue(opts, "image"); img != nil {
			n.image = img
		}
		n.badge = tnWebviewString(opts, "badge")
		n.tag = tnWebviewString(opts, "tag")
		n.data = TnGetValue(opts, "data")
		if d := tnWebviewString(opts, "dir"); d != "" {
			n.dir = d
		}
		n.lang = tnWebviewString(opts, "lang")
		n.renotify = tnWebviewBool(opts, "renotify", false)
		n.requireInteraction = tnWebviewBool(opts, "requireInteraction", false)
		n.persistent = tnWebviewBool(opts, "persistent", false)
		n.silent = tnWebviewBool(opts, "silent", false)
		if ts, ok := TnGetValue(opts, "timestamp").(float64); ok {
			n.timestamp = ts
		}
		if vib := TnGetValue(opts, "vibrate"); vib != nil {
			n.vibrate = vib
		}
		if acts := TnGetValue(opts, "actions"); acts != nil {
			rv := reflect.ValueOf(acts)
			if rv.Kind() == reflect.Slice {
				for i := 0; i < rv.Len(); i++ {
					n.actions = append(n.actions, rv.Index(i).Interface())
				}
			}
		}
	}
	n.cancel = tnWebviewShowNotification(n)
	return n
}

func (n *TnWebviewNotification) dispatchEvent(kind string, action string, err *TnError) {
	ev := &TnWebviewNotificationEvent{eventType: kind, target: n, action: action, err: err}
	n.emit(kind, ev)
	var prop interface{}
	switch kind {
	case "click":
		prop = n.onclick
	case "close":
		prop = n.onclose
	case "error":
		prop = n.onerror
	case "show":
		prop = n.onshow
	}
	if prop != nil {
		TnInvoke(prop, ev)
	}
}

func (n *TnWebviewNotification) close() {
	if n.closed {
		return
	}
	n.closed = true
	if n.cancel != nil {
		n.cancel()
		n.cancel = nil
	}
	n.dispatchEvent("close", "", nil)
}

func (n *TnWebviewNotification) Get_title() string              { return n.title }
func (n *TnWebviewNotification) Get_body() string               { return n.body }
func (n *TnWebviewNotification) Get_icon() string               { return n.icon }
func (n *TnWebviewNotification) Get_image() interface{}         { return n.image }
func (n *TnWebviewNotification) Get_badge() string              { return n.badge }
func (n *TnWebviewNotification) Get_tag() string                { return n.tag }
func (n *TnWebviewNotification) Get_data() interface{}          { return n.data }
func (n *TnWebviewNotification) Get_dir() string                { return n.dir }
func (n *TnWebviewNotification) Get_lang() string               { return n.lang }
func (n *TnWebviewNotification) Get_renotify() bool             { return n.renotify }
func (n *TnWebviewNotification) Get_requireInteraction() bool   { return n.requireInteraction }
func (n *TnWebviewNotification) Get_persistent() bool           { return n.persistent }
func (n *TnWebviewNotification) Get_actions() []interface{}     { return n.actions }
func (n *TnWebviewNotification) Get_silent() bool               { return n.silent }
func (n *TnWebviewNotification) Get_timestamp() float64         { return n.timestamp }
func (n *TnWebviewNotification) Get_vibrate() interface{}       { return n.vibrate }
func (n *TnWebviewNotification) Get_onclick() interface{}       { return n.onclick }
func (n *TnWebviewNotification) Set_onclick(v interface{})      { n.onclick = v }
func (n *TnWebviewNotification) Get_onclose() interface{}       { return n.onclose }
func (n *TnWebviewNotification) Set_onclose(v interface{})      { n.onclose = v }
func (n *TnWebviewNotification) Get_onerror() interface{}       { return n.onerror }
func (n *TnWebviewNotification) Set_onerror(v interface{})      { n.onerror = v }
func (n *TnWebviewNotification) Get_onshow() interface{}        { return n.onshow }
func (n *TnWebviewNotification) Set_onshow(v interface{})       { n.onshow = v }

// --- BrowserWindow ---

func (w *TnWebviewWindow) registerProtocol(name string, handler interface{}) {
	if w.disposed {
		panic(TnNewError("BrowserWindow has been disposed"))
	}
	scheme := strings.ToLower(name)
	w.protocols[scheme] = handler
	if w.webview != nil && w.webview.context != nil {
		w.webview.context.protocols[scheme] = true
	}
	if w.backend != nil && !w.closed {
		w.backend.registerProtocol(scheme)
	}
}

func (w *TnWebviewWindow) normalizeUrl(raw string) string {
	if w.webview == nil || !w.webview.autoNormalizeLoadUrl {
		return raw
	}
	scheme := "http"
	if w.webview.useHttpsScheme {
		scheme = "https"
	}
	for proto := range w.protocols {
		if strings.HasPrefix(raw, proto+"://") {
			return TnWebviewApplyUriWorkAround(raw, scheme, proto)
		}
	}
	return raw
}

func (w *TnWebviewWindow) handleProtocolRequest(scheme string, rawUrl string, method string) tnWebviewProtocolResp {
	done := make(chan tnWebviewProtocolResp, 1)
	TnLoopPost(func() {
		handler, ok := w.protocols[scheme]
		if !ok || handler == nil {
			done <- tnWebviewProtocolResp{statusCode: 404, mimeType: "text/plain", body: []byte("Not Found")}
			return
		}
		defer func() {
			if r := recover(); r != nil {
				done <- tnWebviewProtocolResp{statusCode: 500, mimeType: "text/plain", body: []byte(fmt.Sprint(r))}
			}
		}()
		req := TnNewRequest(rawUrl, map[string]interface{}{"method": method})
		res := TnInvoke(handler, req)
		tnWebviewSettleProtocol(res, done)
	})
	return <-done
}

func tnWebviewSettleProtocol(res interface{}, done chan tnWebviewProtocolResp) {
	rv := reflect.ValueOf(res)
	if rv.IsValid() && rv.Kind() == reflect.Chan && !rv.IsNil() {
		go func() {
			val, ok := rv.Recv()
			var inner interface{}
			if ok {
				if val.IsValid() {
					inner = val.Interface()
				}
			} else if resolved, found := tnResolved.Load(res); found {
				inner = resolved
			} else if reason, found := tnRejections.Load(res); found {
				done <- tnWebviewProtocolResp{statusCode: 500, mimeType: "text/plain", body: []byte(fmt.Sprint(reason))}
				return
			}
			TnLoopPost(func() { tnWebviewConvertProtocolResp(inner, done) })
		}()
		return
	}
	tnWebviewConvertProtocolResp(res, done)
}

func tnWebviewConvertProtocolResp(res interface{}, done chan tnWebviewProtocolResp) {
	if resp, ok := res.(*TnResponse); ok && resp != nil {
		status := int(resp.status)
		if status == 0 {
			status = 200
		}
		mime := "application/octet-stream"
		var hdrs strings.Builder
		if resp.headers != nil {
			if ct := resp.headers.get("content-type"); ct != nil && *ct != "" {
				mime = *ct
			}
			for _, kv := range resp.headers.entries() {
				if strings.ToLower(kv[0]) != "content-type" {
					hdrs.WriteString(kv[0])
					hdrs.WriteString(": ")
					hdrs.WriteString(kv[1])
					hdrs.WriteString("\\r\\n")
				}
			}
		}
		hdrs.WriteString("Content-Type: ")
		hdrs.WriteString(mime)
		bodyCh := resp.bytes()
		go func() {
			data, ok := <-bodyCh
			if !ok {
				if resolved, found := tnResolved.Load(any(bodyCh)); found {
					if b, ok := resolved.([]byte); ok {
						data = b
					}
				}
			}
			done <- tnWebviewProtocolResp{statusCode: status, mimeType: mime, headers: hdrs.String(), body: data}
		}()
		return
	}
	// CustomProtocolResponse object: { statusCode?, headers?, body, mimeType? }
	status := 200
	if sc, ok := tnWebviewInt(res, "statusCode"); ok && sc > 0 {
		status = sc
	}
	mime := tnWebviewString(res, "mimeType")
	if mime == "" {
		mime = "application/octet-stream"
	}
	body := tnWebviewBytes(TnGetValue(res, "body"))
	var hdrs strings.Builder
	if hVal := TnGetValue(res, "headers"); hVal != nil {
		rv := reflect.ValueOf(hVal)
		if rv.Kind() == reflect.Slice {
			for i := 0; i < rv.Len(); i++ {
				item := rv.Index(i).Interface()
				k := tnWebviewString(item, "key")
				v := tnWebviewString(item, "value")
				if k != "" && strings.ToLower(k) != "content-type" {
					hdrs.WriteString(k)
					hdrs.WriteString(": ")
					hdrs.WriteString(v)
					hdrs.WriteString("\\r\\n")
				}
			}
		}
	}
	hdrs.WriteString("Content-Type: ")
	hdrs.WriteString(mime)
	done <- tnWebviewProtocolResp{statusCode: status, mimeType: mime, headers: hdrs.String(), body: body}
}

func (w *TnWebviewWindow) createWebview(options ...interface{}) *TnWebview {
	if w.webview != nil {
		panic(TnNodeError("Error", "ERR_WEBVIEW_MULTIPLE", "A window holds one webview"))
	}
	v := &TnWebview{
		window:               w,
		ipcName:              "ipc",
		autoNormalizeLoadUrl: true,
		exposed:              map[string]*tnWebviewExposedNs{},
	}
	if len(options) > 0 && options[0] != nil {
		opts := options[0]
		v.url = tnWebviewString(opts, "url")
		v.html = tnWebviewString(opts, "html")
		v.devtools = tnWebviewBool(opts, "enableDevtools", false)
		v.useHttpsScheme = tnWebviewBool(opts, "useHttpsScheme", false)
		v.autoNormalizeLoadUrl = tnWebviewBool(opts, "autoNormalizeLoadUrl", true)
		if ipc := tnWebviewString(opts, "ipcName"); ipc != "" {
			v.ipcName = ipc
		}
		if c, ok := TnGetValue(opts, "webContext").(*TnWebviewContext); ok && c != nil {
			v.context = c
			v.dir = c.dir
			for proto := range w.protocols {
				c.protocols[proto] = true
			}
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

func (w *TnWebviewWindow) id() float64          { return w.windowId }
func (w *TnWebviewWindow) Get_isChild() bool    { return w.child }
func (w *TnWebviewWindow) Get_title() string    { return w.title }
func (w *TnWebviewWindow) Get_width() float64   { return float64(w.width) }
func (w *TnWebviewWindow) Get_height() float64  { return float64(w.height) }
func (w *TnWebviewWindow) Get_x() float64       { return float64(w.x) }
func (w *TnWebviewWindow) Get_y() float64       { return float64(w.y) }
func (w *TnWebviewWindow) hasMenu() bool        { return len(w.menu) > 0 }
func (w *TnWebviewWindow) isVisible() bool      { return w.visible }
func (w *TnWebviewWindow) isFocused() bool      { return w.focused }
func (w *TnWebviewWindow) isDecorated() bool    { return w.decorated }
func (w *TnWebviewWindow) isClosable() bool     { return w.closable }
func (w *TnWebviewWindow) isMaximizable() bool  { return w.maximizable }
func (w *TnWebviewWindow) isMinimizable() bool  { return w.minimizable }
func (w *TnWebviewWindow) isMaximized() bool    { return w.maximized }
func (w *TnWebviewWindow) isMinimized() bool    { return w.minimized }
func (w *TnWebviewWindow) isResizable() bool    { return w.resizable }
func (w *TnWebviewWindow) isDisposed() bool     { return w.disposed || w.closed }

func (w *TnWebviewWindow) Get_fullscreen() interface{} {
	if w.fullscreen < 0 {
		return nil
	}
	return float64(w.fullscreen)
}

func (w *TnWebviewWindow) setTitle(title string) {
	w.title = title
	if w.backend != nil && !w.closed {
		w.backend.setTitle(title)
	}
}

func (w *TnWebviewWindow) show() { w.setVisible(true) }
func (w *TnWebviewWindow) hide() { w.setVisible(false) }

func (w *TnWebviewWindow) setVisible(visible bool) {
	w.visible = visible
	if w.backend != nil && !w.closed {
		w.backend.setVisible(visible)
	}
}

func (w *TnWebviewWindow) focus() {
	w.focused = true
	if w.backend != nil && !w.closed {
		w.backend.focus()
	}
}

func (w *TnWebviewWindow) setMaximized(value bool) {
	w.maximized = value
	if value {
		w.minimized = false
	}
	if w.backend != nil && !w.closed {
		w.backend.setMaximized(value)
	}
}

func (w *TnWebviewWindow) setMinimized(value bool) {
	w.minimized = value
	if value {
		w.maximized = false
	}
	if w.backend != nil && !w.closed {
		w.backend.setMinimized(value)
	}
}

func (w *TnWebviewWindow) setResizable(resizable bool) {
	w.resizable = resizable
	if w.backend != nil && !w.closed {
		w.backend.setResizable(resizable)
	}
}

func (w *TnWebviewWindow) setDecorations(enabled bool) {
	w.decorated = enabled
	if w.backend != nil && !w.closed {
		w.backend.setDecorations(enabled)
	}
}

func (w *TnWebviewWindow) setClosable(closable bool) {
	w.closable = closable
	if w.backend != nil && !w.closed {
		w.backend.setClosable(closable)
	}
}

func (w *TnWebviewWindow) setMaximizable(maximizable bool) {
	w.maximizable = maximizable
	if w.backend != nil && !w.closed {
		w.backend.setMaximizable(maximizable)
	}
}

func (w *TnWebviewWindow) setMinimizable(minimizable bool) {
	w.minimizable = minimizable
	if w.backend != nil && !w.closed {
		w.backend.setMinimizable(minimizable)
	}
}

func (w *TnWebviewWindow) setAlwaysOnTop(enabled bool) {
	w.alwaysOnTop = enabled
	if w.backend != nil && !w.closed {
		w.backend.setAlwaysOnTop(enabled)
	}
}

func (w *TnWebviewWindow) setAlwaysOnBottom(enabled bool) {
	w.alwaysOnBottom = enabled
	if w.backend != nil && !w.closed {
		w.backend.setAlwaysOnBottom(enabled)
	}
}

func (w *TnWebviewWindow) setContentProtection(enabled bool) {
	w.contentProtection = enabled
	if w.backend != nil && !w.closed {
		w.backend.setContentProtection(enabled)
	}
}

func (w *TnWebviewWindow) setSkipTaskbar(skip bool) {
	w.skipTaskbar = skip
	if w.backend != nil && !w.closed {
		w.backend.setSkipTaskbar(skip)
	}
}

func (w *TnWebviewWindow) setEnable(enabled bool) {
	w.enabled = enabled
	if w.backend != nil && !w.closed {
		w.backend.setEnable(enabled)
	}
}

func (w *TnWebviewWindow) setFullscreen(fullscreenType ...interface{}) {
	ft := -1
	if len(fullscreenType) > 0 && fullscreenType[0] != nil {
		if n, ok := fullscreenType[0].(float64); ok {
			ft = int(n)
		}
	}
	w.fullscreen = ft
	if w.backend != nil && !w.closed {
		w.backend.setFullscreen(ft)
	}
}

func (w *TnWebviewWindow) setSize(width float64, height float64, logical ...interface{}) *TnWebviewDimensions {
	log := false
	if len(logical) > 0 {
		if b, ok := logical[0].(bool); ok {
			log = b
		}
	}
	w.width = uint(width)
	w.height = uint(height)
	if w.backend != nil && !w.closed {
		w.backend.setSize(w.width, w.height, log)
	}
	return &TnWebviewDimensions{width: float64(w.width), height: float64(w.height)}
}

func (w *TnWebviewWindow) setMinSize(width float64, height float64, logical ...interface{}) {
	log := false
	if len(logical) > 0 {
		if b, ok := logical[0].(bool); ok {
			log = b
		}
	}
	w.minWidth = uint(width)
	w.minHeight = uint(height)
	if w.backend != nil && !w.closed {
		w.backend.setMinSize(w.minWidth, w.minHeight, log)
	}
}

func (w *TnWebviewWindow) setMaxSize(width float64, height float64, logical ...interface{}) {
	log := false
	if len(logical) > 0 {
		if b, ok := logical[0].(bool); ok {
			log = b
		}
	}
	w.maxWidth = uint(width)
	w.maxHeight = uint(height)
	if w.backend != nil && !w.closed {
		w.backend.setMaxSize(w.maxWidth, w.maxHeight, log)
	}
}

func (w *TnWebviewWindow) getInnerSize(logical ...interface{}) *TnWebviewDimensions {
	log := false
	if len(logical) > 0 {
		if b, ok := logical[0].(bool); ok {
			log = b
		}
	}
	if w.backend != nil && !w.closed {
		bw, bh := w.backend.getInnerSize(log)
		return &TnWebviewDimensions{width: bw, height: bh}
	}
	return &TnWebviewDimensions{width: float64(w.width), height: float64(w.height)}
}

func (w *TnWebviewWindow) getOuterSize(logical ...interface{}) *TnWebviewDimensions {
	log := false
	if len(logical) > 0 {
		if b, ok := logical[0].(bool); ok {
			log = b
		}
	}
	if w.backend != nil && !w.closed {
		bw, bh := w.backend.getOuterSize(log)
		return &TnWebviewDimensions{width: bw, height: bh}
	}
	return &TnWebviewDimensions{width: float64(w.width), height: float64(w.height)}
}

func (w *TnWebviewWindow) setPosition(x float64, y float64, logical ...interface{}) {
	log := false
	if len(logical) > 0 {
		if b, ok := logical[0].(bool); ok {
			log = b
		}
	}
	w.x = int(x)
	w.y = int(y)
	w.hasPos = true
	if w.backend != nil && !w.closed {
		w.backend.setPosition(w.x, w.y, log)
	}
}

func (w *TnWebviewWindow) getPosition(logical ...interface{}) *TnWebviewPosition {
	log := false
	if len(logical) > 0 {
		if b, ok := logical[0].(bool); ok {
			log = b
		}
	}
	if w.backend != nil && !w.closed {
		bx, by := w.backend.getPosition(log)
		return &TnWebviewPosition{x: bx, y: by}
	}
	return &TnWebviewPosition{x: float64(w.x), y: float64(w.y)}
}

func (w *TnWebviewWindow) center() {
	if w.backend != nil && !w.closed {
		w.backend.center()
	}
}

func (w *TnWebviewWindow) scaleFactor() float64 {
	if w.backend != nil && !w.closed {
		return w.backend.scaleFactor()
	}
	return 1
}

func (w *TnWebviewWindow) startDragging() {
	if w.backend != nil && !w.closed {
		w.backend.startDragging()
	}
}

func (w *TnWebviewWindow) requestRedraw() {
	if w.backend != nil && !w.closed {
		w.backend.requestRedraw()
	}
}

func (w *TnWebviewWindow) openFileDialog(options ...interface{}) []string {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	if w.backend != nil && !w.closed {
		return w.backend.openFileDialog(opts)
	}
	return tnWebviewOpenFileDialog(0, opts)
}

func (w *TnWebviewWindow) dispose() {
	w.disposed = true
	w.close()
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

// --- Webview & IPC ---

func (v *TnWebview) live() bool {
	return v.window.backend != nil && !v.window.closed && !v.disposed
}

func (v *TnWebview) loadUrl(url string) {
	v.url, v.html = url, ""
	if v.live() {
		v.window.backend.navigate(v.window.normalizeUrl(url))
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

func (v *TnWebview) getUrl() string {
	return v.url
}

func (v *TnWebview) zoom(scaleFactor float64) {
	if v.live() {
		v.window.backend.setZoom(scaleFactor)
	}
}

func (v *TnWebview) setWebviewVisibility(visible bool) {
	if v.live() {
		v.window.backend.setWebviewVisibility(visible)
	}
}

func (v *TnWebview) focus() {
	if v.live() {
		v.window.backend.focusWebview()
	}
}

func (v *TnWebview) dispose() {
	v.disposed = true
	v.ipcHandler = nil
	v.exposed = map[string]*tnWebviewExposedNs{}
}

func (v *TnWebview) isDisposed() bool {
	return v.disposed || v.window.closed
}

func (v *TnWebview) onIpcMessage(handler ...interface{}) {
	if v.disposed {
		panic(TnNewError("Webview has been disposed"))
	}
	if len(handler) == 0 || handler[0] == nil {
		v.ipcHandler = nil
		return
	}
	if reflect.ValueOf(handler[0]).Kind() != reflect.Func {
		panic(TnNodeError("TypeError", "", "onIpcMessage handler must be a function or null"))
	}
	v.ipcHandler = handler[0]
}

func tnWebviewIsValidIdent(name string) bool {
	if len(name) == 0 {
		return false
	}
	for i, ch := range name {
		if i == 0 {
			if !((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch == '_' || ch == '$') {
				return false
			}
		} else {
			if !((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '_' || ch == '$') {
				return false
			}
		}
	}
	return true
}

func (v *TnWebview) exposeScript(name string, ns *tnWebviewExposedNs) string {
	funcsJson, _ := json.Marshal(ns.funcNames)
	nameJson, _ := json.Marshal(name)
	ipcJson, _ := json.Marshal(v.ipcName)
	return "(function(){" +
		"if(!window.__webviewjs__){" +
		"var p={},seq=1;" +
		"window.__webviewjs__={" +
		"call:function(ns,method,args){" +
		"var id=seq++;" +
		"return new Promise(function(res,rej){" +
		"p[id]={res:res,rej:rej};" +
		"window[" + string(ipcJson) + "].postMessage(JSON.stringify({__e:true,ns:ns,method:method,id:id,args:args}));" +
		"});}," +
		"resolve:function(id,val){var x=p[id];if(x){delete p[id];x.res(val);}}," +
		"reject:function(id,name,msg){var x=p[id];if(x){delete p[id];var e=new Error(msg);e.name=name||'Error';x.rej(e);}}" +
		"};}" +
		"var obj=" + ns.staticsJson + ";" +
		"var fns=" + string(funcsJson) + ";" +
		"for(var i=0;i<fns.length;i++){(function(fn){obj[fn]=function(){return window.__webviewjs__.call(" + string(nameJson) + ",fn,Array.prototype.slice.call(arguments));};})(fns[i]);}" +
		"window[" + string(nameJson) + "]=obj;" +
		"})();"
}

func (v *TnWebview) expose(name string, target interface{}) {
	if v.disposed {
		panic(TnNewError("Webview has been disposed"))
	}
	if !tnWebviewIsValidIdent(name) {
		panic(TnNodeError("TypeError", "", "expose(): name must be a valid JavaScript identifier"))
	}
	if target == nil {
		panic(TnNodeError("TypeError", "", "expose(): target must be an object"))
	}
	if _, exists := v.exposed[name]; exists {
		panic(TnNewError("expose(): namespace \\"" + name + "\\" is already registered"))
	}
	statics := map[string]interface{}{}
	funcs := map[string]interface{}{}
	var funcNames []string
	for _, key := range TnKeys(target) {
		val := TnGetValue(target, key)
		if val != nil && reflect.ValueOf(val).Kind() == reflect.Func {
			funcs[key] = val
			funcNames = append(funcNames, key)
		} else {
			statics[key] = val
		}
	}
	staticsJson := TnJSONStringify(statics, "")
	if staticsJson == "" {
		staticsJson = "{}"
	}
	ns := &tnWebviewExposedNs{
		target:      target,
		funcs:       funcs,
		staticsJson: staticsJson,
		funcNames:   funcNames,
	}
	v.exposed[name] = ns
	v.exposedOrder = append(v.exposedOrder, name)
	if v.live() {
		script := v.exposeScript(name, ns)
		v.window.backend.initScript(script)
		v.window.backend.eval(script)
	}
}

func (v *TnWebview) sendExposeResult(id float64, val interface{}) {
	if !v.live() {
		return
	}
	resJson := TnJSONStringify(val, "")
	if resJson == "" {
		resJson = "undefined"
	}
	v.window.backend.eval(fmt.Sprintf("window.__webviewjs__&&window.__webviewjs__.resolve(%v,%s)", id, resJson))
}

func (v *TnWebview) sendExposeError(id float64, errName string, errMsg string) {
	if !v.live() {
		return
	}
	nameJson, _ := json.Marshal(errName)
	msgJson, _ := json.Marshal(errMsg)
	v.window.backend.eval(fmt.Sprintf("window.__webviewjs__&&window.__webviewjs__.reject(%v,%s,%s)", id, string(nameJson), string(msgJson)))
}

// (loop task) Routes a raw message from the page to expose() RPC or onIpcMessage()
func (v *TnWebview) handleIpcMessage(raw string) {
	if v.disposed || v.window.closed {
		return
	}
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &parsed); err == nil && parsed != nil {
		if flag, ok := parsed["__e"].(bool); ok && flag {
			nsName, _ := parsed["ns"].(string)
			methodName, _ := parsed["method"].(string)
			id, _ := parsed["id"].(float64)
			ns, ok := v.exposed[nsName]
			if !ok {
				v.sendExposeError(id, "Error", "No such method: "+methodName)
				return
			}
			fn, ok := ns.funcs[methodName]
			if !ok {
				v.sendExposeError(id, "Error", "No such method: "+methodName)
				return
			}
			argsSlice, ok := parsed["args"].([]interface{})
			if !ok {
				v.sendExposeError(id, "SerializationError", "Arguments must be an array")
				return
			}
			var callErr interface{}
			var result interface{}
			func() {
				defer func() {
					if r := recover(); r != nil {
						callErr = r
					}
				}()
				result = TnInvoke(fn, argsSlice...)
			}()
			if callErr != nil {
				v.sendExposeError(id, "Error", fmt.Sprint(callErr))
				return
			}
			rv := reflect.ValueOf(result)
			if rv.IsValid() && rv.Kind() == reflect.Chan && !rv.IsNil() {
				go func() {
					val, ok := rv.Recv()
					TnLoopPost(func() {
						if ok {
							var inner interface{}
							if val.IsValid() {
								inner = val.Interface()
							}
							v.sendExposeResult(id, inner)
							return
						}
						if resolved, found := tnResolved.Load(result); found {
							v.sendExposeResult(id, resolved)
							return
						}
						if reason, found := tnRejections.Load(result); found && reason != nil {
							v.sendExposeError(id, "Error", fmt.Sprint(reason))
							return
						}
						v.sendExposeResult(id, nil)
					})
				}()
				return
			}
			v.sendExposeResult(id, result)
			return
		}
	}
	if v.ipcHandler != nil {
		msg := &TnWebviewIpcMessage{
			body:    []byte(raw),
			method:  "POST",
			headers: []*TnWebviewHeaderData{},
			uri:     v.url,
		}
		TnInvoke(v.ipcHandler, msg)
	}
}

// --- Browser app window fallback ---

// The browser app window: the program can't reach into it, so only its own
// page and its closing are available
type tnWebviewBrowser struct {
	w    *TnWebviewWindow
	kill func()
}

func tnWebviewUnsupported(call string) *TnError {
	return TnNodeError("Error", "ERR_WEBVIEW_UNSUPPORTED", call+" needs an embedded webview, and this window is a browser app window")
}

func (b *tnWebviewBrowser) navigate(url string)                    { panic(tnWebviewUnsupported("loadUrl")) }
func (b *tnWebviewBrowser) setHtml(html string)                    { panic(tnWebviewUnsupported("loadHtml")) }
func (b *tnWebviewBrowser) eval(js string)                         { panic(tnWebviewUnsupported("evaluateScript")) }
func (b *tnWebviewBrowser) initScript(js string)                   {}
func (b *tnWebviewBrowser) reload()                                { panic(tnWebviewUnsupported("reload")) }
func (b *tnWebviewBrowser) setTitle(title string)                  {}
func (b *tnWebviewBrowser) setMenu(items []*TnWebviewMenuItem)     {}
func (b *tnWebviewBrowser) registerProtocol(scheme string)         {}
func (b *tnWebviewBrowser) setVisible(visible bool)                {}
func (b *tnWebviewBrowser) focus()                                 {}
func (b *tnWebviewBrowser) setMaximized(v bool)                    {}
func (b *tnWebviewBrowser) setMinimized(v bool)                    {}
func (b *tnWebviewBrowser) setResizable(v bool)                    {}
func (b *tnWebviewBrowser) setDecorations(v bool)                  {}
func (b *tnWebviewBrowser) setClosable(v bool)                     {}
func (b *tnWebviewBrowser) setMaximizable(v bool)                  {}
func (b *tnWebviewBrowser) setMinimizable(v bool)                  {}
func (b *tnWebviewBrowser) setAlwaysOnTop(v bool)                  {}
func (b *tnWebviewBrowser) setAlwaysOnBottom(v bool)               {}
func (b *tnWebviewBrowser) setContentProtection(v bool)            {}
func (b *tnWebviewBrowser) setSkipTaskbar(v bool)                  {}
func (b *tnWebviewBrowser) setEnable(v bool)                       {}
func (b *tnWebviewBrowser) setFullscreen(ft int)                   {}
func (b *tnWebviewBrowser) setSize(width, height uint, _ bool)     {}
func (b *tnWebviewBrowser) setMinSize(width, height uint, _ bool)  {}
func (b *tnWebviewBrowser) setMaxSize(width, height uint, _ bool)  {}
func (b *tnWebviewBrowser) getInnerSize(_ bool) (float64, float64) { return float64(b.w.width), float64(b.w.height) }
func (b *tnWebviewBrowser) getOuterSize(_ bool) (float64, float64) { return float64(b.w.width), float64(b.w.height) }
func (b *tnWebviewBrowser) setPosition(x, y int, _ bool)           {}
func (b *tnWebviewBrowser) getPosition(_ bool) (float64, float64)  { return float64(b.w.x), float64(b.w.y) }
func (b *tnWebviewBrowser) center()                                {}
func (b *tnWebviewBrowser) scaleFactor() float64                   { return 1 }
func (b *tnWebviewBrowser) startDragging()                         {}
func (b *tnWebviewBrowser) requestRedraw()                         {}
func (b *tnWebviewBrowser) setZoom(scale float64)                  {}
func (b *tnWebviewBrowser) setWebviewVisibility(visible bool)      {}
func (b *tnWebviewBrowser) focusWebview()                          {}
func (b *tnWebviewBrowser) openFileDialog(opts interface{}) []string { return tnWebviewOpenFileDialog(0, opts) }
func (b *tnWebviewBrowser) close()                                 { b.kill() }

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
	return &tnWebviewBrowser{w: w, kill: kill}
}`;

// Windows native implementation: Win32 window + edge.Chromium WebView2 +
// Win32 menus + Shell_NotifyIconW tray icons & notifications + file dialogs.
const webviewWindowsHelper = `var (
	tnWvUser32   = syscall.NewLazyDLL("user32.dll")
	tnWvShell32  = syscall.NewLazyDLL("shell32.dll")
	tnWvGdi32    = syscall.NewLazyDLL("gdi32.dll")
	tnWvKernel32 = syscall.NewLazyDLL("kernel32.dll")
	tnWvComdlg32 = syscall.NewLazyDLL("comdlg32.dll")

	tnW32RegisterClassExW        = tnWvUser32.NewProc("RegisterClassExW")
	tnW32CreateWindowExW         = tnWvUser32.NewProc("CreateWindowExW")
	tnW32DestroyWindow           = tnWvUser32.NewProc("DestroyWindow")
	tnW32DefWindowProcW          = tnWvUser32.NewProc("DefWindowProcW")
	tnW32ShowWindow              = tnWvUser32.NewProc("ShowWindow")
	tnW32UpdateWindow            = tnWvUser32.NewProc("UpdateWindow")
	tnW32SetFocus                = tnWvUser32.NewProc("SetFocus")
	tnW32SetForegroundWindow     = tnWvUser32.NewProc("SetForegroundWindow")
	tnW32GetForegroundWindow     = tnWvUser32.NewProc("GetForegroundWindow")
	tnW32GetMessageW             = tnWvUser32.NewProc("GetMessageW")
	tnW32TranslateMessage        = tnWvUser32.NewProc("TranslateMessage")
	tnW32DispatchMessageW        = tnWvUser32.NewProc("DispatchMessageW")
	tnW32PostMessageW            = tnWvUser32.NewProc("PostMessageW")
	tnW32SendMessageW            = tnWvUser32.NewProc("SendMessageW")
	tnW32PostThreadMessageW      = tnWvUser32.NewProc("PostThreadMessageW")
	tnW32PostQuitMessage         = tnWvUser32.NewProc("PostQuitMessage")
	tnW32SetWindowTextW          = tnWvUser32.NewProc("SetWindowTextW")
	tnW32GetWindowLongW          = tnWvUser32.NewProc("GetWindowLongW")
	tnW32SetWindowLongW          = tnWvUser32.NewProc("SetWindowLongW")
	tnW32SetWindowPos            = tnWvUser32.NewProc("SetWindowPos")
	tnW32AdjustWindowRectEx      = tnWvUser32.NewProc("AdjustWindowRectEx")
	tnW32GetClientRect           = tnWvUser32.NewProc("GetClientRect")
	tnW32GetWindowRect           = tnWvUser32.NewProc("GetWindowRect")
	tnW32GetSystemMetrics        = tnWvUser32.NewProc("GetSystemMetrics")
	tnW32IsZoomed                = tnWvUser32.NewProc("IsZoomed")
	tnW32IsIconic                = tnWvUser32.NewProc("IsIconic")
	tnW32IsWindowVisible         = tnWvUser32.NewProc("IsWindowVisible")
	tnW32EnableWindow            = tnWvUser32.NewProc("EnableWindow")
	tnW32GetSystemMenu           = tnWvUser32.NewProc("GetSystemMenu")
	tnW32EnableMenuItem          = tnWvUser32.NewProc("EnableMenuItem")
	tnW32CreateMenu              = tnWvUser32.NewProc("CreateMenu")
	tnW32CreatePopupMenu         = tnWvUser32.NewProc("CreatePopupMenu")
	tnW32AppendMenuW             = tnWvUser32.NewProc("AppendMenuW")
	tnW32SetMenu                 = tnWvUser32.NewProc("SetMenu")
	tnW32DrawMenuBar             = tnWvUser32.NewProc("DrawMenuBar")
	tnW32DestroyMenu             = tnWvUser32.NewProc("DestroyMenu")
	tnW32TrackPopupMenuEx        = tnWvUser32.NewProc("TrackPopupMenuEx")
	tnW32GetCursorPos            = tnWvUser32.NewProc("GetCursorPos")
	tnW32LoadIconW               = tnWvUser32.NewProc("LoadIconW")
	tnW32DestroyIcon             = tnWvUser32.NewProc("DestroyIcon")
	tnW32CreateIconIndirect      = tnWvUser32.NewProc("CreateIconIndirect")
	tnW32MonitorFromWindow       = tnWvUser32.NewProc("MonitorFromWindow")
	tnW32GetMonitorInfoW         = tnWvUser32.NewProc("GetMonitorInfoW")
	tnW32SetWindowDisplayAff     = tnWvUser32.NewProc("SetWindowDisplayAffinity")
	tnW32ReleaseCapture          = tnWvUser32.NewProc("ReleaseCapture")
	tnW32InvalidateRect          = tnWvUser32.NewProc("InvalidateRect")
	tnW32GetCurrentThreadID      = tnWvKernel32.NewProc("GetCurrentThreadId")
	tnW32ShellNotifyIconW        = tnWvShell32.NewProc("Shell_NotifyIconW")
	tnW32ShellNotifyIconGetRect  = tnWvShell32.NewProc("Shell_NotifyIconGetRect")
	tnW32CreateDIBSection        = tnWvGdi32.NewProc("CreateDIBSection")
	tnW32CreateBitmap            = tnWvGdi32.NewProc("CreateBitmap")
	tnW32DeleteObject            = tnWvGdi32.NewProc("DeleteObject")
	tnW32GetOpenFileNameW        = tnWvComdlg32.NewProc("GetOpenFileNameW")
)

const (
	tnWMApp            = 0x8000
	tnWMTray           = 0x8001
	tnWMNotify         = 0x8002
	tnWMSize           = 0x0005
	tnWMMove           = 0x0003
	tnWMMoving         = 0x0216
	tnWMActivate       = 0x0006
	tnWMSetFocus       = 0x0007
	tnWMKillFocus      = 0x0008
	tnWMClose          = 0x0010
	tnWMDestroy        = 0x0002
	tnWMQuit           = 0x0012
	tnWMGetMinMaxInfo  = 0x0024
	tnWMCommand        = 0x0111
	tnWMNCLButtonDown  = 0x00A1
	tnWMLButtonUp      = 0x0202
	tnWMLButtonDblClk  = 0x0203
	tnWMRButtonUp      = 0x0205
	tnWMRButtonDblClk  = 0x0206
	tnWMMButtonUp      = 0x0208
	tnWMMouseMove      = 0x0200
	tnNINBalloonShow   = 0x0402
	tnNINBalloonHide   = 0x0403
	tnNINBalloonTimeout = 0x0404
	tnNINBalloonClick  = 0x0405

	tnWSOverlappedWindow = 0x00CF0000
	tnWSPopup            = 0x80000000
	tnWSCaption          = 0x00C00000
	tnWSThickFrame       = 0x00040000
	tnWSMaximizeBox      = 0x00010000
	tnWSMinimizeBox      = 0x00020000
	tnWSSysMenu          = 0x00080000
	tnWSExTopmost        = 0x00000008
	tnWSExToolWindow     = 0x00000080
	tnWSExAppWindow      = 0x00040000

	tnSWHide     = 0
	tnSWShow     = 5
	tnSWMaximize = 3
	tnSWMinimize = 6
	tnSWRestore  = 9
	tnSWShowNA   = 8

	tnSWPNoSize       = 0x0001
	tnSWPNoMove       = 0x0002
	tnSWPNoZOrder     = 0x0004
	tnSWPNoActivate   = 0x0010
	tnSWPFrameChanged = 0x0020
	tnSWPShowWindow   = 0x0040

	tnMFString    = 0x0000
	tnMFPopup     = 0x0010
	tnMFSeparator = 0x0800
	tnMFGrayed    = 0x0001
	tnMFByCommand = 0x0000
	tnMFEnabled   = 0x0000

	tnNIMAdd    = 0x00000000
	tnNIMModify = 0x00000001
	tnNIMDelete = 0x00000002
	tnNIFMsg    = 0x00000001
	tnNIFIcon   = 0x00000002
	tnNIFTip    = 0x00000004
	tnNIFState  = 0x00000008
	tnNIFInfo   = 0x00000010
	tnNISHidden = 0x00000001
	tnNIIFInfo  = 0x00000001
	tnNIIFNoSnd = 0x00000010
)

type tnW32Point struct{ X, Y int32 }
type tnW32Rect struct{ Left, Top, Right, Bottom int32 }
type tnW32Msg struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      tnW32Point
}
type tnW32WndClassExW struct {
	CbSize        uint32
	Style         uint32
	LpfnWndProc   uintptr
	CbClsExtra    int32
	CbWndExtra    int32
	HInstance     windows.Handle
	HIcon         uintptr
	HCursor       uintptr
	HbrBackground uintptr
	LpszMenuName  *uint16
	LpszClassName *uint16
	HIconSm       uintptr
}
type tnW32MinMaxInfo struct {
	PtReserved     tnW32Point
	PtMaxSize      tnW32Point
	PtMaxPosition  tnW32Point
	PtMinTrackSize tnW32Point
	PtMaxTrackSize tnW32Point
}
type tnW32MonitorInfo struct {
	CbSize    uint32
	RcMonitor tnW32Rect
	RcWork    tnW32Rect
	DwFlags   uint32
}
type tnW32BitmapInfoHeader struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}
type tnW32IconInfo struct {
	FIcon    int32
	XHotspot uint32
	YHotspot uint32
	HbmMask  uintptr
	HbmColor uintptr
}
type tnW32NotifyIconDataW struct {
	CbSize           uint32
	Hwnd             uintptr
	UID              uint32
	UFlags           uint32
	UCallbackMessage uint32
	HIcon            uintptr
	SzTip            [128]uint16
	DwState          uint32
	DwStateMask      uint32
	SzInfo           [256]uint16
	UVersion         uint32
	SzInfoTitle      [64]uint16
	DwInfoFlags      uint32
	GuidItem         [16]byte
	HBalloonIcon     uintptr
}
type tnW32NotifyIconIdentifier struct {
	CbSize   uint32
	Hwnd     uintptr
	UID      uint32
	GuidItem [16]byte
}
type tnW32OpenFileNameW struct {
	LStructSize       uint32
	HwndOwner         uintptr
	HInstance         uintptr
	LpstrFilter       *uint16
	LpstrCustomFilter *uint16
	NMaxCustFilter    uint32
	NFilterIndex      uint32
	LpstrFile         *uint16
	NMaxFile          uint32
	LpstrFileTitle    *uint16
	NMaxFileTitle     uint32
	LpstrInitialDir   *uint16
	LpstrTitle        *uint16
	Flags             uint32
	NFileOffset       uint16
	NFileExtension    uint16
	LpstrDefExt       *uint16
	LCustData         uintptr
	LpfnHook          uintptr
	LpTemplateName    *uint16
	PvReserved        uintptr
	DwReserved        uint32
	FlagsEx           uint32
}

type tnMenuCmd struct {
	id   string
	role string
}

var (
	tnWinMapMu  sync.RWMutex
	tnWinMap    = map[uintptr]*tnWebview2{}
	tnTrayMapMu sync.RWMutex
	tnTrayMap   = map[uintptr]*tnWebviewWinTray{}
	tnNotifMu   sync.RWMutex
	tnNotifMap  = map[uintptr]*tnWebviewWinNotif{}
	tnWinClassOnce   sync.Once
	tnTrayClassOnce  sync.Once
	tnNotifClassOnce sync.Once
)

func tnW32CopyUTF16(dst []uint16, s string) {
	u, err := windows.UTF16FromString(s)
	if err != nil {
		return
	}
	n := len(u)
	if n > len(dst) {
		n = len(dst) - 1
	}
	copy(dst, u[:n])
	if len(dst) > 0 {
		dst[len(dst)-1] = 0
	}
}

func tnW32BuildMenu(items []*TnWebviewMenuItem, popup bool, nextId *uint32, cmds map[uint32]tnMenuCmd) uintptr {
	if len(items) == 0 {
		return 0
	}
	var hMenu uintptr
	if popup {
		hMenu, _, _ = tnW32CreatePopupMenu.Call()
	} else {
		hMenu, _, _ = tnW32CreateMenu.Call()
	}
	for _, it := range items {
		if it == nil {
			continue
		}
		if strings.EqualFold(it.role, "separator") || (it.label == "" && len(it.submenu) == 0 && it.role == "") {
			tnW32AppendMenuW.Call(hMenu, tnMFSeparator, 0, 0)
			continue
		}
		text := it.label
		if text == "" && it.role != "" {
			text = it.role
		}
		if it.accelerator != "" {
			text = text + "\\t" + it.accelerator
		}
		uText, _ := windows.UTF16PtrFromString(text)
		flags := uintptr(tnMFString)
		if !it.enabled {
			flags |= tnMFGrayed
		}
		if len(it.submenu) > 0 {
			sub := tnW32BuildMenu(it.submenu, true, nextId, cmds)
			tnW32AppendMenuW.Call(hMenu, flags|tnMFPopup, sub, uintptr(unsafe.Pointer(uText)))
		} else {
			cmdId := *nextId
			*nextId++
			cmds[cmdId] = tnMenuCmd{id: it.id, role: strings.ToLower(it.role)}
			tnW32AppendMenuW.Call(hMenu, flags, uintptr(cmdId), uintptr(unsafe.Pointer(uText)))
		}
	}
	return hMenu
}

func tnW32CreateHIconFromBytes(data []byte, width int, height int) uintptr {
	if len(data) == 0 {
		h, _, _ := tnW32LoadIconW.Call(0, 32512) // IDI_APPLICATION
		return h
	}
	rgba := data
	w, h := width, height
	// Decode PNG if header matches
	if len(data) >= 8 && data[0] == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G' {
		if img, err := png.Decode(bytes.NewReader(data)); err == nil {
			bounds := img.Bounds()
			w, h = bounds.Dx(), bounds.Dy()
			buf := make([]byte, w*h*4)
			for y := 0; y < h; y++ {
				for x := 0; x < w; x++ {
					r, g, b, a := img.At(bounds.Min.X+x, bounds.Min.Y+y).RGBA()
					off := (y*w + x) * 4
					buf[off] = byte(r >> 8)
					buf[off+1] = byte(g >> 8)
					buf[off+2] = byte(b >> 8)
					buf[off+3] = byte(a >> 8)
				}
			}
			rgba = buf
		}
	}
	if w <= 0 || h <= 0 || len(rgba) < w*h*4 {
		icon, _, _ := tnW32LoadIconW.Call(0, 32512)
		return icon
	}
	bi := tnW32BitmapInfoHeader{
		BiSize:        uint32(unsafe.Sizeof(tnW32BitmapInfoHeader{})),
		BiWidth:       int32(w),
		BiHeight:      -int32(h), // top-down
		BiPlanes:      1,
		BiBitCount:    32,
		BiCompression: 0, // BI_RGB
	}
	var bits unsafe.Pointer
	hColor, _, _ := tnW32CreateDIBSection.Call(0, uintptr(unsafe.Pointer(&bi)), 0, uintptr(unsafe.Pointer(&bits)), 0, 0)
	if hColor == 0 || bits == nil {
		icon, _, _ := tnW32LoadIconW.Call(0, 32512)
		return icon
	}
	dst := unsafe.Slice((*byte)(bits), w*h*4)
	for i := 0; i < w*h*4; i += 4 {
		dst[i] = rgba[i+2]   // B
		dst[i+1] = rgba[i+1] // G
		dst[i+2] = rgba[i]   // R
		dst[i+3] = rgba[i+3] // A
	}
	hMask, _, _ := tnW32CreateBitmap.Call(uintptr(w), uintptr(h), 1, 1, 0)
	ii := tnW32IconInfo{FIcon: 1, HbmMask: hMask, HbmColor: hColor}
	hIcon, _, _ := tnW32CreateIconIndirect.Call(uintptr(unsafe.Pointer(&ii)))
	tnW32DeleteObject.Call(hColor)
	if hMask != 0 {
		tnW32DeleteObject.Call(hMask)
	}
	if hIcon == 0 {
		hIcon, _, _ = tnW32LoadIconW.Call(0, 32512)
	}
	return hIcon
}

// --- Windows Embedded WebView2 ---

type tnWebview2 struct {
	mu          sync.Mutex
	w           *TnWebviewWindow
	hwnd        uintptr
	mainthread  uintptr
	chromium    *edge.Chromium
	scale       uint
	minsz       tnW32Point
	maxsz       tnW32Point
	hMenu       uintptr
	menuCmds    map[uint32]tnMenuCmd
	savedStyle  uintptr
	savedRect   tnW32Rect
	inFull      bool
	ready       bool
	pending     []func()
	dispatchq   []func()
}

func (b *tnWebview2) do(fn func()) {
	b.mu.Lock()
	if !b.ready {
		b.pending = append(b.pending, fn)
		b.mu.Unlock()
		return
	}
	b.dispatchq = append(b.dispatchq, fn)
	tid := b.mainthread
	b.mu.Unlock()
	tnW32PostThreadMessageW.Call(tid, tnWMApp, 0, 0)
}

func (b *tnWebview2) doSync(fn func()) {
	ch := make(chan struct{})
	b.do(func() {
		fn()
		close(ch)
	})
	<-ch
}

func (b *tnWebview2) applyMenu(items []*TnWebviewMenuItem) {
	if b.hMenu != 0 {
		tnW32SetMenu.Call(b.hwnd, 0)
		tnW32DestroyMenu.Call(b.hMenu)
		b.hMenu = 0
	}
	b.menuCmds = map[uint32]tnMenuCmd{}
	if len(items) > 0 {
		nextId := uint32(10000)
		b.hMenu = tnW32BuildMenu(items, false, &nextId, b.menuCmds)
		tnW32SetMenu.Call(b.hwnd, b.hMenu)
	}
	tnW32DrawMenuBar.Call(b.hwnd)
}

func (b *tnWebview2) addProtocolFilter(scheme string) {
	b.chromium.AddWebResourceRequestedFilter("http://"+scheme+".*", edge.COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL)
	b.chromium.AddWebResourceRequestedFilter("https://"+scheme+".*", edge.COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL)
	b.chromium.AddWebResourceRequestedFilter(scheme+"://*", edge.COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL)
}

func (b *tnWebview2) handleMenuCommand(cmdId uint32) {
	cmd, ok := b.menuCmds[cmdId]
	if !ok {
		return
	}
	if cmd.id != "" {
		w := b.w
		id := cmd.id
		TnLoopPost(func() {
			w.app.emit("custom-menu-click", &TnWebviewEvent{
				event:           "custom-menu-click",
				customMenuEvent: &TnWebviewCustomMenuEvent{id: id, windowId: w.windowId},
			})
		})
	}
	switch cmd.role {
	case "quit":
		TnLoopPost(func() { b.w.app.exit() })
	case "close":
		tnW32PostMessageW.Call(b.hwnd, tnWMClose, 0, 0)
	case "minimize":
		tnW32ShowWindow.Call(b.hwnd, tnSWMinimize)
	case "maximize":
		tnW32ShowWindow.Call(b.hwnd, tnSWMaximize)
	case "togglefullscreen", "fullscreen":
		if b.inFull {
			b.applyFullscreen(-1)
		} else {
			b.applyFullscreen(1)
		}
	}
}

func (b *tnWebview2) applyFullscreen(ft int) {
	if ft >= 0 && !b.inFull {
		b.savedStyle, _, _ = tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(15)) // GWL_STYLE = -16
		tnW32GetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&b.savedRect)))
		mon, _, _ := tnW32MonitorFromWindow.Call(b.hwnd, 2) // MONITOR_DEFAULTTONEAREST
		mi := tnW32MonitorInfo{CbSize: uint32(unsafe.Sizeof(tnW32MonitorInfo{}))}
		tnW32GetMonitorInfoW.Call(mon, uintptr(unsafe.Pointer(&mi)))
		newStyle := b.savedStyle &^ uintptr(tnWSCaption|tnWSThickFrame|tnWSSysMenu|tnWSMinimizeBox|tnWSMaximizeBox)
		tnW32SetWindowLongW.Call(b.hwnd, ^uintptr(15), newStyle)
		r := mi.RcMonitor
		tnW32SetWindowPos.Call(b.hwnd, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top), tnSWPFrameChanged|tnSWPNoZOrder)
		b.inFull = true
	} else if ft < 0 && b.inFull {
		tnW32SetWindowLongW.Call(b.hwnd, ^uintptr(15), b.savedStyle)
		r := b.savedRect
		tnW32SetWindowPos.Call(b.hwnd, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top), tnSWPFrameChanged|tnSWPNoZOrder)
		b.inFull = false
	}
}

func tnWebviewWndProc(hwnd, msg, wp, lp uintptr) uintptr {
	tnWinMapMu.RLock()
	b := tnWinMap[hwnd]
	tnWinMapMu.RUnlock()
	if b == nil {
		r, _, _ := tnW32DefWindowProcW.Call(hwnd, msg, wp, lp)
		return r
	}
	switch msg {
	case tnWMMove, tnWMMoving:
		if b.chromium != nil {
			_ = b.chromium.NotifyParentWindowPositionChanged()
		}
		var rc tnW32Rect
		tnW32GetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&rc)))
		b.w.x, b.w.y = int(rc.Left), int(rc.Top)
		x, y := float64(rc.Left), float64(rc.Top)
		TnLoopPost(func() { b.w.emit("move", &TnWebviewEvent{event: "move", x: x, y: y}) })
	case tnWMNCLButtonDown:
		tnW32SetFocus.Call(hwnd)
		r, _, _ := tnW32DefWindowProcW.Call(hwnd, msg, wp, lp)
		return r
	case tnWMSize:
		if b.chromium != nil {
			b.chromium.Resize()
		}
		var rc tnW32Rect
		tnW32GetClientRect.Call(hwnd, uintptr(unsafe.Pointer(&rc)))
		bw, bh := uint(rc.Right-rc.Left), uint(rc.Bottom-rc.Top)
		b.w.width, b.w.height = bw, bh
		z, _, _ := tnW32IsZoomed.Call(hwnd)
		ic, _, _ := tnW32IsIconic.Call(hwnd)
		b.w.maximized = z != 0
		b.w.minimized = ic != 0
		fw, fh := float64(bw), float64(bh)
		TnLoopPost(func() { b.w.emit("resize", &TnWebviewEvent{event: "resize", width: fw, height: fh}) })
	case tnWMActivate:
		if wp == 0 {
			b.w.focused = false
			TnLoopPost(func() { b.w.emit("blur", &TnWebviewEvent{event: "blur"}) })
		} else {
			b.w.focused = true
			if b.chromium != nil {
				b.chromium.Focus()
			}
			TnLoopPost(func() { b.w.emit("focus", &TnWebviewEvent{event: "focus"}) })
		}
	case tnWMCommand:
		b.handleMenuCommand(uint32(wp & 0xFFFF))
	case tnWMClose:
		if !b.w.closable && !b.w.scripted {
			return 0
		}
		tnW32DestroyWindow.Call(hwnd)
	case tnWMDestroy:
		if b.hMenu != 0 {
			tnW32DestroyMenu.Call(b.hMenu)
			b.hMenu = 0
		}
		tnWinMapMu.Lock()
		delete(tnWinMap, hwnd)
		tnWinMapMu.Unlock()
		tnW32PostQuitMessage.Call(0)
	case tnWMGetMinMaxInfo:
		lpmmi := (*tnW32MinMaxInfo)(unsafe.Pointer(lp))
		if b.maxsz.X > 0 && b.maxsz.Y > 0 {
			lpmmi.PtMaxSize = b.maxsz
			lpmmi.PtMaxTrackSize = b.maxsz
		}
		if b.minsz.X > 0 && b.minsz.Y > 0 {
			lpmmi.PtMinTrackSize = b.minsz
		}
	default:
		r, _, _ := tnW32DefWindowProcW.Call(hwnd, msg, wp, lp)
		return r
	}
	return 0
}

func (b *tnWebview2) navigate(url string)   { b.do(func() { b.chromium.Navigate(url) }) }
func (b *tnWebview2) setHtml(html string)   { b.do(func() { b.chromium.NavigateToString(html) }) }
func (b *tnWebview2) eval(js string)        { b.do(func() { b.chromium.Eval(js) }) }
func (b *tnWebview2) initScript(js string)  { b.do(func() { b.chromium.Init(js) }) }
func (b *tnWebview2) reload()               { b.do(func() { b.chromium.Eval("location.reload()") }) }
func (b *tnWebview2) setTitle(title string) {
	b.do(func() {
		u, _ := windows.UTF16PtrFromString(title)
		tnW32SetWindowTextW.Call(b.hwnd, uintptr(unsafe.Pointer(u)))
	})
}
func (b *tnWebview2) setMenu(items []*TnWebviewMenuItem) { b.do(func() { b.applyMenu(items) }) }
func (b *tnWebview2) registerProtocol(scheme string)     { b.do(func() { b.addProtocolFilter(scheme) }) }
func (b *tnWebview2) setVisible(visible bool) {
	b.do(func() {
		if visible {
			tnW32ShowWindow.Call(b.hwnd, tnSWShow)
		} else {
			tnW32ShowWindow.Call(b.hwnd, tnSWHide)
		}
	})
}
func (b *tnWebview2) focus() {
	b.do(func() {
		tnW32SetForegroundWindow.Call(b.hwnd)
		tnW32SetFocus.Call(b.hwnd)
		b.chromium.Focus()
	})
}
func (b *tnWebview2) setMaximized(v bool) {
	b.do(func() {
		if v {
			tnW32ShowWindow.Call(b.hwnd, tnSWMaximize)
		} else {
			tnW32ShowWindow.Call(b.hwnd, tnSWRestore)
		}
	})
}
func (b *tnWebview2) setMinimized(v bool) {
	b.do(func() {
		if v {
			tnW32ShowWindow.Call(b.hwnd, tnSWMinimize)
		} else {
			tnW32ShowWindow.Call(b.hwnd, tnSWRestore)
		}
	})
}
func (b *tnWebview2) setResizable(v bool) {
	b.do(func() {
		style, _, _ := tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(15))
		if v {
			style |= tnWSThickFrame | tnWSMaximizeBox
		} else {
			style &^= tnWSThickFrame | tnWSMaximizeBox
		}
		tnW32SetWindowLongW.Call(b.hwnd, ^uintptr(15), style)
		tnW32SetWindowPos.Call(b.hwnd, 0, 0, 0, 0, 0, tnSWPNoMove|tnSWPNoSize|tnSWPNoZOrder|tnSWPFrameChanged)
	})
}
func (b *tnWebview2) setDecorations(v bool) {
	b.do(func() {
		style, _, _ := tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(15))
		if v {
			style = (style &^ tnWSPopup) | tnWSOverlappedWindow
		} else {
			style = (style &^ uintptr(tnWSCaption|tnWSThickFrame|tnWSSysMenu|tnWSMinimizeBox|tnWSMaximizeBox)) | tnWSPopup
		}
		tnW32SetWindowLongW.Call(b.hwnd, ^uintptr(15), style)
		tnW32SetWindowPos.Call(b.hwnd, 0, 0, 0, 0, 0, tnSWPNoMove|tnSWPNoSize|tnSWPNoZOrder|tnSWPFrameChanged)
	})
}
func (b *tnWebview2) setClosable(v bool) {
	b.do(func() {
		hSys, _, _ := tnW32GetSystemMenu.Call(b.hwnd, 0)
		if hSys != 0 {
			flag := uintptr(tnMFByCommand | tnMFEnabled)
			if !v {
				flag = tnMFByCommand | tnMFGrayed
			}
			tnW32EnableMenuItem.Call(hSys, 0xF060, flag) // SC_CLOSE
		}
	})
}
func (b *tnWebview2) setMaximizable(v bool) {
	b.do(func() {
		style, _, _ := tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(15))
		if v {
			style |= tnWSMaximizeBox
		} else {
			style &^= tnWSMaximizeBox
		}
		tnW32SetWindowLongW.Call(b.hwnd, ^uintptr(15), style)
		tnW32SetWindowPos.Call(b.hwnd, 0, 0, 0, 0, 0, tnSWPNoMove|tnSWPNoSize|tnSWPNoZOrder|tnSWPFrameChanged)
	})
}
func (b *tnWebview2) setMinimizable(v bool) {
	b.do(func() {
		style, _, _ := tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(15))
		if v {
			style |= tnWSMinimizeBox
		} else {
			style &^= tnWSMinimizeBox
		}
		tnW32SetWindowLongW.Call(b.hwnd, ^uintptr(15), style)
		tnW32SetWindowPos.Call(b.hwnd, 0, 0, 0, 0, 0, tnSWPNoMove|tnSWPNoSize|tnSWPNoZOrder|tnSWPFrameChanged)
	})
}
func (b *tnWebview2) setAlwaysOnTop(v bool) {
	b.do(func() {
		insertAfter := ^uintptr(1) // HWND_NOTOPMOST (-2)
		if v {
			insertAfter = ^uintptr(0) // HWND_TOPMOST (-1)
		}
		tnW32SetWindowPos.Call(b.hwnd, insertAfter, 0, 0, 0, 0, tnSWPNoMove|tnSWPNoSize|tnSWPNoActivate)
	})
}
func (b *tnWebview2) setAlwaysOnBottom(v bool) {
	b.do(func() {
		if v {
			tnW32SetWindowPos.Call(b.hwnd, 1, 0, 0, 0, 0, tnSWPNoMove|tnSWPNoSize|tnSWPNoActivate) // HWND_BOTTOM
		}
	})
}
func (b *tnWebview2) setContentProtection(v bool) {
	b.do(func() {
		aff := uintptr(0) // WDA_NONE
		if v {
			aff = 0x11 // WDA_EXCLUDEFROMCAPTURE
		}
		tnW32SetWindowDisplayAff.Call(b.hwnd, aff)
	})
}
func (b *tnWebview2) setSkipTaskbar(skip bool) {
	b.do(func() {
		ex, _, _ := tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(19)) // GWL_EXSTYLE = -20
		if skip {
			ex = (ex | tnWSExToolWindow) &^ tnWSExAppWindow
		} else {
			ex = (ex &^ tnWSExToolWindow) | tnWSExAppWindow
		}
		tnW32SetWindowLongW.Call(b.hwnd, ^uintptr(19), ex)
	})
}
func (b *tnWebview2) setEnable(v bool) {
	b.do(func() {
		en := uintptr(0)
		if v {
			en = 1
		}
		tnW32EnableWindow.Call(b.hwnd, en)
	})
}
func (b *tnWebview2) setFullscreen(ft int) { b.do(func() { b.applyFullscreen(ft) }) }
func (b *tnWebview2) setSize(width uint, height uint, logical bool) {
	b.do(func() {
		pw, ph := width, height
		if logical && b.scale > 0 {
			pw, ph = width*b.scale/100, height*b.scale/100
		}
		style, _, _ := tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(15))
		ex, _, _ := tnW32GetWindowLongW.Call(b.hwnd, ^uintptr(19))
		hasMenu := uintptr(0)
		if b.hMenu != 0 {
			hasMenu = 1
		}
		r := tnW32Rect{0, 0, int32(pw), int32(ph)}
		tnW32AdjustWindowRectEx.Call(uintptr(unsafe.Pointer(&r)), style, hasMenu, ex)
		tnW32SetWindowPos.Call(b.hwnd, 0, 0, 0, uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top), tnSWPNoMove|tnSWPNoZOrder|tnSWPNoActivate|tnSWPFrameChanged)
		b.chromium.Resize()
	})
}
func (b *tnWebview2) setMinSize(width uint, height uint, logical bool) {
	b.do(func() {
		pw, ph := width, height
		if logical && b.scale > 0 {
			pw, ph = width*b.scale/100, height*b.scale/100
		}
		b.minsz = tnW32Point{int32(pw), int32(ph)}
	})
}
func (b *tnWebview2) setMaxSize(width uint, height uint, logical bool) {
	b.do(func() {
		pw, ph := width, height
		if logical && b.scale > 0 {
			pw, ph = width*b.scale/100, height*b.scale/100
		}
		b.maxsz = tnW32Point{int32(pw), int32(ph)}
	})
}
func (b *tnWebview2) getInnerSize(logical bool) (float64, float64) {
	var rc tnW32Rect
	b.doSync(func() { tnW32GetClientRect.Call(b.hwnd, uintptr(unsafe.Pointer(&rc))) })
	w, h := float64(rc.Right-rc.Left), float64(rc.Bottom-rc.Top)
	if logical && b.scale > 0 {
		s := float64(b.scale) / 100.0
		w, h = w/s, h/s
	}
	return w, h
}
func (b *tnWebview2) getOuterSize(logical bool) (float64, float64) {
	var rc tnW32Rect
	b.doSync(func() { tnW32GetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&rc))) })
	w, h := float64(rc.Right-rc.Left), float64(rc.Bottom-rc.Top)
	if logical && b.scale > 0 {
		s := float64(b.scale) / 100.0
		w, h = w/s, h/s
	}
	return w, h
}
func (b *tnWebview2) setPosition(x int, y int, logical bool) {
	b.do(func() {
		px, py := x, y
		if logical && b.scale > 0 {
			px, py = x*int(b.scale)/100, y*int(b.scale)/100
		}
		tnW32SetWindowPos.Call(b.hwnd, 0, uintptr(px), uintptr(py), 0, 0, tnSWPNoSize|tnSWPNoZOrder|tnSWPNoActivate)
	})
}
func (b *tnWebview2) getPosition(logical bool) (float64, float64) {
	var rc tnW32Rect
	b.doSync(func() { tnW32GetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&rc))) })
	x, y := float64(rc.Left), float64(rc.Top)
	if logical && b.scale > 0 {
		s := float64(b.scale) / 100.0
		x, y = x/s, y/s
	}
	return x, y
}
func (b *tnWebview2) center() {
	b.do(func() {
		var rc tnW32Rect
		tnW32GetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&rc)))
		ww, wh := int(rc.Right-rc.Left), int(rc.Bottom-rc.Top)
		sw, _, _ := tnW32GetSystemMetrics.Call(0)
		sh, _, _ := tnW32GetSystemMetrics.Call(1)
		px := (int(sw) - ww) / 2
		py := (int(sh) - wh) / 2
		tnW32SetWindowPos.Call(b.hwnd, 0, uintptr(px), uintptr(py), 0, 0, tnSWPNoSize|tnSWPNoZOrder|tnSWPNoActivate)
	})
}
func (b *tnWebview2) scaleFactor() float64 {
	if b.scale == 0 {
		return 1
	}
	return float64(b.scale) / 100.0
}
func (b *tnWebview2) startDragging() {
	b.do(func() {
		tnW32ReleaseCapture.Call()
		tnW32SendMessageW.Call(b.hwnd, tnWMNCLButtonDown, 2, 0) // HTCAPTION = 2
	})
}
func (b *tnWebview2) requestRedraw() {
	b.do(func() {
		tnW32InvalidateRect.Call(b.hwnd, 0, 1)
		tnW32UpdateWindow.Call(b.hwnd)
	})
}
func (b *tnWebview2) setZoom(scale float64) {
	b.do(func() { b.chromium.Eval(fmt.Sprintf("document.documentElement.style.zoom=%g", scale)) })
}
func (b *tnWebview2) setWebviewVisibility(visible bool) {
	b.do(func() {
		if visible {
			_ = b.chromium.Show()
		} else {
			_ = b.chromium.Hide()
		}
	})
}
func (b *tnWebview2) focusWebview() { b.do(func() { b.chromium.Focus() }) }
func (b *tnWebview2) openFileDialog(opts interface{}) []string {
	return tnWebviewOpenFileDialog(b.hwnd, opts)
}
func (b *tnWebview2) close() { b.do(func() { tnW32PostMessageW.Call(b.hwnd, tnWMClose, 0, 0) }) }

// Sharp text on scaled displays: pixels per logical pixel, in percent
func tnWebviewDpiScale() uint {
	if aware := tnWvUser32.NewProc("SetProcessDpiAwarenessContext"); aware.Find() == nil {
		aware.Call(^uintptr(3)) // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2
	}
	if system := tnWvUser32.NewProc("GetDpiForSystem"); system.Find() == nil {
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
	b := &tnWebview2{w: w, menuCmds: map[uint32]tnMenuCmd{}}
	title, width, height, logical, resizable := w.title, w.width, w.height, w.logical, w.resizable
	target, html, devtools, ipcName := w.webview.url, w.webview.html, w.webview.devtools, w.webview.ipcName
	dir := w.webview.dir
	if dir == "" {
		dir = tnWebviewDataDir()
	}
	go func() {
		runtime.LockOSThread()
		scale := tnWebviewDpiScale()
		b.scale = scale
		pixelWidth, pixelHeight := width, height
		if logical {
			pixelWidth, pixelHeight = width*scale/100, height*scale/100
		}

		var hinstance windows.Handle
		_ = windows.GetModuleHandleEx(0, nil, &hinstance)
		className, _ := windows.UTF16PtrFromString("TnWebviewWindow")
		tnWinClassOnce.Do(func() {
			icon, _, _ := tnW32LoadIconW.Call(0, 32512)
			wc := tnW32WndClassExW{
				CbSize:        uint32(unsafe.Sizeof(tnW32WndClassExW{})),
				HInstance:     hinstance,
				LpszClassName: className,
				HIcon:         icon,
				HIconSm:       icon,
				LpfnWndProc:   windows.NewCallback(tnWebviewWndProc),
			}
			tnW32RegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))
		})

		style := uintptr(tnWSOverlappedWindow)
		if !w.decorated {
			style = tnWSPopup
		} else {
			if !resizable {
				style &^= tnWSThickFrame | tnWSMaximizeBox
			}
			if !w.maximizable {
				style &^= tnWSMaximizeBox
			}
			if !w.minimizable {
				style &^= tnWSMinimizeBox
			}
		}
		exStyle := uintptr(0)
		if w.alwaysOnTop {
			exStyle |= tnWSExTopmost
		}
		if w.skipTaskbar {
			exStyle |= tnWSExToolWindow
		}
		posX, posY := uintptr(0x80000000), uintptr(0x80000000) // CW_USEDEFAULT
		if w.hasPos {
			px, py := w.x, w.y
			if logical {
				px, py = px*int(scale)/100, py*int(scale)/100
			}
			posX, posY = uintptr(px), uintptr(py)
		}
		winTitle, _ := windows.UTF16PtrFromString(title)
		b.mainthread, _, _ = tnW32GetCurrentThreadID.Call()
		hwnd, _, _ := tnW32CreateWindowExW.Call(
			exStyle,
			uintptr(unsafe.Pointer(className)),
			uintptr(unsafe.Pointer(winTitle)),
			style,
			posX, posY,
			uintptr(pixelWidth), uintptr(pixelHeight),
			0, 0, uintptr(hinstance), 0,
		)
		if hwnd == 0 {
			TnLoopPost(func() {
				panic(TnNodeError("Error", "ERR_WEBVIEW_CREATE", "Could not create the WebView2 window"))
			})
			closed()
			return
		}
		b.hwnd = hwnd
		tnWinMapMu.Lock()
		tnWinMap[hwnd] = b
		tnWinMapMu.Unlock()

		if len(w.menu) > 0 {
			b.applyMenu(w.menu)
		}
		if !w.closable {
			hSys, _, _ := tnW32GetSystemMenu.Call(hwnd, 0)
			if hSys != 0 {
				tnW32EnableMenuItem.Call(hSys, 0xF060, tnMFByCommand|tnMFGrayed)
			}
		}
		if w.contentProtection {
			tnW32SetWindowDisplayAff.Call(hwnd, 0x11)
		}
		if w.fullscreen >= 0 {
			b.applyFullscreen(w.fullscreen)
		}
		if w.visible {
			if w.maximized {
				tnW32ShowWindow.Call(hwnd, tnSWMaximize)
			} else if w.focused {
				tnW32ShowWindow.Call(hwnd, tnSWShow)
			} else {
				tnW32ShowWindow.Call(hwnd, tnSWShowNA)
			}
			tnW32UpdateWindow.Call(hwnd)
			if w.focused {
				tnW32SetFocus.Call(hwnd)
			}
		}

		chromium := edge.NewChromium()
		chromium.DataPath = dir
		chromium.SetPermission(edge.CoreWebView2PermissionKindClipboardRead, edge.CoreWebView2PermissionStateAllow)
		chromium.MessageCallback = func(msg string) {
			TnLoopPost(func() {
				if w.webview != nil {
					w.webview.handleIpcMessage(msg)
				}
			})
		}
		chromium.WebResourceRequestedCallback = func(req *edge.ICoreWebView2WebResourceRequest, args *edge.ICoreWebView2WebResourceRequestedEventArgs) {
			uri, err := req.GetUri()
			if err != nil {
				return
			}
			matchedScheme := ""
			cleanUrl := uri
			for proto := range w.protocols {
				if strings.HasPrefix(uri, proto+"://") {
					matchedScheme = proto
					cleanUrl = uri
					break
				}
				if TnWebviewIsWorkAroundUri(uri, "http", proto) {
					matchedScheme = proto
					cleanUrl = TnWebviewRevertUriWorkAround(uri, "http", proto)
					break
				}
				if TnWebviewIsWorkAroundUri(uri, "https", proto) {
					matchedScheme = proto
					cleanUrl = TnWebviewRevertUriWorkAround(uri, "https", proto)
					break
				}
			}
			if matchedScheme == "" {
				return
			}
			res := w.handleProtocolRequest(matchedScheme, cleanUrl, "GET")
			reason := http.StatusText(res.statusCode)
			if reason == "" {
				reason = "OK"
			}
			if env := chromium.Environment(); env != nil {
				if webResp, err := env.CreateWebResourceResponse(res.body, res.statusCode, reason, res.headers); err == nil && webResp != nil {
					_ = args.PutResponse(webResp)
				}
			}
		}
		if !chromium.Embed(hwnd) {
			tnW32DestroyWindow.Call(hwnd)
			TnLoopPost(func() {
				panic(TnNodeError("Error", "ERR_WEBVIEW_CREATE", "Could not embed WebView2"))
			})
			closed()
			return
		}
		b.chromium = chromium
		if settings, err := chromium.GetSettings(); err == nil && settings != nil {
			_ = settings.PutAreDefaultContextMenusEnabled(devtools)
			_ = settings.PutAreDevToolsEnabled(devtools)
		}
		chromium.Resize()

		// Inject IPC global (window[ipcName].postMessage) and any pre-registered expose() namespaces
		ipcNameJson, _ := json.Marshal(ipcName)
		chromium.Init("window[" + string(ipcNameJson) + "]={postMessage:function(s){window.chrome.webview.postMessage(typeof s==='string'?s:String(s));}};")
		for _, nsName := range w.webview.exposedOrder {
			if ns, ok := w.webview.exposed[nsName]; ok {
				chromium.Init(w.webview.exposeScript(nsName, ns))
			}
		}
		for proto := range w.protocols {
			b.addProtocolFilter(proto)
		}
		if html != "" {
			chromium.NavigateToString(html)
		} else if target != "" {
			chromium.Navigate(w.normalizeUrl(target))
		}

		b.mu.Lock()
		b.ready = true
		pending := b.pending
		b.pending = nil
		b.mu.Unlock()
		for _, fn := range pending {
			fn()
		}

		var msg tnW32Msg
		for {
			r, _, _ := tnW32GetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
			if r == 0 || int32(r) == -1 {
				break
			}
			if msg.Message == tnWMApp {
				b.mu.Lock()
				q := append([]func(){}, b.dispatchq...)
				b.dispatchq = nil
				b.mu.Unlock()
				for _, fn := range q {
					fn()
				}
				continue
			}
			if msg.Message == tnWMQuit {
				break
			}
			tnW32TranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
			tnW32DispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
		}
		closed()
	}()
	return b
}

// --- Windows Tray Icon ---

type tnWebviewWinTray struct {
	mu         sync.Mutex
	t          *TnWebviewTrayIcon
	hwnd       uintptr
	mainthread uintptr
	uid        uint32
	hIcon      uintptr
	ownIcon    bool
	hMenu      uintptr
	menuCmds   map[uint32]tnMenuCmd
	ready      bool
	pending    []func()
	dispatchq  []func()
}

func (tr *tnWebviewWinTray) do(fn func()) {
	tr.mu.Lock()
	if !tr.ready {
		tr.pending = append(tr.pending, fn)
		tr.mu.Unlock()
		return
	}
	tr.dispatchq = append(tr.dispatchq, fn)
	tid := tr.mainthread
	tr.mu.Unlock()
	tnW32PostThreadMessageW.Call(tid, tnWMApp, 0, 0)
}

func (tr *tnWebviewWinTray) popupMenu() {
	if tr.hMenu == 0 {
		return
	}
	var pt tnW32Point
	tnW32GetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
	tnW32SetForegroundWindow.Call(tr.hwnd)
	tnW32TrackPopupMenuEx.Call(tr.hMenu, 0x0002, uintptr(pt.X), uintptr(pt.Y), tr.hwnd, 0) // TPM_RIGHTBUTTON
	tnW32PostMessageW.Call(tr.hwnd, 0, 0, 0)
}

func (tr *tnWebviewWinTray) getRect() *TnWebviewTrayRect {
	id := tnW32NotifyIconIdentifier{
		CbSize: uint32(unsafe.Sizeof(tnW32NotifyIconIdentifier{})),
		Hwnd:   tr.hwnd,
		UID:    tr.uid,
	}
	var rc tnW32Rect
	hr, _, _ := tnW32ShellNotifyIconGetRect.Call(uintptr(unsafe.Pointer(&id)), uintptr(unsafe.Pointer(&rc)))
	if hr != 0 {
		return &TnWebviewTrayRect{}
	}
	return &TnWebviewTrayRect{
		x:      float64(rc.Left),
		y:      float64(rc.Top),
		width:  float64(rc.Right - rc.Left),
		height: float64(rc.Bottom - rc.Top),
	}
}

func tnWebviewTrayWndProc(hwnd, msg, wp, lp uintptr) uintptr {
	tnTrayMapMu.RLock()
	tr := tnTrayMap[hwnd]
	tnTrayMapMu.RUnlock()
	if tr == nil {
		r, _, _ := tnW32DefWindowProcW.Call(hwnd, msg, wp, lp)
		return r
	}
	switch msg {
	case tnWMTray:
		ev := uint32(lp & 0xFFFF)
		var pt tnW32Point
		tnW32GetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
		rc := tr.getRect()
		switch ev {
		case tnWMLButtonUp:
			if tr.t.menuOnLeft && tr.hMenu != 0 {
				tr.popupMenu()
			}
			TnLoopPost(func() {
				tr.t.emit("click", &TnWebviewTrayEvent{event: "click", id: tr.t.id, x: float64(pt.X), y: float64(pt.Y), rect: rc, button: "left", buttonState: "up"})
			})
		case tnWMRButtonUp:
			if tr.t.menuOnRight && tr.hMenu != 0 {
				tr.popupMenu()
			}
			TnLoopPost(func() {
				tr.t.emit("click", &TnWebviewTrayEvent{event: "click", id: tr.t.id, x: float64(pt.X), y: float64(pt.Y), rect: rc, button: "right", buttonState: "up"})
			})
		case tnWMMButtonUp:
			TnLoopPost(func() {
				tr.t.emit("click", &TnWebviewTrayEvent{event: "click", id: tr.t.id, x: float64(pt.X), y: float64(pt.Y), rect: rc, button: "middle", buttonState: "up"})
			})
		case tnWMLButtonDblClk, tnWMRButtonDblClk:
			btn := "left"
			if ev == tnWMRButtonDblClk {
				btn = "right"
			}
			TnLoopPost(func() {
				tr.t.emit("double-click", &TnWebviewTrayEvent{event: "double-click", id: tr.t.id, x: float64(pt.X), y: float64(pt.Y), rect: rc, button: btn})
			})
		}
	case tnWMCommand:
		cmdId := uint32(wp & 0xFFFF)
		if cmd, ok := tr.menuCmds[cmdId]; ok {
			if cmd.id != "" {
				id := cmd.id
				TnLoopPost(func() {
					tr.t.app.emit("custom-menu-click", &TnWebviewEvent{
						event:           "custom-menu-click",
						customMenuEvent: &TnWebviewCustomMenuEvent{id: id, windowId: 0},
					})
				})
			}
			if cmd.role == "quit" {
				TnLoopPost(func() { tr.t.app.exit() })
			}
		}
	case tnWMDestroy:
		nid := tnW32NotifyIconDataW{CbSize: uint32(unsafe.Sizeof(tnW32NotifyIconDataW{})), Hwnd: hwnd, UID: tr.uid}
		tnW32ShellNotifyIconW.Call(tnNIMDelete, uintptr(unsafe.Pointer(&nid)))
		if tr.hMenu != 0 {
			tnW32DestroyMenu.Call(tr.hMenu)
			tr.hMenu = 0
		}
		if tr.ownIcon && tr.hIcon != 0 {
			tnW32DestroyIcon.Call(tr.hIcon)
			tr.hIcon = 0
		}
		tnTrayMapMu.Lock()
		delete(tnTrayMap, hwnd)
		tnTrayMapMu.Unlock()
		tnW32PostQuitMessage.Call(0)
	default:
		r, _, _ := tnW32DefWindowProcW.Call(hwnd, msg, wp, lp)
		return r
	}
	return 0
}

func (tr *tnWebviewWinTray) setIcon(data []byte, width int, height int) {
	tr.do(func() {
		if tr.ownIcon && tr.hIcon != 0 {
			tnW32DestroyIcon.Call(tr.hIcon)
		}
		tr.hIcon = tnW32CreateHIconFromBytes(data, width, height)
		tr.ownIcon = len(data) > 0
		nid := tnW32NotifyIconDataW{CbSize: uint32(unsafe.Sizeof(tnW32NotifyIconDataW{})), Hwnd: tr.hwnd, UID: tr.uid, UFlags: tnNIFIcon, HIcon: tr.hIcon}
		tnW32ShellNotifyIconW.Call(tnNIMModify, uintptr(unsafe.Pointer(&nid)))
	})
}
func (tr *tnWebviewWinTray) removeIcon() { tr.setIcon(nil, 0, 0) }
func (tr *tnWebviewWinTray) setMenu(items []*TnWebviewMenuItem) {
	tr.do(func() {
		if tr.hMenu != 0 {
			tnW32DestroyMenu.Call(tr.hMenu)
			tr.hMenu = 0
		}
		tr.menuCmds = map[uint32]tnMenuCmd{}
		if len(items) > 0 {
			nextId := uint32(20000)
			tr.hMenu = tnW32BuildMenu(items, true, &nextId, tr.menuCmds)
		}
	})
}
func (tr *tnWebviewWinTray) setTooltip(tooltip string) {
	tr.do(func() {
		nid := tnW32NotifyIconDataW{CbSize: uint32(unsafe.Sizeof(tnW32NotifyIconDataW{})), Hwnd: tr.hwnd, UID: tr.uid, UFlags: tnNIFTip}
		tnW32CopyUTF16(nid.SzTip[:], tooltip)
		tnW32ShellNotifyIconW.Call(tnNIMModify, uintptr(unsafe.Pointer(&nid)))
	})
}
func (tr *tnWebviewWinTray) setTitle(title string) {}
func (tr *tnWebviewWinTray) setVisible(visible bool) {
	tr.do(func() {
		state := uint32(0)
		if !visible {
			state = tnNISHidden
		}
		nid := tnW32NotifyIconDataW{CbSize: uint32(unsafe.Sizeof(tnW32NotifyIconDataW{})), Hwnd: tr.hwnd, UID: tr.uid, UFlags: tnNIFState, DwState: state, DwStateMask: tnNISHidden}
		tnW32ShellNotifyIconW.Call(tnNIMModify, uintptr(unsafe.Pointer(&nid)))
	})
}
func (tr *tnWebviewWinTray) rect() *TnWebviewTrayRect {
	ch := make(chan *TnWebviewTrayRect, 1)
	tr.do(func() { ch <- tr.getRect() })
	return <-ch
}
func (tr *tnWebviewWinTray) showMenu() { tr.do(func() { tr.popupMenu() }) }
func (tr *tnWebviewWinTray) dispose()  { tr.do(func() { tnW32DestroyWindow.Call(tr.hwnd) }) }

func tnWebviewOpenTray(t *TnWebviewTrayIcon) tnWebviewTrayBackend {
	tr := &tnWebviewWinTray{t: t, uid: 1, menuCmds: map[uint32]tnMenuCmd{}}
	go func() {
		runtime.LockOSThread()
		var hinstance windows.Handle
		_ = windows.GetModuleHandleEx(0, nil, &hinstance)
		className, _ := windows.UTF16PtrFromString("TnWebviewTray")
		tnTrayClassOnce.Do(func() {
			wc := tnW32WndClassExW{
				CbSize:        uint32(unsafe.Sizeof(tnW32WndClassExW{})),
				HInstance:     hinstance,
				LpszClassName: className,
				LpfnWndProc:   windows.NewCallback(tnWebviewTrayWndProc),
			}
			tnW32RegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))
		})
		tr.mainthread, _, _ = tnW32GetCurrentThreadID.Call()
		hwnd, _, _ := tnW32CreateWindowExW.Call(0, uintptr(unsafe.Pointer(className)), 0, 0, 0, 0, 0, 0, 0, 0, uintptr(hinstance), 0)
		if hwnd == 0 {
			return
		}
		tr.hwnd = hwnd
		tnTrayMapMu.Lock()
		tnTrayMap[hwnd] = tr
		tnTrayMapMu.Unlock()

		tr.hIcon = tnW32CreateHIconFromBytes(t.iconData, t.iconW, t.iconH)
		tr.ownIcon = len(t.iconData) > 0
		if len(t.menu) > 0 {
			nextId := uint32(20000)
			tr.hMenu = tnW32BuildMenu(t.menu, true, &nextId, tr.menuCmds)
		}
		nid := tnW32NotifyIconDataW{
			CbSize:           uint32(unsafe.Sizeof(tnW32NotifyIconDataW{})),
			Hwnd:             hwnd,
			UID:              tr.uid,
			UFlags:           tnNIFMsg | tnNIFIcon | tnNIFTip | tnNIFState,
			UCallbackMessage: tnWMTray,
			HIcon:            tr.hIcon,
			DwStateMask:      tnNISHidden,
		}
		if !t.visible {
			nid.DwState = tnNISHidden
		}
		tnW32CopyUTF16(nid.SzTip[:], t.tooltip)
		tnW32ShellNotifyIconW.Call(tnNIMAdd, uintptr(unsafe.Pointer(&nid)))

		tr.mu.Lock()
		tr.ready = true
		pending := tr.pending
		tr.pending = nil
		tr.mu.Unlock()
		for _, fn := range pending {
			fn()
		}

		var msg tnW32Msg
		for {
			r, _, _ := tnW32GetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
			if r == 0 || int32(r) == -1 {
				break
			}
			if msg.Message == tnWMApp {
				tr.mu.Lock()
				q := append([]func(){}, tr.dispatchq...)
				tr.dispatchq = nil
				tr.mu.Unlock()
				for _, fn := range q {
					fn()
				}
				continue
			}
			if msg.Message == tnWMQuit {
				break
			}
			tnW32TranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
			tnW32DispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
		}
	}()
	return tr
}

// --- Windows Notifications (Shell_NotifyIconW balloon) ---

type tnWebviewWinNotif struct {
	n    *TnWebviewNotification
	hwnd uintptr
	uid  uint32
	done bool
}

func tnWebviewNotifWndProc(hwnd, msg, wp, lp uintptr) uintptr {
	tnNotifMu.RLock()
	nf := tnNotifMap[hwnd]
	tnNotifMu.RUnlock()
	if nf == nil {
		r, _, _ := tnW32DefWindowProcW.Call(hwnd, msg, wp, lp)
		return r
	}
	switch msg {
	case tnWMNotify:
		ev := uint32(lp & 0xFFFF)
		switch ev {
		case tnNINBalloonShow:
			TnLoopPost(func() { nf.n.dispatchEvent("show", "", nil) })
		case tnNINBalloonClick:
			TnLoopPost(func() { nf.n.dispatchEvent("click", "", nil) })
			tnW32DestroyWindow.Call(hwnd)
		case tnNINBalloonTimeout, tnNINBalloonHide:
			TnLoopPost(func() {
				if !nf.n.closed {
					nf.n.closed = true
					nf.n.dispatchEvent("close", "", nil)
				}
			})
			tnW32DestroyWindow.Call(hwnd)
		}
	case tnWMDestroy:
		nid := tnW32NotifyIconDataW{CbSize: uint32(unsafe.Sizeof(tnW32NotifyIconDataW{})), Hwnd: hwnd, UID: nf.uid}
		tnW32ShellNotifyIconW.Call(tnNIMDelete, uintptr(unsafe.Pointer(&nid)))
		tnNotifMu.Lock()
		delete(tnNotifMap, hwnd)
		tnNotifMu.Unlock()
		tnW32PostQuitMessage.Call(0)
	default:
		r, _, _ := tnW32DefWindowProcW.Call(hwnd, msg, wp, lp)
		return r
	}
	return 0
}

func tnWebviewShowNotification(n *TnWebviewNotification) func() {
	hwndCh := make(chan uintptr, 1)
	go func() {
		runtime.LockOSThread()
		var hinstance windows.Handle
		_ = windows.GetModuleHandleEx(0, nil, &hinstance)
		className, _ := windows.UTF16PtrFromString("TnWebviewNotif")
		tnNotifClassOnce.Do(func() {
			wc := tnW32WndClassExW{
				CbSize:        uint32(unsafe.Sizeof(tnW32WndClassExW{})),
				HInstance:     hinstance,
				LpszClassName: className,
				LpfnWndProc:   windows.NewCallback(tnWebviewNotifWndProc),
			}
			tnW32RegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))
		})
		hwnd, _, _ := tnW32CreateWindowExW.Call(0, uintptr(unsafe.Pointer(className)), 0, 0, 0, 0, 0, 0, 0, 0, uintptr(hinstance), 0)
		hwndCh <- hwnd
		if hwnd == 0 {
			return
		}
		nf := &tnWebviewWinNotif{n: n, hwnd: hwnd, uid: 1}
		tnNotifMu.Lock()
		tnNotifMap[hwnd] = nf
		tnNotifMu.Unlock()

		icon, _, _ := tnW32LoadIconW.Call(0, 32512)
		flags := uint32(tnNIIFInfo)
		if n.silent {
			flags |= tnNIIFNoSnd
		}
		nid := tnW32NotifyIconDataW{
			CbSize:           uint32(unsafe.Sizeof(tnW32NotifyIconDataW{})),
			Hwnd:             hwnd,
			UID:              nf.uid,
			UFlags:           tnNIFMsg | tnNIFIcon | tnNIFInfo,
			UCallbackMessage: tnWMNotify,
			HIcon:            icon,
			DwInfoFlags:      flags,
		}
		tnW32CopyUTF16(nid.SzInfoTitle[:], n.title)
		body := n.body
		if body == "" {
			body = " "
		}
		tnW32CopyUTF16(nid.SzInfo[:], body)
		tnW32ShellNotifyIconW.Call(tnNIMAdd, uintptr(unsafe.Pointer(&nid)))

		var msg tnW32Msg
		for {
			r, _, _ := tnW32GetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
			if r == 0 || int32(r) == -1 || msg.Message == tnWMQuit {
				break
			}
			tnW32TranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
			tnW32DispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
		}
	}()
	return func() {
		select {
		case hwnd := <-hwndCh:
			if hwnd != 0 {
				tnW32PostMessageW.Call(hwnd, tnWMClose, 0, 0)
			}
		default:
		}
	}
}

func tnWebviewOpenFileDialog(hwnd uintptr, opts interface{}) []string {
	buf := make([]uint16, 65536)
	ofn := tnW32OpenFileNameW{
		LStructSize: uint32(unsafe.Sizeof(tnW32OpenFileNameW{})),
		HwndOwner:   hwnd,
		LpstrFile:   &buf[0],
		NMaxFile:    uint32(len(buf)),
		Flags:       0x00080000 | 0x00001000 | 0x00000008, // OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_NOCHANGEDIR
	}
	if opts != nil {
		if tnWebviewBool(opts, "multiple", false) {
			ofn.Flags |= 0x00000200 // OFN_ALLOWMULTISELECT
		}
		if title := tnWebviewString(opts, "title"); title != "" {
			u, _ := windows.UTF16PtrFromString(title)
			ofn.LpstrTitle = u
		}
		if dir := tnWebviewString(opts, "defaultPath"); dir != "" {
			u, _ := windows.UTF16PtrFromString(dir)
			ofn.LpstrInitialDir = u
		}
	}
	ok, _, _ := tnW32GetOpenFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	if ok == 0 {
		return []string{}
	}
	var parts []string
	start := 0
	for i := 0; i < len(buf); i++ {
		if buf[i] == 0 {
			if i == start {
				break
			}
			parts = append(parts, windows.UTF16ToString(buf[start:i]))
			start = i + 1
		}
	}
	if len(parts) <= 1 {
		return parts
	}
	dir := parts[0]
	out := make([]string, 0, len(parts)-1)
	for _, f := range parts[1:] {
		out = append(out, filepath.Join(dir, f))
	}
	return out
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
const webviewOtherHelper = `type tnWebviewNoopTray struct{}

func (t *tnWebviewNoopTray) setIcon(data []byte, width int, height int) {}
func (t *tnWebviewNoopTray) removeIcon()                                {}
func (t *tnWebviewNoopTray) setMenu(items []*TnWebviewMenuItem)         {}
func (t *tnWebviewNoopTray) setTooltip(tooltip string)                  {}
func (t *tnWebviewNoopTray) setTitle(title string)                      {}
func (t *tnWebviewNoopTray) setVisible(visible bool)                    {}
func (t *tnWebviewNoopTray) rect() *TnWebviewTrayRect                   { return nil }
func (t *tnWebviewNoopTray) showMenu()                                  {}
func (t *tnWebviewNoopTray) dispose()                                   {}

func tnWebviewOpenTray(t *TnWebviewTrayIcon) tnWebviewTrayBackend {
	return &tnWebviewNoopTray{}
}

func tnWebviewShowNotification(n *TnWebviewNotification) func() {
	go func() {
		switch runtime.GOOS {
		case "darwin":
			script := fmt.Sprintf("display notification %q with title %q", n.body, n.title)
			_ = exec.Command("osascript", "-e", script).Run()
		default:
			if bin, err := exec.LookPath("notify-send"); err == nil {
				_ = exec.Command(bin, n.title, n.body).Run()
			}
		}
		TnLoopPost(func() {
			if !n.closed {
				n.dispatchEvent("show", "", nil)
			}
		})
	}()
	return func() {}
}

func tnWebviewOpenFileDialog(_ uintptr, _ interface{}) []string {
	return []string{}
}

func tnWebviewOpen(w *TnWebviewWindow, closed func()) tnWebviewBackend {
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

const WEBVIEW_EMITTER =
  'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64';

export function registerWebview(r: NodeRegistry): void {
  const mod = '@webviewjs/webview';
  defineModule(r, mod);
  defineHelper(
    r,
    'nodeWebviewOS@windows',
    [
      'bytes',
      'encoding/json',
      'fmt',
      'github.com/jchv/go-webview2/pkg/edge',
      'github.com/jchv/go-webview2/webviewloader',
      'golang.org/x/sys/windows',
      'image/png',
      'net/http',
      'os',
      'os/exec',
      'path/filepath',
      'runtime',
      'strings',
      'sync',
      'syscall',
      'time',
      'unsafe'
    ],
    [],
    webviewWindowsHelper
  );
  defineHelper(r, 'nodeWebviewOS@other', ['bufio', 'encoding/json', 'fmt', 'io', 'os', 'os/exec', 'runtime'], [], webviewOtherHelper);
  defineHelper(
    r,
    'nodeWebview',
    ['encoding/json', 'fmt', 'net/url', 'os', 'os/exec', 'path/filepath', 'reflect', 'runtime', 'strings', 'time'],
    ['dynamic', 'nodeEvents', 'nodeInvoke', 'nodeFetch', 'jsonStringify', 'eventLoop', 'promise', 'error', 'nodeWebviewOS@os'],
    webviewHelper
  );

  // Classes
  defineClass(
    r,
    `${mod}.Application`,
    '*TnWebviewApp',
    'class',
    `${WEBVIEW_EMITTER}; createWebContext=*TnWebviewContext; createBrowserWindow=*TnWebviewWindow; createChildBrowserWindow=*TnWebviewWindow; createTrayIcon=*TnWebviewTrayIcon; setMenu=; setDockIcon=; removeDockIcon=; isReady=bool; run=; whenReady=chan struct{}; exit=`,
    '',
    '',
    ''
  );
  defineClass(
    r,
    `${mod}.BrowserWindow`,
    '*TnWebviewWindow',
    'class',
    `${WEBVIEW_EMITTER}; createWebview=*TnWebview; registerProtocol=; setTitle=; close=; dispose=; isDisposed=bool; id=float64; hasMenu=bool; show=; hide=; setVisible=; isVisible=bool; focus=; isFocused=bool; setMaximized=; isMaximized=bool; setMinimized=; isMinimized=bool; setResizable=; isResizable=bool; setDecorations=; isDecorated=bool; setClosable=; isClosable=bool; setMaximizable=; isMaximizable=bool; setMinimizable=; isMinimizable=bool; setAlwaysOnTop=; setAlwaysOnBottom=; setContentProtection=; setSkipTaskbar=; setEnable=; setFullscreen=; setSize=*TnWebviewDimensions; setMinSize=; setMaxSize=; getInnerSize=*TnWebviewDimensions; getOuterSize=*TnWebviewDimensions; setPosition=; getPosition=*TnWebviewPosition; center=; scaleFactor=float64; startDragging=; requestRedraw=; openFileDialog=[]string`,
    '',
    'title=string; width=float64; height=float64; x=float64; y=float64; isChild=bool; fullscreen=interface{}',
    ''
  );
  defineClass(
    r,
    `${mod}.Webview`,
    '*TnWebview',
    'class',
    'loadUrl=; loadHtml=; evaluateScript=; reload=; onIpcMessage=; expose=; zoom=; setWebviewVisibility=; focus=; dispose=; isDisposed=bool',
    '',
    '',
    ''
  );
  // Webview#url() maps to Go method getUrl() (Go field is `url`)
  r.methods[`${mod}.Webview#url`] = (c: NodeCall) => `${c.recv}.getUrl()`;
  r.results[`${mod}.Webview#url`] = 'string';

  defineClass(
    r,
    `${mod}.WebContext`,
    '*TnWebviewContext',
    'class',
    'isCustomProtocolRegistered=bool; setAllowsAutomation=; dispose=; isDisposed=bool',
    '',
    'dataDirectory=string',
    ''
  );
  defineClass(
    r,
    `${mod}.TrayIcon`,
    '*TnWebviewTrayIcon',
    'class',
    `${WEBVIEW_EMITTER}; setIcon=; removeIcon=; setMenu=; setTooltip=; setTitle=; setVisible=; setIconAsTemplate=; setShowMenuOnLeftClick=; setShowMenuOnRightClick=; showMenu=; rect=*TnWebviewTrayRect; dispose=; isDisposed=bool`,
    '',
    'id=string',
    ''
  );
  defineClass(
    r,
    `${mod}.Notification`,
    '*TnWebviewNotification',
    'class',
    `${WEBVIEW_EMITTER}; close=`,
    '',
    'title=string; body=string; icon=string; image=interface{}; badge=string; tag=string; data=interface{}; dir=string; lang=string; renotify=bool; requireInteraction=bool; persistent=bool; actions=[]interface{}; silent=bool; timestamp=float64; vibrate=interface{}; onclick=interface{}; onclose=interface{}; onerror=interface{}; onshow=interface{}',
    'onclick; onclose; onerror; onshow'
  );

  // Data/Event structs
  defineClass(r, `${mod}.CustomMenuEvent`, '*TnWebviewCustomMenuEvent', 'class', '', 'id=string; windowId=float64', '', '');
  defineClass(
    r,
    `${mod}.ApplicationEvent`,
    '*TnWebviewEvent',
    'class',
    '',
    'event=string; customMenuEvent=*TnWebviewCustomMenuEvent; x=float64; y=float64; width=float64; height=float64',
    '',
    ''
  );
  defineClass(r, `${mod}.HeaderData`, '*TnWebviewHeaderData', 'class', '', 'key=string; value=string', '', '');
  defineClass(
    r,
    `${mod}.IpcMessage`,
    '*TnWebviewIpcMessage',
    'class',
    '',
    'body=[]byte; method=string; headers=[]*TnWebviewHeaderData; uri=string',
    '',
    ''
  );
  defineClass(r, `${mod}.Dimensions`, '*TnWebviewDimensions', 'class', '', 'width=float64; height=float64', '', '');
  defineClass(r, `${mod}.Position`, '*TnWebviewPosition', 'class', '', 'x=float64; y=float64', '', '');
  defineClass(r, `${mod}.TrayRect`, '*TnWebviewTrayRect', 'class', '', 'x=float64; y=float64; width=float64; height=float64', '', '');
  defineClass(
    r,
    `${mod}.TrayEventPayload`,
    '*TnWebviewTrayEvent',
    'class',
    '',
    'event=string; id=string; x=float64; y=float64; rect=*TnWebviewTrayRect; button=string; buttonState=string',
    '',
    ''
  );
  defineClass(
    r,
    `${mod}.NotificationEvent`,
    '*TnWebviewNotificationEvent',
    'class',
    '',
    'target=*TnWebviewNotification; action=string',
    'type=string; error=*TnError',
    ''
  );

  // Option interfaces (so `import type { MenuOptions, ... }` annotations map to interface{})
  for (const optName of [
    'MenuOptions',
    'MenuItemOptions',
    'TrayIconOptions',
    'TrayIconImage',
    'NotificationOptions',
    'NotificationAction',
    'BrowserWindowOptions',
    'WebviewOptions',
    'WebContextOptions',
    'CustomProtocolResponse',
    'FileDialogOptions',
    'FileFilter',
    'ApplicationOptions',
    'ApplicationRunOptions'
  ]) {
    const key = `${mod}.${optName}`;
    r.classes[key] = { key, goType: 'interface{}', category: '', methods: {}, props: {}, getters: {}, setters: {} };
  }

  // Callback parameter typers
  const eventListeners = (_n: any[]): string[] => ['*TnWebviewEvent'];
  r.paramTypers[`${mod}.Application#on`] = eventListeners;
  r.paramTypers[`${mod}.Application#once`] = eventListeners;
  r.paramTypers[`${mod}.BrowserWindow#on`] = eventListeners;
  r.paramTypers[`${mod}.BrowserWindow#once`] = eventListeners;
  r.paramTypers[`${mod}.BrowserWindow#registerProtocol`] = (_n: any[]): string[] => ['*TnRequest'];
  r.paramTypers[`${mod}.Webview#onIpcMessage`] = (_n: any[]): string[] => ['*TnWebviewIpcMessage'];
  const trayListeners = (_n: any[]): string[] => ['*TnWebviewTrayEvent'];
  r.paramTypers[`${mod}.TrayIcon#on`] = trayListeners;
  r.paramTypers[`${mod}.TrayIcon#once`] = trayListeners;
  const notifListeners = (_n: any[]): string[] => ['*TnWebviewNotificationEvent'];
  r.paramTypers[`${mod}.Notification#on`] = notifListeners;
  r.paramTypers[`${mod}.Notification#once`] = notifListeners;

  // Constructors
  r.constructors[`${mod}.Application`] = (c: NodeCall) => {
    r.helper('nodeWebview');
    return `TnNewWebviewApp(${c.args.join(', ')})`;
  };
  r.constructors[`${mod}.Notification`] = (c: NodeCall) => {
    r.helper('nodeWebview');
    return `TnNewWebviewNotification(${c.args.join(', ')})`;
  };

  // Notification statics
  r.values[`${mod}.Notification.permission`] = () => '"granted"';
  r.valueTypes[`${mod}.Notification.permission`] = 'string';
  r.functions[`${mod}.Notification.requestPermission`] = () => {
    r.helper('nodeWebview');
    return 'TnWebviewNotificationRequestPermission()';
  };
  r.results[`${mod}.Notification.requestPermission`] = 'chan string';

  // URI workaround functions
  r.functions[`${mod}.originalUriPrefix`] = (c: NodeCall) => {
    r.helper('nodeWebview');
    return `TnWebviewOriginalUriPrefix(${c.args[0] ?? '""'})`;
  };
  r.results[`${mod}.originalUriPrefix`] = 'string';
  r.functions[`${mod}.workAroundUriPrefix`] = (c: NodeCall) => {
    r.helper('nodeWebview');
    return `TnWebviewWorkAroundUriPrefix(${c.args[0] ?? '"http"'}, ${c.args[1] ?? '""'})`;
  };
  r.results[`${mod}.workAroundUriPrefix`] = 'string';
  r.functions[`${mod}.applyUriWorkAround`] = (c: NodeCall) => {
    r.helper('nodeWebview');
    return `TnWebviewApplyUriWorkAround(${c.args[0] ?? '""'}, ${c.args[1] ?? '"http"'}, ${c.args[2] ?? '""'})`;
  };
  r.results[`${mod}.applyUriWorkAround`] = 'string';
  r.functions[`${mod}.revertUriWorkAround`] = (c: NodeCall) => {
    r.helper('nodeWebview');
    return `TnWebviewRevertUriWorkAround(${c.args[0] ?? '""'}, ${c.args[1] ?? '"http"'}, ${c.args[2] ?? '""'})`;
  };
  r.results[`${mod}.revertUriWorkAround`] = 'string';
  r.functions[`${mod}.isWorkAroundUri`] = (c: NodeCall) => {
    r.helper('nodeWebview');
    return `TnWebviewIsWorkAroundUri(${c.args[0] ?? '""'}, ${c.args[1] ?? '"http"'}, ${c.args[2] ?? '""'})`;
  };
  r.results[`${mod}.isWorkAroundUri`] = 'bool';

  // Enums
  const defineEnum = (enumName: string, entries: Record<string, number>): void => {
    r.objects[`${mod}.${enumName}`] = true;
    for (const k of Object.keys(entries)) {
      const val = entries[k];
      r.values[`${mod}.${enumName}.${k}`] = () => `float64(${val})`;
      r.valueTypes[`${mod}.${enumName}.${k}`] = 'float64';
    }
  };
  defineEnum('FullscreenType', { Exclusive: 0, Borderless: 1 });
  defineEnum('Theme', { Light: 0, Dark: 1, System: 2 });
  defineEnum('ProgressBarState', { None: 0, Normal: 1, Indeterminate: 2, Paused: 3, Error: 4 });
  defineEnum('ControlFlow', { Poll: 0, Wait: 1, WaitUntil: 2, Exit: 3, ExitWithCode: 4 });
}
