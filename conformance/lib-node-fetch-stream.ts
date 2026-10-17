import http from 'node:http';

const server = http.createServer((req, res) => {
  if (req.url === '/stream') {
    // Three chunks with pauses in between
    res.writeHead(200, { 'content-type': 'text/plain' });
    let i = 0;
    const tick = () => {
      i++;
      res.write(`part${i};`);
      if (i < 3) setTimeout(tick, 20);
      else res.end();
    };
    tick();
    return;
  }
  // Echo the request body with its content type
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    res.writeHead(200, { 'content-type': 'text/plain', 'x-request-type': String(req.headers['content-type'] ?? '') });
    res.end(Buffer.concat(chunks));
  });
});

server.listen(0, '127.0.0.1', async () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}`;
  try {
    // Response body as a ReadableStream
    const response = await fetch(`${base}/stream`);
    assert(response.body !== null && !response.bodyUsed, 'body stream before reading');
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let reads = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      reads++;
      text += decoder.decode(value);
    }
    console.log('streamed:', text, reads >= 1);
    assert(text === 'part1;part2;part3;', 'streamed body');
    assert(response.bodyUsed, 'bodyUsed after streaming');

    // A ReadableStream request body
    const upload = ReadableStream.from([Buffer.from('chunk-a,'), Buffer.from('chunk-b')]);
    const echoed = await fetch(`${base}/echo`, { method: 'POST', body: upload, duplex: 'half' });
    const echoedText = await echoed.text();
    console.log('echoed:', echoedText);
    assert(echoedText === 'chunk-a,chunk-b', 'stream request body');

    // Blob and FormData request bodies
    const blobEcho = await fetch(`${base}/echo`, { method: 'POST', body: new Blob(['{"a":1}'], { type: 'application/json' }) });
    assert(blobEcho.headers.get('x-request-type') === 'application/json', 'blob content type');
    assert((await blobEcho.json()).a === 1, 'blob body');
    const form = new FormData();
    form.append('field', 'value');
    const formEcho = await fetch(`${base}/echo`, { method: 'POST', body: form });
    const formType = formEcho.headers.get('x-request-type') ?? '';
    const formText = await formEcho.text();
    assert(formType.startsWith('multipart/form-data; boundary='), 'form content type');
    assert(formText.includes('name="field"') && formText.includes('value'), 'form body');

    // Response.clone() of a streamed body: both copies read it
    const original = await fetch(`${base}/stream`);
    const copy = original.clone();
    const [first, second] = await Promise.all([original.text(), copy.text()]);
    assert(first === second && first === 'part1;part2;part3;', 'clone tees the body');

    // Bodies of constructed responses
    assert(new Response(null).body === null, 'no body');
    const piped = new Response(ReadableStream.from(['x', 'y']).pipeThrough(new TextEncoderStream()));
    assert((await piped.text()) === 'xy', 'Response from a ReadableStream');
    console.log('done');
  } finally {
    server.close();
  }
});
