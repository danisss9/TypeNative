// node:fs watch / watchFile / unwatchFile and fs/promises watch.
//
// fs.watch runs on the vendored github.com/fsnotify/fsnotify (inotify, kqueue,
// ReadDirectoryChangesW; linked only into programs that call fs.watch): a
// goroutine reads its events and emits 'change' on the event loop. Recursive
// watches add every subdirectory, and directories created later.
// fs.watchFile polls stat() like Node does.

import { NodeRegistry, NodeCall, defineClass, defineHelper, setResults } from './registry.js';

const fsWatchHelper = `// node:fs watch (fsnotify)
type TnFSWatcher struct {
	TnEventEmitter
	asyncCtx  TnAsyncContext
	watcher   *fsnotify.Watcher
	root      string
	isDir     bool
	recursive bool
	closed    bool
	refd      bool
	// fs/promises watch: events go to a channel instead of 'change'
	events chan *TnFsWatchEvent
}

// One change, as fs/promises watch yields it
type TnFsWatchEvent struct {
	eventType string
	filename  string
}

func tnFsWatchIsFunc(v interface{}) bool {
	return v != nil && reflect.ValueOf(v).Kind() == reflect.Func && !reflect.ValueOf(v).IsNil()
}

// rename for entries appearing / disappearing, change for writes and
// attribute changes (Node's two event types)
func tnFsWatchType(op fsnotify.Op) string {
	if op.Has(fsnotify.Create) || op.Has(fsnotify.Remove) || op.Has(fsnotify.Rename) {
		return "rename"
	}
	return "change"
}

// options: an encoding string or { persistent, recursive, encoding, signal }
// events: fs/promises watch's channel (nil for fs.watch)
func tnFsWatchStart(path string, options interface{}, events chan *TnFsWatchEvent) *TnFSWatcher {
	w := &TnFSWatcher{asyncCtx: TnAsyncSnapshot(), root: filepath.Clean(path), events: events}
	persistent := true
	if _, isString := options.(string); options != nil && !isString {
		if p, ok := TnGet(options, "persistent").(bool); ok {
			persistent = p
		}
		w.recursive, _ = TnGet(options, "recursive").(bool)
	}
	info, err := os.Stat(path)
	if err != nil {
		panic(TnSysError(err, "watch", path))
	}
	w.isDir = info.IsDir()
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		panic(TnSysError(err, "watch", path))
	}
	w.watcher = watcher
	if err := w.add(w.root); err != nil {
		watcher.Close()
		panic(TnSysError(err, "watch", path))
	}
	if persistent {
		w.refd = true
		TnLoopRef()
	}
	if options != nil {
		if signal, ok := TnGet(options, "signal").(*TnAbortSignal); ok && signal != nil {
			if signal.aborted {
				TnLoopPost(func() { w.close() })
			} else {
				signal.addEventListener("abort", func(ev *TnEvent) { w.close() })
			}
		}
	}
	return w
}

// Adds a directory (and, for recursive watches, its subdirectories)
func (w *TnFSWatcher) add(dir string) error {
	if !w.recursive || !w.isDir {
		return w.watcher.Add(dir)
	}
	return filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			if p == dir {
				return err
			}
			return nil
		}
		if d.IsDir() {
			return w.watcher.Add(p)
		}
		return nil
	})
}

// The filename Node reports: relative to a watched directory, the file's own
// name for a watched file
func (w *TnFSWatcher) filename(name string) string {
	if !w.isDir {
		return filepath.Base(w.root)
	}
	if rel, err := filepath.Rel(w.root, name); err == nil {
		return rel
	}
	return filepath.Base(name)
}

// Reads fsnotify's channels until close(); handle runs on the loop
func (w *TnFSWatcher) run(handle func(eventType string, filename string), fail func(err error)) {
	go func() {
		for {
			select {
			case ev, ok := <-w.watcher.Events:
				if !ok {
					return
				}
				if w.recursive && ev.Op.Has(fsnotify.Create) {
					if info, err := os.Stat(ev.Name); err == nil && info.IsDir() {
						w.add(ev.Name)
					}
				}
				eventType := tnFsWatchType(ev.Op)
				filename := w.filename(ev.Name)
				TnLoopPost(func() {
					if !w.closed {
						TnAsyncRun(w.asyncCtx, func() { handle(eventType, filename) })
					}
				})
			case err, ok := <-w.watcher.Errors:
				if !ok {
					return
				}
				failure := err
				TnLoopPost(func() {
					if !w.closed {
						TnAsyncRun(w.asyncCtx, func() { fail(failure) })
					}
				})
			}
		}
	}()
}

// fs.watch(filename[, options][, listener])
func TnFsWatch(path string, rest ...interface{}) *TnFSWatcher {
	var options interface{}
	for _, a := range rest {
		if tnFsWatchIsFunc(a) {
			continue
		}
		options = a
	}
	w := tnFsWatchStart(path, options, nil)
	for _, a := range rest {
		if tnFsWatchIsFunc(a) {
			w.on("change", a)
		}
	}
	w.run(func(eventType string, filename string) {
		w.emit("change", eventType, filename)
	}, func(err error) {
		w.emit("error", TnSysError(err, "watch", path))
	})
	return w
}

func (w *TnFSWatcher) close() {
	w.stop(tnAbortError("The operation was aborted", "AbortError"))
}

// Stops watching; fs/promises watch's iterator rejects with reason
func (w *TnFSWatcher) stop(reason interface{}) {
	if w.closed {
		return
	}
	w.closed = true
	w.watcher.Close()
	if w.refd {
		w.refd = false
		TnLoopUnref()
	}
	if w.events != nil {
		TnReject(w.events, reason)
		return
	}
	TnLoopPost(func() { w.emit("close") })
}

func (w *TnFSWatcher) ref() *TnFSWatcher {
	if !w.refd && !w.closed {
		w.refd = true
		TnLoopRef()
	}
	return w
}

func (w *TnFSWatcher) unref() *TnFSWatcher {
	if w.refd {
		w.refd = false
		TnLoopUnref()
	}
	return w
}

// fs/promises watch(filename[, options]): an async iterator of
// { eventType, filename }; aborting the signal rejects it with an AbortError
func TnFsWatchIterator(path string, options ...interface{}) chan *TnFsWatchEvent {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	ch := make(chan *TnFsWatchEvent, 1024)
	w := tnFsWatchStart(path, opts, ch)
	// The consumer's await keeps the program alive
	w.unref()
	w.run(func(eventType string, filename string) {
		select {
		case ch <- &TnFsWatchEvent{eventType: eventType, filename: filename}:
		default:
		}
	}, func(err error) {
		w.stop(TnSysError(err, "watch", path))
	})
	return ch
}

// fs.watchFile: polls stat() every interval (Node's default 5007 ms) and calls
// listener(curr, prev) when the file changes; a missing file has zeroed Stats
type TnStatWatcher struct {
	TnEventEmitter
	asyncCtx TnAsyncContext
	path     string
	stop     chan struct{}
	stopped  bool
	refd     bool
}

var tnStatWatchers = map[string]*TnStatWatcher{}

func tnStatOrZero(path string) *TnStats {
	info, err := os.Stat(path)
	if err != nil {
		zero := time.UnixMilli(0)
		return &TnStats{atime: zero, mtime: zero, ctime: zero, birthtime: zero}
	}
	return tnStatsOf(info)
}

func tnStatsChanged(a *TnStats, b *TnStats) bool {
	return a.mtimeMs != b.mtimeMs || a.size != b.size || a.mode != b.mode
}

// fs.watchFile(filename[, options], listener)
func TnWatchFile(path string, rest ...interface{}) *TnStatWatcher {
	interval := 5007.0
	persistent := true
	var listener interface{}
	for _, a := range rest {
		if tnFsWatchIsFunc(a) {
			listener = a
			continue
		}
		if a != nil {
			if n, ok := TnGet(a, "interval").(float64); ok && n > 0 {
				interval = n
			}
			if p, ok := TnGet(a, "persistent").(bool); ok {
				persistent = p
			}
		}
	}
	key := filepath.Clean(path)
	if existing, ok := tnStatWatchers[key]; ok {
		if listener != nil {
			existing.on("change", listener)
		}
		return existing
	}
	s := &TnStatWatcher{asyncCtx: TnAsyncSnapshot(), path: path, stop: make(chan struct{})}
	tnStatWatchers[key] = s
	if listener != nil {
		s.on("change", listener)
	}
	if persistent {
		s.refd = true
		TnLoopRef()
	}
	prev := tnStatOrZero(path)
	go func() {
		ticker := time.NewTicker(max(time.Duration(interval*float64(time.Millisecond)), time.Millisecond))
		defer ticker.Stop()
		for {
			select {
			case <-s.stop:
				return
			case <-ticker.C:
			}
			curr := tnStatOrZero(path)
			if !tnStatsChanged(curr, prev) {
				continue
			}
			before := prev
			prev = curr
			TnLoopPost(func() {
				if !s.stopped {
					TnAsyncRun(s.asyncCtx, func() { s.emit("change", curr, before) })
				}
			})
		}
	}()
	return s
}

func (s *TnStatWatcher) halt() {
	if s.stopped {
		return
	}
	s.stopped = true
	close(s.stop)
	s.unref()
	delete(tnStatWatchers, filepath.Clean(s.path))
}

// fs.unwatchFile(filename[, listener]): removes one listener, or all of them;
// polling stops once none is left
func TnUnwatchFile(path string, listener ...interface{}) {
	s, ok := tnStatWatchers[filepath.Clean(path)]
	if !ok {
		return
	}
	if len(listener) > 0 && listener[0] != nil {
		s.removeListener("change", listener[0])
		if s.listenerCount("change") > 0 {
			return
		}
	}
	s.halt()
}

func (s *TnStatWatcher) ref() *TnStatWatcher {
	if !s.refd && !s.stopped {
		s.refd = true
		TnLoopRef()
	}
	return s
}

func (s *TnStatWatcher) unref() *TnStatWatcher {
	if s.refd {
		s.refd = false
		TnLoopUnref()
	}
	return s
}`;

