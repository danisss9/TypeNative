// A desktop notes app: a local web server plus a browser app window, editing
// plain Markdown files in a folder on disk. The UI (./ui.ts) is compiled into
// the binary, so the result is one small executable that opens a window: no
// Electron, no Node runtime, no files next to it.
//
//   node main.ts [--dir <folder>] [--port N] [--no-open]
//   ./notes [--dir <folder>] [--port N] [--no-open]
//
// Notes live in ~/Notes by default. The window is Edge or Chrome in --app mode
// (no tabs or address bar), and the app quits a few seconds after it closes.
// With --no-open it only serves http://127.0.0.1:<port> and runs until stopped.
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

// Quit when the window is gone: right after it says goodbye (unless a reload
// reconnects within 3 s), or when it stops polling for 90 s. Hidden windows
// can be throttled to one timer per minute, hence the long backstop.
let lastSeen = Date.now();
let byeAt = 0;

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
      lastSeen = Date.now();
      byeAt = 0;
      const info = { dir: dir, runtime: path.basename(process.execPath), rss: process.memoryUsage().rss };
      send(res, 200, 'application/json', JSON.stringify(info));
    } else if (url === '/api/notes') {
      send(res, 200, 'application/json', JSON.stringify(listNotes()));
    } else if (url === '/api/bye' && method === 'POST') {
      byeAt = Date.now();
      send(res, 204, 'text/plain', '');
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

function openAppWindow(url: string): void {
  let command = 'xdg-open';
  let commandArgs = [url];
  if (process.platform === 'win32') {
    // `start` finds msedge through the App Paths registry, even off PATH
    command = 'cmd';
    commandArgs = ['/c', 'start', '', 'msedge', `--app=${url}`];
  } else if (process.platform === 'darwin') {
    command = 'open';
    commandArgs = ['-na', 'Google Chrome', '--args', `--app=${url}`];
  }
  const child = spawn(command, commandArgs, { detached: true, stdio: 'ignore' });
  child.on('error', () => console.log(`Open ${url} in a browser`));
  child.on('exit', (code) => {
    // No Chrome on macOS: fall back to the default browser
    if (code !== 0 && process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  });
  child.unref();
}

server.listen(port, '127.0.0.1', () => {
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/`;
  console.log(`Notes in ${dir} on ${url}`);
  if (!openWindow) return;
  openAppWindow(url);
  setInterval(() => {
    const now = Date.now();
    if ((byeAt > 0 && now - byeAt > 3000) || now - lastSeen > 90000) {
      console.log('Window closed, exiting');
      process.exit(0);
    }
  }, 1000);
});
