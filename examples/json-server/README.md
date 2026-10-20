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

Invalid JSON or a missing `title` returns `400` with a JSON error.

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
concurrency 16 with a Node.js `node:http` client (identical client for both).
It measures requests/second plus p50/p99 latency per request for
`GET /todos` (20,000 requests, ~50-item JSON response) and `POST /todos`
(10,000 requests).

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0,
TypeNative 0.4.0, default (non-`--release`) build. Re-run variation is about
±5%.

| Runtime    | Endpoint    | req/s | p50 (ms) | p99 (ms) |
|------------|-------------|-------:|---------:|---------:|
| Node.js    | GET /todos  |  7709 |     1.87 |     6.05 |
| TypeNative | GET /todos  |  4834 |     3.08 |     6.60 |
| Node.js    | POST /todos |  9244 |     1.57 |     3.97 |
| TypeNative | POST /todos |  6141 |     2.46 |     4.55 |

**Node.js serves ~1.5x more requests per second** on this workload. That is
the honest result, and it is worth understanding: V8 and Node's `node:http`
have been tuned for exactly this I/O-bound pattern for over a decade, while
TypeNative re-implements the request lifecycle (event emission, stream
callbacks, per-request closures) on top of Go's `net/http`, and that
translation still has overhead. Tail latency (p99) is comparable for both.

Where the compiled binary wins is everything *around* the steady-state loop:
it starts in ~15 ms instead of ~100 ms, it is a single 9.7 MB executable with
zero dependencies — `scp` it to a server and run it, no Node install, no
`node_modules` — and CPU-heavy work inside a handler runs ~2x faster (see the
[fibonacci example](../fibonacci/README.md)).

Takeaway: for I/O-bound HTTP services Node remains the throughput king today;
choose TypeNative when startup time, deployment simplicity, or CPU-bound
handler work dominates.
