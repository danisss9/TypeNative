// globals.WebSocket: the WHATWG client — the handshake, subprotocol selection,
// text and binary echoes (Blob, then ArrayBuffer via binaryType), a ping
// answered with a pong, bufferedAmount, the close handshake (client-initiated
// with a code and without), a server-initiated close, and the failed
// handshakes (rejected, wrong accept, unrequested subprotocol)
import * as http from 'node:http';
import * as crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Socket } from 'node:net';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// An unmasked server frame
function serverFrame(opcode: number, payload: Buffer): Buffer {
  const header: number[] = [0x80 | opcode];
  if (payload.length < 126) header.push(payload.length);
  else header.push(126, payload.length >> 8, payload.length & 0xff);
  return Buffer.concat([Buffer.from(header), payload]);
}

// The first complete (masked client) frame in buf, null while it is partial
function parseFrame(buf: Buffer): { opcode: number; payload: Buffer; rest: Buffer } | null {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2);
    off = 4;
  }
  if (masked) {
    if (buf.length < off + 4) return null;
    off += 4;
  }
  if (buf.length < off + len) return null;
  const payload = Buffer.from(buf.subarray(off, off + len));
  if (masked) http.websocketUnmask(payload, buf.subarray(off - 4, off));
  return { opcode, payload, rest: buf.subarray(off + len) };
}

let pongs = 0;
let pinged = false;
const sockets: Record<string, Socket> = {};

function acceptOf(req: http.IncomingMessage): string {
  return crypto.createHash('sha1').update(String(req.headers['sec-websocket-key']) + GUID).digest('base64');
}

const server = http.createServer((_req, res) => res.end());

server.on('upgrade', (req: http.IncomingMessage, socket: Socket, _head: Buffer) => {
  const url = req.url ?? '';
  if (url === '/reject') {
    socket.write('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n');
    socket.end();
    return;
  }
  if (url === '/badaccept' || url === '/protomismatch') {
    // A bad Sec-WebSocket-Accept, and an unrequested subprotocol
    const extra = url === '/protomismatch' ? 'Sec-WebSocket-Protocol: nope\r\n' : '';
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: not-the-accept\r\n' + extra + '\r\n');
    return;
  }
  const requested = String(req.headers['sec-websocket-protocol'] ?? '');
  const proto = requested.split(',')[0].trim();
  const protoLine = proto !== '' ? 'Sec-WebSocket-Protocol: ' + proto + '\r\n' : '';
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acceptOf(req) + '\r\n' + protoLine + '\r\n');
  sockets[url] = socket;
  if (url === '/') {
    // The first connection gets a ping; the client must answer with a pong
    if (!pinged) {
      pinged = true;
      setTimeout(() => socket.write(serverFrame(9, Buffer.from('hi'))), 20);
    }
  } else if (url === '/serverclose') {
    setTimeout(() => {
      const code = Buffer.alloc(2);
      code.writeUInt16BE(3001, 0);
      socket.write(serverFrame(8, Buffer.concat([code, Buffer.from('server bye')])));
    }, 30);
    // Consume the client's close echo (a paused socket would buffer it)
    socket.on('data', () => {});
    return;
  }
  let buf = Buffer.alloc(0);
  socket.on('data', (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const frame = parseFrame(buf);
      if (frame === null) break;
      buf = frame.rest;
      if (frame.opcode === 1 || frame.opcode === 2) socket.write(serverFrame(frame.opcode, frame.payload));
      else if (frame.opcode === 8) {
        socket.write(serverFrame(8, frame.payload));
        socket.end();
      } else if (frame.opcode === 10) pongs++;
    }
  });
});

