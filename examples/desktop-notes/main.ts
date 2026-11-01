// A desktop notes app: a local web server plus a native webview window, editing
// plain Markdown files in a folder on disk. The UI (./ui.ts) is compiled into
// the binary, so the result is one small executable that opens a window: no
// Electron, no Node runtime, no files next to it.
//
//   node main.ts [--dir <folder>] [--port N] [--no-open]   (npm install first)
//   ./notes [--dir <folder>] [--port N] [--no-open]
//
// Notes live in ~/Notes by default. The window comes from @webviewjs/webview:
// the npm package under Node.js, TypeNative's built-in version when compiled,
// and the app quits when it closes. With --no-open it only serves
// http://127.0.0.1:<port> and runs until stopped.
import { Application } from '@webviewjs/webview';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { page } from './ui.ts';

interface NoteInfo {
  name: string;
  size: number;
  modified: number;
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dir = path.resolve(flag('--dir') ?? path.join(os.homedir(), 'Notes'));
const port = Number(flag('--port') ?? '0');
const openWindow = !process.argv.includes('--no-open');
fs.mkdirSync(dir, { recursive: true });

// Note names map straight to file names, so only allow safe characters
function noteFile(name: string): string | undefined {
  return /^[\w\- ]{1,100}$/.test(name) ? path.join(dir, `${name}.md`) : undefined;
}

function listNotes(): NoteInfo[] {
  const notes: NoteInfo[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const stat = fs.statSync(path.join(dir, file));
    notes.push({ name: file.slice(0, -3), size: stat.size, modified: stat.mtimeMs });
  }
  return notes.sort((a, b) => b.modified - a.modified);
}

function send(res: http.ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += String(chunk);
  });
  req.on('end', () => {
    const url = req.url ?? '/';
    const method = req.method ?? 'GET';
    if (url === '/') {
      send(res, 200, 'text/html; charset=utf-8', page);
    } else if (url === '/api/info') {
      const info = { dir: dir, runtime: path.basename(process.execPath), rss: process.memoryUsage().rss };
      send(res, 200, 'application/json', JSON.stringify(info));
    } else if (url === '/api/notes') {
      send(res, 200, 'application/json', JSON.stringify(listNotes()));
    } else if (url.startsWith('/api/notes/')) {
      const file = noteFile(decodeURIComponent(url.slice('/api/notes/'.length)));
      if (!file) {
        send(res, 400, 'text/plain', 'invalid note name');
      } else if (method === 'GET') {
        if (fs.existsSync(file)) send(res, 200, 'text/markdown; charset=utf-8', fs.readFileSync(file, 'utf8'));
        else send(res, 404, 'text/plain', 'no such note');
      } else if (method === 'PUT' || method === 'POST') {
        // POST too: the window's last save on close arrives as a beacon
        fs.writeFileSync(file, body);
        send(res, 204, 'text/plain', '');
      } else if (method === 'DELETE') {
        fs.rmSync(file, { force: true });
        send(res, 204, 'text/plain', '');
      } else {
        send(res, 405, 'text/plain', 'method not allowed');
      }
    } else {
      send(res, 404, 'text/plain', 'not found');
    }
  });
});

function openAppWindow(url: string, onClosed: () => void): void {
  const app = new Application();
  // The webview's profile folder: its default, beside the executable, is read-only
  // for node.exe under Program Files
  const profile = app.createWebContext({ dataDirectory: path.join(os.tmpdir(), 'desktop-notes-webview') });
  const win = app.createBrowserWindow({ title: 'Notes', width: 1000, height: 700, logical: true });
  win.createWebview({ url: url, webContext: profile });
  app.on('application-close-requested', onClosed);
  app.run();
}

// The window's last save is a beacon sent as it closes: let it arrive
function quit(): void {
  setTimeout(() => process.exit(0), 300);
}

// On Windows the npm package's event pump can hold the JS thread for as long as
// its window is idle, and the server needs that thread: under Node.js the window
// gets a process of its own, this same script run with --window <url>
const underNode = path.basename(process.execPath, '.exe') === 'node';
const windowUrl = flag('--window');

if (windowUrl) {
  openAppWindow(windowUrl, () => process.exit(0));
} else {
  server.listen(port, '127.0.0.1', () => {
    const address = server.address() as { port: number };
    const url = `http://127.0.0.1:${address.port}/`;
    console.log(`Notes in ${dir} on ${url}`);
    if (!openWindow) return;
    if (underNode) {
      spawn(process.execPath, [process.argv[1], '--window', url], { stdio: 'inherit' }).on('exit', quit);
    } else {
      openAppWindow(url, quit);
    }
  });
}
