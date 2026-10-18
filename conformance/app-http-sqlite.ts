// Sample app: a JSON API over HTTP backed by node:sqlite. The server stores
// notes; the client creates, lists and deletes them with fetch.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';

interface Note {
  id: number;
  title: string;
  done: boolean;
}

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)');
const insert = db.prepare('INSERT INTO notes (title) VALUES (?)');
const list = db.prepare('SELECT id, title, done FROM notes ORDER BY id');
const remove = db.prepare('DELETE FROM notes WHERE id = ?');

function allNotes(): Note[] {
  return list.all().map((row: any) => ({ id: row.id as number, title: row.title as string, done: row.done === 1 }));
}

function send(res: http.ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += String(chunk);
  });
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/notes') {
      send(res, 200, JSON.stringify(allNotes()));
    } else if (req.method === 'POST' && url.pathname === '/notes') {
      const input = JSON.parse(body) as { title: string };
      if (!input.title) {
        send(res, 400, JSON.stringify({ error: 'title is required' }));
        return;
      }
      const result = insert.run(input.title);
      send(res, 201, JSON.stringify({ id: Number(result.lastInsertRowid), title: input.title, done: false }));
    } else if (req.method === 'DELETE' && url.pathname.startsWith('/notes/')) {
      const changes = remove.run(Number(url.pathname.slice('/notes/'.length))).changes;
      send(res, changes === 1 ? 204 : 404, changes === 1 ? '' : JSON.stringify({ error: 'not found' }));
    } else {
      send(res, 404, JSON.stringify({ error: 'no route' }));
    }
  });
});

async function main() {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;

  const created = await fetch(`${base}/notes`, { method: 'POST', body: JSON.stringify({ title: 'write probes' }) });
  assert(created.status === 201, 'POST creates');
  const note = (await created.json()) as Note;
  assert(note.id === 1 && note.title === 'write probes', 'created note');
  await fetch(`${base}/notes`, { method: 'POST', body: JSON.stringify({ title: 'ship 0.4' }) });

  const rejected = await fetch(`${base}/notes`, { method: 'POST', body: JSON.stringify({ title: '' }) });
  assert(rejected.status === 400, 'validation error');

  const listed = (await (await fetch(`${base}/notes`)).json()) as Note[];
  assert(listed.length === 2 && listed[1].title === 'ship 0.4' && listed[0].done === false, 'GET lists notes');

  const deleted = await fetch(`${base}/notes/1`, { method: 'DELETE' });
  const missing = await fetch(`${base}/notes/99`, { method: 'DELETE' });
  assert(deleted.status === 204 && missing.status === 404, 'DELETE');
  assert(allNotes().length === 1, 'the database reflects the API calls');

  const unknown = await fetch(`${base}/nothing`);
  assert(unknown.status === 404 && ((await unknown.json()) as { error: string }).error === 'no route', 'unknown route');

  server.close();
  db.close();
}
main();