assert(WebSocket.CONNECTING === 0 && WebSocket.OPEN === 1 && WebSocket.CLOSING === 2 && WebSocket.CLOSED === 3, 'state constants');

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as AddressInfo).port;

  // 1: the happy path — subprotocols, echoes, blob, ping/pong, close(1000, 'bye')
  const ws = new WebSocket(`ws://127.0.0.1:${port}`, ['chat', 'extra']);
  assert(ws.readyState === WebSocket.CONNECTING && ws.url === `ws://127.0.0.1:${port}/`, 'starts connecting');
  assert(ws.protocol === '' && ws.extensions === '' && ws.bufferedAmount === 0 && ws.binaryType === 'blob', 'pre-open fields');
  let sendThrow: any = null;
  try {
    ws.send('too soon');
  } catch (e: any) {
    sendThrow = e;
  }
  assert(sendThrow !== null && sendThrow.name === 'InvalidStateError', 'send while connecting throws InvalidStateError');
  let codeThrow: any = null;
  try {
    ws.close(999);
  } catch (e: any) {
    codeThrow = e;
  }
  assert(codeThrow !== null && codeThrow.name === 'InvalidAccessError', 'invalid close code');
  let reasonThrow: any = null;
  try {
    ws.close(1000, 'r'.repeat(124));
  } catch (e: any) {
    reasonThrow = e;
  }
  assert(reasonThrow !== null && reasonThrow.name === 'SyntaxError', 'close reason too long');
  assert(ws.readyState === WebSocket.CONNECTING, 'still connecting after the throws');

  let messages = 0;
  ws.addEventListener('open', () => {
    assert(ws.readyState === WebSocket.OPEN && ws.protocol === 'chat', 'open: negotiated chat');
    ws.send('hello ws');
    ws.send(new Uint8Array([1, 2, 3]));
    setTimeout(() => {
      assert(ws.bufferedAmount === 0, 'writes drained');
      ws.close(1000, 'bye');
      assert(ws.readyState === WebSocket.CLOSING, 'closing after close()');
      ws.close(1000, 'again');
    }, 30);
  });
  ws.addEventListener('message', (ev: MessageEvent) => {
    messages++;
    if (messages === 1) {
      assert(typeof ev.data === 'string' && ev.data === 'hello ws', 'text echo');
      assert(ev.origin === `ws://127.0.0.1:${port}`, 'origin');
    } else if (messages === 2) {
      assert(ev.data instanceof Blob && (ev.data as Blob).size === 3, 'binary arrives as Blob');
      ws.binaryType = 'arraybuffer';
      ws.send(new Uint8Array([9, 8, 7]));
    } else if (messages === 3) {
      const ab = ev.data as ArrayBuffer;
      assert(!(ev.data instanceof Blob) && ab.byteLength === 3, 'binary arrives as ArrayBuffer');
    }
  });
  ws.addEventListener('close', (ev: CloseEvent) => {
    assert(ws.readyState === WebSocket.CLOSED, 'closed');
    assert(ev.code === 1000 && ev.reason === 'bye' && ev.wasClean === true, 'clean close with code and reason');
    assert(messages === 3 && pongs === 1, 'three echoes and the ping answered');
    // A send after close is a silent no-op, and close() again does nothing
    ws.send('ignored');
    ws.close(1000, 'again');
    assert(ws.readyState === WebSocket.CLOSED, 'stays closed');

    // 2: close() without a code is 1005; the on* property handlers
    const ws2 = new WebSocket(`ws://127.0.0.1:${port}`);
    ws2.onopen = () => {
      assert(ws2.readyState === WebSocket.OPEN, 'ws2 open');
      ws2.close();
    };
    ws2.onmessage = (ev: MessageEvent) => {
      assert(false, 'ws2 gets no messages');
    };
    ws2.onclose = (ev: CloseEvent) => {
      assert(ev.code === 1005 && ev.reason === '' && ev.wasClean === true, 'close() without a code is 1005');
      ws2.onmessage = null;
      step3();
    };
    ws2.onerror = (ev: ErrorEvent) => {
      assert(false, 'ws2 no error');
    };
  });

  function step3() {
    // 3: the server closes first
    const ws3 = new WebSocket(`ws://127.0.0.1:${port}/serverclose`);
    ws3.onclose = (ev: CloseEvent) => {
      assert(ev.code === 3001 && ev.reason === 'server bye' && ev.wasClean === true, 'server-initiated close');
      step4();
    };
  }

  function step4() {
    // 4: a rejected handshake (403)
    const ws4 = new WebSocket(`ws://127.0.0.1:${port}/reject`);
    let errors = 0;
    ws4.addEventListener('open', () => {
      assert(false, 'reject: no open');
    });
    ws4.addEventListener('error', (ev: ErrorEvent) => {
      errors++;
      assert(ev.message === '', 'no message on a failed handshake');
    });
    ws4.addEventListener('close', (ev: CloseEvent) => {
      assert(errors === 1 && ev.code === 1006 && ev.wasClean === false, 'rejected handshake: error, then 1006');
      assert(ws4.readyState === WebSocket.CLOSED, 'reject: closed');
      step5();
    });
  }

  function step5() {
    // 5: a wrong Sec-WebSocket-Accept
    const ws5 = new WebSocket(`ws://127.0.0.1:${port}/badaccept`);
    let errors = 0;
    ws5.addEventListener('error', () => errors++);
    ws5.addEventListener('close', (ev: CloseEvent) => {
      assert(errors === 1 && ev.code === 1006 && ev.wasClean === false, 'bad accept: error, then 1006');
      step6();
    });
  }

  function step6() {
    // 6: the server selects an unrequested subprotocol
    const ws6 = new WebSocket(`ws://127.0.0.1:${port}/protomismatch`, ['chat']);
    let errors = 0;
    ws6.addEventListener('error', () => errors++);
    ws6.addEventListener('close', (ev: CloseEvent) => {
      assert(errors === 1 && ev.code === 1006 && ev.wasClean === false, 'subprotocol mismatch: error, then 1006');
      step7();
    });
  }

  function step7() {
    // 7: close() while connecting discards the handshake
    const ws7 = new WebSocket(`ws://127.0.0.1:${port}`);
    let opened = false;
    ws7.addEventListener('open', () => {
      opened = true;
    });
    ws7.addEventListener('close', (ev: CloseEvent) => {
      assert(!opened && ev.code === 1006 && ev.wasClean === false, 'close() while connecting: 1006, never opened');
      server.close();
    });
    ws7.close();
  }
});
