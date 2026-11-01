// The @webviewjs/webview API without opening a window: every class, option and
// event a program can use, on every OS CI builds on (no display needed).
import { Application } from '@webviewjs/webview';
import type { ApplicationEvent, BrowserWindow, WebContext, Webview } from '@webviewjs/webview';

const app = new Application();
const events: string[] = [];
assert(!app.isReady(), 'not ready before run');

const context: WebContext = app.createWebContext({ dataDirectory: 'webview-data' });
const win: BrowserWindow = app.createBrowserWindow({ title: 'Probe', width: 640, height: 480, logical: true, resizable: false });
const view: Webview = win.createWebview({ html: '<p>probe</p>', enableDevtools: false, webContext: context });

// Before the window opens these only change what it will show
view.loadHtml('<p>changed</p>');
view.loadUrl('http://127.0.0.1:1/');
view.evaluateScript('1 + 1');
view.reload();
win.setTitle('Renamed');

let threw = '';
try {
  win.createWebview({ url: 'http://127.0.0.1:1/' });
} catch (err) {
  threw = (err as Error).message;
}
assert(threw === 'A window holds one webview', 'one webview per window');

function record(event: ApplicationEvent): void {
  events.push(event.event);
}
app.on('ready', record);
app.once('window-close-requested', record);
app.on('application-close-requested', record);
win.on('close', record);
win.once('close', record);

// A window that never opened closes without events, and exit stops nothing else
win.close();
app.exit();
assert(events.length === 0, 'no events without a running app');

// Both the options and the listeners are optional
const bare = new Application();
const bareWindow = bare.createBrowserWindow();
bareWindow.close();
bare.exit();

console.log('ok');
