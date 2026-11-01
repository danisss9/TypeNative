// A real window, set TN_WEBVIEW_SMOKE=1 to run it (CI has no display): the page
// calls the program's own server, the program closes the window and the app ends.
// The window's whole lifecycle, on the same paths desktop apps use.
import http from 'node:http';
import { Application } from '@webviewjs/webview';

if (process.env.TN_WEBVIEW_SMOKE !== '1') process.exit(0);

const events: string[] = [];
const page = `<!doctype html><title>Smoke</title><script>fetch('/loaded')</script>`;
const app = new Application();
let closing = false;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(page);
  if (req.url === '/loaded' && !closing) {
    closing = true;
    win.close();
  }
});

const win = app.createBrowserWindow({ title: 'Smoke', width: 320, height: 240 });
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

// A close from the program skips the 'close' a user's click would emit
process.on('exit', () => {
  assert(events.join() === 'application-close-requested', `events: ${events.join()}`);
});
setTimeout(() => {
  console.error('the window never reported back');
  process.exit(1);
}, 30000).unref();
