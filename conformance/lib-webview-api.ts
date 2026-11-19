// The @webviewjs/webview API without opening a window: every class, option,
// menu, tray icon, notification, IPC, custom protocol, window control and
// event a program can use, on every OS CI builds on (no display needed).
import {
  Application,
  FullscreenType,
  Notification,
  Theme,
  applyUriWorkAround,
  isWorkAroundUri,
  originalUriPrefix,
  revertUriWorkAround,
  workAroundUriPrefix
} from '@webviewjs/webview';
import type {
  ApplicationEvent,
  BrowserWindow,
  IpcMessage,
  NotificationEvent,
  TrayEventPayload,
  TrayIcon,
  WebContext,
  Webview
} from '@webviewjs/webview';

const app = new Application();
const events: string[] = [];
assert(!app.isReady(), 'not ready before run');

// --- URI workaround helpers ---
assert(originalUriPrefix('app') === 'app://', 'originalUriPrefix');
assert(workAroundUriPrefix('http', 'app') === 'http://app.', 'workAroundUriPrefix');
const wa = applyUriWorkAround('app://localhost/index.html', 'http', 'app');
assert(wa === 'http://app.localhost/index.html', 'applyUriWorkAround');
assert(isWorkAroundUri(wa, 'http', 'app'), 'isWorkAroundUri');
assert(revertUriWorkAround(wa, 'http', 'app') === 'app://localhost/index.html', 'revertUriWorkAround');

// --- Menus ---
const menu = {
  items: [
    {
      label: 'File',
      submenu: {
        items: [
          { id: 'new-file', label: 'New', accelerator: 'Ctrl+N' },
          { role: 'separator' },
          { id: 'quit-item', label: 'Quit', role: 'quit', enabled: true }
        ]
      }
    }
  ]
};
app.setMenu(menu);

// --- WebContext + BrowserWindow + Window Controls ---
const context: WebContext = app.createWebContext({ dataDirectory: 'webview-data', allowsAutomation: true });
assert(context.dataDirectory === 'webview-data', 'context dataDirectory');
assert(!context.isDisposed(), 'context not disposed');

const win: BrowserWindow = app.createBrowserWindow({
  title: 'Probe',
  width: 640,
  height: 480,
  x: 100,
  y: 120,
  logical: true,
  resizable: false,
  decorations: true,
  alwaysOnTop: false,
  visible: true
});
assert(win.id() >= 1, 'window id');
assert(!win.isChild, 'not child window');
assert(win.title === 'Probe', 'window title getter');
assert(win.width === 640 && win.height === 480, 'window size getters');
assert(win.x === 100 && win.y === 120, 'window position getters');
assert(win.hasMenu(), 'inherits app menu');
assert(!win.isResizable(), 'initial resizable');
assert(win.isDecorated(), 'initial decorated');
assert(win.isVisible(), 'initial visible');
assert(win.isClosable(), 'initial closable');
assert(win.isMaximizable(), 'initial maximizable');
assert(win.isMinimizable(), 'initial minimizable');
assert(!win.isMaximized(), 'initial not maximized');
assert(!win.isMinimized(), 'initial not minimized');
assert(win.fullscreen === null, 'initial fullscreen null');

win.setTitle('Renamed');
assert(win.title === 'Renamed', 'setTitle updates title');
win.setResizable(true);
assert(win.isResizable(), 'setResizable');
win.setDecorations(false);
assert(!win.isDecorated(), 'setDecorations');
win.setClosable(false);
assert(!win.isClosable(), 'setClosable');
win.setMaximizable(false);
assert(!win.isMaximizable(), 'setMaximizable');
win.setMinimizable(false);
assert(!win.isMinimizable(), 'setMinimizable');
win.setMaximized(true);
assert(win.isMaximized(), 'setMaximized');
win.setMinimized(true);
assert(win.isMinimized() && !win.isMaximized(), 'setMinimized');
win.setFullscreen(FullscreenType.Borderless);
assert(win.fullscreen === FullscreenType.Borderless, 'setFullscreen');
win.setFullscreen(null);
assert(win.fullscreen === null, 'clear fullscreen');
win.setVisible(false);
assert(!win.isVisible(), 'setVisible false');
win.show();
assert(win.isVisible(), 'show');
win.hide();
assert(!win.isVisible(), 'hide');
win.setAlwaysOnTop(true);
win.setAlwaysOnBottom(false);
win.setContentProtection(true);
win.setSkipTaskbar(false);
win.setEnable(true);
const resized = win.setSize(800, 600, true);
assert(resized !== null && resized.width === 800 && resized.height === 600, 'setSize');
win.setMinSize(320, 240, true);
win.setMaxSize(1920, 1080, true);
const inner = win.getInnerSize(true);
assert(inner.width === 800 && inner.height === 600, 'getInnerSize');
const outer = win.getOuterSize(true);
assert(outer.width === 800 && outer.height === 600, 'getOuterSize');
win.setPosition(50, 60, false);
const pos = win.getPosition(false);
assert(pos.x === 50 && pos.y === 60, 'getPosition');
win.center();
assert(win.scaleFactor() >= 1, 'scaleFactor');
win.requestRedraw();