const EMITTER_METHODS =
  'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64';

export function registerFsWatch(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeFsWatch',
    ['github.com/fsnotify/fsnotify', 'io/fs', 'os', 'path/filepath', 'reflect', 'time'],
    ['nodeFs', 'nodeEvents', 'eventLoop', 'promise', 'dynamic', 'nodeInvoke'],
    fsWatchHelper
  );
  const use = () => r.helper('nodeFsWatch');
  defineClass(r, 'fs.FSWatcher', '*TnFSWatcher', 'class', `${EMITTER_METHODS}; close=; ref=*TnFSWatcher; unref=*TnFSWatcher`, '', '', '');
  defineClass(r, 'fs.StatWatcher', '*TnStatWatcher', 'class', `${EMITTER_METHODS}; ref=*TnStatWatcher; unref=*TnStatWatcher`, '', '', '');
  defineClass(r, 'fs/promises.FileChangeInfo', '*TnFsWatchEvent', 'class', '', 'eventType=string; filename=string', '', '');

  // Listener parameters: change(eventType, filename) / error(err) / watchFile's (curr, prev)
  const watchListener = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'change') return ['string', 'string'];
    if (name === 'error') return ['interface{}'];
    return [];
  };
  const statListener = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    return name === 'change' ? ['*TnStats', '*TnStats'] : [];
  };
  for (const method of ['on', 'once', 'addListener']) {
    r.paramTypers[`fs.FSWatcher#${method}`] = watchListener;
    r.paramTypers[`fs.StatWatcher#${method}`] = statListener;
  }

  r.functions['fs.watch'] = (c: NodeCall) => {
    use();
    return `TnFsWatch(${c.args.join(', ')})`;
  };
  r.paramTypers['fs.watch'] = (_n: any[]) => ['string', 'string'];
  r.functions['fs.watchFile'] = (c: NodeCall) => {
    use();
    return `TnWatchFile(${c.args.join(', ')})`;
  };
  r.paramTypers['fs.watchFile'] = (_n: any[]) => ['*TnStats', '*TnStats'];
  r.functions['fs.unwatchFile'] = (c: NodeCall) => {
    use();
    return `TnUnwatchFile(${c.args.join(', ')})`;
  };
  setResults(r, 'fs', 'watch=*TnFSWatcher; watchFile=*TnStatWatcher; unwatchFile=');
  r.functions['fs/promises.watch'] = (c: NodeCall) => {
    use();
    return `TnFsWatchIterator(${c.args.join(', ')})`;
  };
  r.results['fs/promises.watch'] = 'chan *TnFsWatchEvent';
}
