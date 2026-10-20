// A tiny JSON API built with nothing but the Node standard library
// (node:http). The todos live in memory, so the same file is a complete,
// dependency-free web server under Node.js and as a compiled TypeNative
// binary.
//
// Routes:
//   GET  /todos         list all todos
//   GET  /todos/<id>    fetch one todo (404 if missing)
//   POST /todos         create a todo from a JSON body: { "title": "..." }
//
//   node main.ts [port]     (default 3000; PORT env var also honored)
//   ./server [port]
import http from 'node:http';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const todos: Todo[] = [];
let nextId = 1;

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

    if (req.method === 'GET' && url.pathname === '/todos') {
      send(res, 200, JSON.stringify(todos));
    } else if (req.method === 'GET' && url.pathname.startsWith('/todos/')) {
      const id = Number(url.pathname.slice('/todos/'.length));
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        send(res, 200, JSON.stringify(todo));
      } else {
        send(res, 404, JSON.stringify({ error: 'todo not found' }));
      }
    } else if (req.method === 'POST' && url.pathname === '/todos') {
      const input = JSON.parse(body) as { title: string };
      if (!input.title) {
        send(res, 400, JSON.stringify({ error: 'title is required' }));
        return;
      }
      const todo: Todo = { id: nextId, title: input.title, done: false };
      nextId += 1;
      todos.push(todo);
      send(res, 201, JSON.stringify(todo));
    } else {
      send(res, 404, JSON.stringify({ error: 'no route' }));
    }
  });
});

const port = Number(process.argv[2] ?? process.env.PORT ?? '3000');
server.listen(port, '127.0.0.1', () => {
  const address = server.address() as { port: number };
  console.log(`Todo API listening on http://127.0.0.1:${address.port}`);
});
