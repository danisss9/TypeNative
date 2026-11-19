// A real window, set TN_WEBVIEW_SMOKE=1 to run it (CI has no display):
// - Under embedded WebView2: tests custom protocols, IPC (expose + onIpcMessage),
//   menus, tray icons, notifications and window controls end to end.
// - Under TYPENATIVE_WEBVIEW=browser: tests the browser app window lifecycle.
import http from 'node:http';
import { Application, FullscreenType, Notification } from '@webviewjs/webview';

if (process.env.TN_WEBVIEW_SMOKE !== '1') process.exit(0);

const events: string[] = [];
const app = new Application();
let closing = false;

if (process.env.TYPENATIVE_WEBVIEW === 'browser') {
  const page = `<!doctype html><title>Smoke</title><script>fetch('/loaded')</script>`;
  const win = app.createBrowserWindow({ title: 'Smoke', width: 320, height: 240 });
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(page);
    if (req.url === '/loaded' && !closing) {
      closing = true;
      win.close();
    }
  });
  win.on('close', () => events.push('close'));
  app.on('application-close-requested', () => {
    events.push('application-close-requested');
    server.close();
  });
  server.listen(0, '127.0.0.1', async () => {
    const address = server.address() as { port: number };
    win.createWebview({ url: `http://127.0.0.1:${address.port}/` });
    await app.whenReady();
    assert(app.isReady(), 'ready after whenReady');
  });
} else {
  // Full embedded WebView2 end-to-end verification
  app.setMenu({
    items: [
      {
        label: 'File',
        submenu: {
          items: [
            { id: 'smoke-action', label: 'Smoke Action', accelerator: 'Ctrl+S' },
            { role: 'separator' },
            { id: 'smoke-quit', label: 'Quit', role: 'quit' }
          ]
        }
      }
    ]
  });

  const tray = app.createTrayIcon({
    id: 'smoke-tray',
    tooltip: 'Smoke Tray',
    menu: { items: [{ id: 'tray-ping', label: 'Ping' }] }
  });

  const win = app.createBrowserWindow({ title: 'Smoke', width: 360, height: 260, resizable: true });
  win.on('close', () => events.push('close'));
  app.on('application-close-requested', () => {
    events.push('application-close-requested');
  });

  // Custom protocol serving both HTML and JSON
  const html = `<!doctype html><html><body><script>
    (async () => {
      const resp = await fetch('/data.json');
      const data = await resp.json();
      const sum = await window.bridge.add(20, 22);
      const greeting = await window.bridge.greet(data.who);
      window.ipc.postMessage(JSON.stringify({
        version: window.bridge.version,
        sum: sum,
        greeting: greeting
      }));
    })();
  </script></body></html>`;

  win.registerProtocol('app', (req) => {
    if (req.url.endsWith('/data.json')) {
      return new Response(JSON.stringify({ who: 'Native' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  });

  const view = win.createWebview({ url: 'app://localhost/index.html' });
  view.expose('bridge', {
    version: '1.0',
    add: (a: number, b: number) => a + b,
    greet: async (name: string) => `Hello ${name}`
  });

  let ipcPayload = '';
  view.onIpcMessage((msg) => {
    ipcPayload = msg.body.toString();
    if (!closing) {
      closing = true;
      // Exercise live window controls, tray icon and notification before closing
      win.setTitle('Smoke Updated');
      win.setSize(400, 300, false);
      win.setAlwaysOnTop(true);
      win.setAlwaysOnTop(false);
      win.setFullscreen(FullscreenType.Borderless);
      win.setFullscreen(null);
      tray.setTooltip('Smoke Tray Updated');
      tray.dispose();
      const n = new Notification('Smoke', { body: 'Done', silent: true });
      n.close();
      win.close();
    }
  });

  (async () => {
    await app.whenReady();
    assert(app.isReady(), 'ready after whenReady');
    assert(win.hasMenu(), 'window has menu');
    const perm = await Notification.requestPermission();
    assert(perm === 'granted', 'notification permission');
  })();

  process.on('exit', () => {
    assert(ipcPayload !== '', 'received IPC payload from webview');
    const parsed = JSON.parse(ipcPayload) as { version: string; sum: number; greeting: string };
    assert(parsed.version === '1.0', `expose static: ${parsed.version}`);
    assert(parsed.sum === 42, `expose sync fn: ${parsed.sum}`);
    assert(parsed.greeting === 'Hello Native', `expose async + custom protocol: ${parsed.greeting}`);
  });
}

// A close from the program skips the 'close' a user's click would emit
process.on('exit', () => {
  assert(events.join() === 'application-close-requested', `events: ${events.join()}`);
});
setTimeout(() => {
  console.error('the window never reported back');
  process.exit(1);
}, 30000).unref();
