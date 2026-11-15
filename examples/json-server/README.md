# JSON Server

A tiny JSON API for managing todos, built with nothing but the Node standard
library — `node:http`, `JSON`, and `URL`. The todos live in memory, so the
same file is a complete, dependency-free web server under Node.js and as a
compiled TypeNative binary.

## The code

```ts
// main.ts (abridged — see main.ts for the full server)
import http from 'node:http';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const todos: Todo[] = [];
let nextId = 1;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += String(chunk); });
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/todos') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(todos));
    } else if (req.method === 'POST' && url.pathname === '/todos') {
      const input = JSON.parse(body) as { title: string };
      // ... validate, create, respond 201 ...
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no route' }));
    }
  });
});

server.listen(3000, '127.0.0.1');
```

## Routes

| Route           | Method | Description                                  |
|-----------------|--------|----------------------------------------------|
| `/todos`        | GET    | List all todos                               |
| `/todos/<id>`   | GET    | Fetch one todo (404 if missing)              |
| `/todos`        | POST   | Create a todo: `{ "title": "..." }` → 201    |
| anything else   | *      | `404` with a JSON error                      |

A missing `title` returns `400` with a JSON error. (The example keeps
`JSON.parse` unguarded, so invalid JSON throws — under Node and the compiled
binary alike, an uncaught throw ends the process.)

## Run it

With Node.js:

```sh
node main.ts            # listens on http://127.0.0.1:3000
```

With TypeNative (compile to a single self-contained binary — no Node
required on the machine that runs it):

```sh
npx typenative --source main.ts --output dist/server.exe
./dist/server.exe            # optional port argument or PORT env var
```

From a checkout of this repository, use the local CLI instead of `npx`:

```sh
node bin/cli.js --source examples/json-server/main.ts --script
node bin/cli.js --source examples/json-server/main.ts --output dist/server.exe
```

Try it:

```sh
curl -s http://127.0.0.1:3000/todos                                  # []
curl -s -X POST -d '{"title":"write examples"}' \
     http://127.0.0.1:3000/todos                                     # {"id":1,...}
curl -s http://127.0.0.1:3000/todos/1                                # one todo
curl -s -w "%{http_code}" -X POST -d '{}' http://127.0.0.1:3000/todos # 400
```

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [gets=20000] [posts=10000]`. The script
compiles `main.ts` with the TypeNative CLI, starts the server under each
runtime, seeds 50 todos, and drives load over keep-alive connections at
concurrency 16 (identical client for both). It measures requests/second plus
p50/p99 latency per request for `GET /todos` (20,000 requests, ~50-item JSON
response) and `POST /todos` (10,000 requests).

The load generator is built to stay out of the way, like `wrk` or
`autocannon`: 8 worker threads × 2 raw keep-alive sockets send prebuilt
request bytes and read each response just far enough to find its end. A
plain `node:http` client would cap out far below either server, so
with it both servers would simply tie at the client's limit.

**Environment:** Windows 11 Pro, AMD Ryzen 5 7600, Node v26.13.0, Go 1.27.4,
TypeNative 0.6.1, default (non-`--release`) build, client
and server on the same machine. Re-run variation is about ±20%; across runs
TypeNative was 1.6–1.8x Node on GET and 1.6–1.8x on POST. The numbers below are
medians over three runs.

| Runtime    | Endpoint    |  req/s | p50 (ms) | p99 (ms) |
|------------|-------------|-------:|---------:|---------:|
| Node.js    | GET /todos  |  61957 |     0.23 |     0.63 |
| TypeNative | GET /todos  | 106483 |     0.14 |     0.38 |
| Node.js    | POST /todos |  68097 |     0.21 |     0.46 |
| TypeNative | POST /todos | 114066 |     0.13 |     0.40 |

**TypeNative serves ~1.7x more requests per second here**, with lower median
latency on both routes. The compiled server reads requests and writes
responses on each connection's goroutine, and a handler that answers
synchronously (`writeHead` + `end`, as both routes do) builds the response
bytes right there, in one write: it never queues an operation for the event
loop, which keeps the per-request hand-off to JavaScript to a single baton
pass. JavaScript still runs one thing at a time, but at 105–115k req/s the
parallel socket I/O and HTTP handling stay ahead of that one thread.

On top of that, the binary starts in ~7 ms instead of ~60 ms and is a
single 11.4 MB executable with zero dependencies — `scp` it to a server and
run it, no Node install, no `node_modules` — and CPU-heavy work inside a
handler runs ~2x faster (see the [fibonacci example](../fibonacci/README.md)).
