import http from 'node:http';
import type { AddressInfo } from 'node:net';

const server = http.createServer((req, res) => {
  if (req.url === '/redirect') {
    res.writeHead(302, { Location: '/json' });
    res.end();
    return;
  }
  if (req.url === '/json') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ hello: 'world', n: 3 }));
    return;
  }
  if (req.url === '/slow') {
    setTimeout(() => res.end('late'), 500);
    return;
  }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    res.setHeader('X-Method', req.method ?? '');
    res.end(`${req.headers['content-type']}|${req.headers['x-token']}|${body}`);
  });
});

// Headers
const h = new Headers({ 'Content-Type': 'text/plain' });
h.append('X-A', '1');
h.append('x-a', '2');
assert(h.get('content-type') === 'text/plain' && h.get('X-A') === '1, 2' && h.get('missing') === null, 'Headers.get');
h.delete('x-a');
assert(!h.has('x-a') && h.has('Content-Type'), 'Headers.has / delete');
const names: string[] = [];
for (const [name, value] of h) names.push(`${name}=${value}`);
assert(names.join(',') === 'content-type=text/plain', 'for...of Headers');

// Response built by hand
const made = Response.json({ ok: true }, { status: 201 });
assert(made.status === 201 && made.ok && made.headers.get('content-type') === 'application/json', 'Response.json');

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const res = await fetch(`${base}/json`);
  assert(res.status === 200 && res.ok && res.statusText === 'OK', 'status');
  const data = await res.json();
  console.log('json:', data.hello, data.n);
  assert(data.hello === 'world' && data.n === 3, 'json()');
  assert(res.bodyUsed, 'bodyUsed');

  const posted = await fetch(`${base}/echo`, {
    method: 'POST',
    headers: { 'X-Token': 'abc' },
    body: 'payload'
  });
  const text = await posted.text();
  console.log('echo:', text, posted.headers.get('x-method'));
  assert(text === 'text/plain;charset=UTF-8|abc|payload' && posted.headers.get('x-method') === 'POST', 'POST body');

  const redirected = await fetch(`${base}/redirect`);
  assert(redirected.redirected && redirected.url === `${base}/json`, 'follows redirects');
  const manual = await fetch(`${base}/redirect`, { redirect: 'manual' });
  assert(manual.status === 302 && manual.headers.get('location') === '/json', 'redirect: manual');

  const controller = new AbortController();
  setTimeout(() => controller.abort(), 50);
  try {
    await fetch(`${base}/slow`, { signal: controller.signal });
    assert(false, 'aborted fetch resolves');
  } catch (err: any) {
    console.log('abort:', err.name);
    assert(err.name === 'AbortError', 'AbortError');
  }

  await made.text();
  // A port nothing listens on any more
  const freedPort = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    await fetch(`http://127.0.0.1:${freedPort}/`);
    assert(false, 'refused fetch resolves');
  } catch (err: any) {
    console.log(err.name, err.message, err.cause.code);
    assert(err.name === 'TypeError' && err.message === 'fetch failed' && err.cause.code === 'ECONNREFUSED', 'fetch failed');
  }
});