// --- Custom Protocols ---
win.registerProtocol('app', (_req) => {
  return new Response('<h1>custom</h1>', { headers: { 'Content-Type': 'text/html' } });
});

// --- Webview + IPC (onIpcMessage, expose) ---
const view: Webview = win.createWebview({
  html: '<p>probe</p>',
  enableDevtools: false,
  webContext: context,
  ipcName: 'ipc'
});
assert(context.isCustomProtocolRegistered('app'), 'custom protocol registered on context');
assert(!context.isCustomProtocolRegistered('unknown'), 'unregistered protocol');

// Before the window opens these only change what it will show
view.loadHtml('<p>changed</p>');
view.loadUrl('app://localhost/index.html');
assert(view.url() === 'app://localhost/index.html', 'webview url()');
view.evaluateScript('1 + 1');
view.reload();
view.zoom(1.25);
view.setWebviewVisibility(true);
view.focus();

const ipcMessages: string[] = [];
view.onIpcMessage((msg: IpcMessage) => {
  ipcMessages.push(msg.body.toString());
});
view.expose('api', {
  version: '1.0.0',
  add: (a: number, b: number) => a + b
});

let dupExpose = '';
try {
  view.expose('api', { x: 1 });
} catch (err) {
  dupExpose = (err as Error).message;
}
assert(dupExpose.includes('already registered'), 'duplicate expose throws');

let badIdent = '';
try {
  view.expose('123bad', { x: 1 });
} catch (err) {
  badIdent = (err as Error).message;
}
assert(badIdent.includes('valid JavaScript identifier'), 'invalid expose ident throws');

let threw = '';
try {
  win.createWebview({ url: 'http://127.0.0.1:1/' });
} catch (err) {
  threw = (err as Error).message;
}
assert(threw === 'A window holds one webview', 'one webview per window');

// --- Tray Icon ---
const tray: TrayIcon = app.createTrayIcon({
  id: 'main-tray',
  tooltip: 'Probe Tray',
  menu: menu,
  menuOnLeftClick: false,
  menuOnRightClick: true
});
assert(tray.id === 'main-tray', 'tray id');
assert(!tray.isDisposed(), 'tray not disposed');
tray.setTooltip('Updated Tooltip');
tray.setTitle('TrayTitle');
tray.setVisible(false);
tray.setVisible(true);
tray.setIconAsTemplate(true);
tray.setShowMenuOnLeftClick(true);
tray.setShowMenuOnRightClick(true);
tray.setMenu(null);
tray.removeIcon();
const trayEvents: string[] = [];
tray.on('click', (e: TrayEventPayload) => trayEvents.push(e.event));
tray.dispose();
assert(tray.isDisposed(), 'tray disposed');

// --- Notifications ---
assert(Notification.permission === 'granted', 'Notification.permission');
const notif = new Notification('Hello', {
  body: 'World',
  tag: 'probe-tag',
  silent: true,
  data: { ok: true }
});
assert(notif.title === 'Hello', 'notification title');
assert(notif.body === 'World', 'notification body');
assert(notif.tag === 'probe-tag', 'notification tag');
assert(notif.silent === true, 'notification silent');
assert(notif.dir === 'auto', 'notification dir default');
let notifClosed = false;
notif.on('close', (ev: NotificationEvent) => {
  assert(ev.type === 'close', 'notification close event type');
  notifClosed = true;
});
notif.close();
assert(notifClosed, 'notification close fired');

// --- Events & Lifecycle ---
function record(event: ApplicationEvent): void {
  events.push(event.event);
}
app.on('ready', record);
app.on('custom-menu-click', record);
app.once('window-close-requested', record);
app.on('application-close-requested', record);
win.on('close', record);
win.on('resize', record);
win.on('move', record);
win.on('focus', record);
win.on('blur', record);
win.once('close', record);

// Enum sanity
assert(Theme.Dark === 1 && FullscreenType.Borderless === 1, 'enum values');

// A window that never opened closes without events, and exit stops nothing else
view.dispose();
assert(view.isDisposed(), 'webview disposed');
context.dispose();
assert(context.isDisposed(), 'context disposed');
win.close();
assert(win.isDisposed(), 'window closed/disposed');
app.exit();
assert(events.length === 0, 'no events without a running app');

// Both the options and the listeners are optional
const bare = new Application();
const bareWindow = bare.createBrowserWindow();
bareWindow.close();
bare.exit();

console.log('ok');
