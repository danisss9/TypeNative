import { Blob, File } from 'node:buffer';

async function main(): Promise<void> {
  const blob = new Blob(['hello ', Buffer.from('world')], { type: 'Text/Plain' });
  console.log('size', blob.size, 'type', blob.type);
  assert(blob.size === 11 && blob.type === 'text/plain', 'size / type');
  assert((await blob.text()) === 'hello world', 'text()');
  const bytes = await blob.bytes();
  assert(bytes.length === 11 && bytes[0] === 104, 'bytes()');
  const part = blob.slice(-5, undefined, 'text/x-part');
  assert((await part.text()) === 'world' && part.type === 'text/x-part', 'slice');
  assert((await blob.slice(0, 5).text()) === 'hello', 'slice(start, end)');

  // stream()
  const chunks: string[] = [];
  for await (const chunk of blob.stream()) chunks.push(Buffer.from(chunk).toString());
  assert(chunks.join('') === 'hello world', 'stream()');

  // Blobs of Blobs; File
  const nested = new Blob([blob, '!']);
  assert((await nested.text()) === 'hello world!', 'nested blob');
  const file = new File(['abc'], 'notes.txt', { type: 'text/plain', lastModified: 42 });
  console.log('file', file.name, file.size, file.lastModified);
  assert(file.name === 'notes.txt' && file.lastModified === 42 && file.size === 3, 'File');
  assert(new Blob().size === 0, 'empty blob');

  // FormData
  const form = new FormData();
  form.append('name', 'Ada');
  form.append('tag', 'a');
  form.append('tag', 'b');
  form.append('upload', file);
  form.append('blob', new Blob(['xyz']));
  assert(form.get('name') === 'Ada' && form.getAll('tag').length === 2, 'get / getAll');
  assert(form.has('upload') && !form.has('missing') && form.get('missing') === null, 'has / missing');
  form.set('tag', 'c');
  assert(form.getAll('tag').length === 1 && form.get('tag') === 'c', 'set replaces');
  form.delete('name');
  const keys: string[] = [];
  for (const [key] of form) keys.push(key);
  console.log('keys', keys.join(','));
  assert(keys.join(',') === 'tag,upload,blob', 'iteration order');
  const uploaded = form.get('blob') as File;
  assert(uploaded.name === 'blob' && (await uploaded.text()) === 'xyz', 'blobs become files');

  // Bodies: Response round trips through Blob and FormData
  const response = new Response(form);
  const contentType = response.headers.get('content-type') ?? '';
  assert(contentType.startsWith('multipart/form-data; boundary='), 'multipart content type');
  const parsed = await response.formData();
  const parsedFile = parsed.get('upload') as File;
  console.log('parsed', parsed.get('tag'), parsedFile.name, await parsedFile.text());
  assert(parsed.get('tag') === 'c' && parsedFile.name === 'notes.txt', 'formData() parses multipart');
  const blobBody = await new Response(blob).blob();
  assert(blobBody.type === 'text/plain' && (await blobBody.text()) === 'hello world', 'blob() keeps the type');
  const urlencoded = await new Response('a=1&b=two+words', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' }
  }).formData();
  assert(urlencoded.get('b') === 'two words', 'urlencoded formData()');
}

main();
