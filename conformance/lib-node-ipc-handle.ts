// IPC handle passing: fork + send(msg, socket) both ways (serialization:
// 'advanced') — the receiving side uses the transferred socket; the sender's
// copy goes silent, as in Node
import * as net from 'node:net';
import assert from 'node:assert';
import { fork } from 'node:child_process';

if (process.argv[2] === 'child') {
  const echoPort = Number(process.argv[3]);
  const upPort = Number(process.argv[4]);
  process.on('message', (msg: any, socket: net.Socket) => {
    if (!socket) {
      if (msg.bye) process.disconnect();
      return;
    }
    const log: string[] = [];
    assert(socket.remoteAddress === '127.0.0.1' && socket.remotePort === echoPort, `down handle remote ${socket.remoteAddress}:${socket.remotePort}`);
    assert((socket.localPort ?? 0) > 0, 'down handle local port');
    assert(!socket.destroyed, 'down handle is live');
    socket.on('data', (d: any) => {
      assert(String(d) === 'echo:from-child:1', `down handle data ${String(d)}`);
      socket.end();
    });
    socket.on('end', () => log.push('end'));
    socket.on('close', () => {
      log.push('close');
      process.send!({ down: log.join(',') });
    });
    socket.write('from-child:1');
  });
  const up = net.connect(upPort, '127.0.0.1', () => {
    process.send!({ up: true }, up);
  });
  up.on('error', (e: any) => {
    console.error(`child up socket ${e.code}`);
    process.exit(1);
  });
} else {
  const seen: string[] = [];
  const mkEcho = (tag: string, onData: (c: net.Socket) => void) => {
    const srv = net.createServer((c) => {
      c.on('data', (d: any) => {
        seen.push(`${tag}:${String(d)}`);
        c.write(`echo:${String(d)}`);
        onData(c);
      });
      c.on('close', () => seen.push(`${tag}-close`));
    });
    return srv;
  };
  let aPort = 0;
  let bPort = 0;
  const srvA = mkEcho('srvA', () => {});
  const srvB = mkEcho('srvB', () => {});
  srvA.listen(0, '127.0.0.1', () => {
    aPort = (srvA.address() as net.AddressInfo).port;
    srvB.listen(0, '127.0.0.1', () => {
      bPort = (srvB.address() as net.AddressInfo).port;
      const cp = fork(process.argv[1], ['child', String(aPort), String(bPort)], { serialization: 'advanced', silent: true });
      cp.stderr!.on('data', (d: any) => process.stdout.write(String(d)));
      let upHandle: net.Socket | null = null;
      cp.on('message', (msg: any, socket: net.Socket) => {
        if (socket) {
          // the child sent a socket up: it relays to the real server
          assert(msg.up === true, 'up message');
          assert(socket.remoteAddress === '127.0.0.1' && socket.remotePort === bPort, `up handle remote ${socket.remoteAddress}:${socket.remotePort}`);
          seen.push('up-handle');
          socket.on('data', (d: any) => {
            assert(String(d) === 'echo:from-parent:1', `up handle data ${String(d)}`);
            seen.push('up-echo');
            socket.end();
          });
          socket.on('close', () => {
            seen.push('up-close');
            finish();
          });
          socket.write('from-parent:1');
          return;
        }
        if (msg.down !== undefined) {
          // the child's report on the socket the parent sent down
          assert(msg.down === 'end,close', `down socket lifecycle: ${msg.down}`);
          seen.push('down-report');
          finish();
          return;
        }
      });
      const s = net.connect(aPort, '127.0.0.1', () => {
        cp.send({ n: 1 }, s);
      });
      let copyData = '';
      s.on('data', (d: any) => (copyData += String(d)));
      s.on('error', (e: any) => {
        console.error(`parent socket ${e.code}`);
      });
      cp.on('exit', (code: number) => {
        assert(code === 0, `child exit ${code}`);
        seen.push('exit');
        finish();
      });
      void bPort;

      let done = false;
      let byed = false;
      const finish = () => {
        if (done) {
          return;
        }
        if (!byed && seen.includes('up-close') && seen.includes('down-report')) {
          byed = true;
          cp.send({ bye: true });
          return;
        }
        if (!seen.includes('up-close') || !seen.includes('down-report') || !seen.includes('exit')) {
          return;
        }
        done = true;
        // the two legs each keep their order; the sender's copy of the down
        // socket never sees the echo (it went to the child), as in Node
        const down = seen.filter((x) => x.startsWith('srvA') || x === 'down-report');
        const up = seen.filter((x) => x.startsWith('srvB') || x === 'up-handle' || x === 'up-echo' || x === 'up-close');
        assert(copyData === '', `the sender's copy got data: ${copyData}`);
        assert(down.join(',') === 'srvA:from-child:1,srvA-close,down-report', `down leg: ${down.join(',')}`);
        assert(up.join(',') === 'up-handle,srvB:from-parent:1,up-echo,srvB-close,up-close', `up leg: ${up.join(',')}`);
        assert(seen[seen.length - 1] === 'exit', `flow: ${seen.join(',')}`);
        console.log('ipc handles ok');
        process.exit(0);
      };
    });
  });
}
