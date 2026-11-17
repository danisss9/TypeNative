// cluster with SCHED_NONE: workers bind the port themselves (the OS balances,
// the socket options let several workers hold it), exclusive: true listeners
// bind directly, and dgram sockets work in workers
import assert from 'node:assert';
import cluster from 'node:cluster';
import * as net from 'node:net';
import * as dgram from 'node:dgram';

const mode = process.env.TN_ROLE ?? '';

// the policy applies in every process: with SCHED_NONE a worker binds the
// port itself instead of asking the primary to relay
cluster.schedulingPolicy = cluster.SCHED_NONE;

if (mode === 'sched') {
  // three workers bind the same fixed TCP port; each also binds a reuseAddr
  // UDP socket on a second fixed port
  const srv = net.createServer((c) => {
    c.end(`w${cluster.worker!.id}`);
  });
  srv.listen(24701, '127.0.0.1', () => process.send!({ ready: true }));
  const udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  udp.on('message', (m: any, rinfo: any) => {
    udp.send(Buffer.concat([m, Buffer.from(`-w${cluster.worker!.id}`)]), rinfo.port, rinfo.address);
  });
  udp.bind(24702, '127.0.0.1', () => process.send!({ udp: true }));
  // the cluster closes the servers on disconnect; the dgram socket is ours
  process.on('disconnect', () => {
    try {
      process.send!({ sawDisconnect: true });
    } catch {
      // the channel is already gone
    }
    process.exit(0);
  });
} else if (mode === 'excl') {
  const srv = net.createServer((c) => c.end('x'));
  srv.listen({ port: 0, host: '127.0.0.1', exclusive: true }, () => {
    process.send!({ exclusivePort: (srv.address() as any).port });
  });
} else {
  assert(cluster.isPrimary, 'the primary');
  assert(cluster.schedulingPolicy === cluster.SCHED_NONE, 'the policy is set');
  const log: string[] = [];
  const ports = new Set<number>();
  let ready = 0;
  let udpBound = 0;
  let udpGot = 0;
  let exclusivePort = 0;

  // (defined before use: the transpiler does not forward-reference closures)
  const wrapUp = () => {
    assert(ready === 3 && udpBound === 3, `workers report ready/udp ${ready}/${udpBound}`);
    assert(ports.has(24701), 'the shared port shows up in the primary\'s listening event');
    assert(log.some((x) => x.startsWith('tcp:') && /w\d+/.test(x)), `the shared port is served by workers: ${log.join(',')}`);
    assert(log.includes('excl-served'), `the exclusive listener was served: ${log.join(',')}`);
    assert(log.some((x) => x.startsWith('udp:') && /-w\d+$/.test(x)), `a worker's dgram socket answered: ${log.join(',')}`);
    cluster.disconnect(() => {
      console.log('cluster none ok');
      process.exit(0);
    });
  };
  const finish = () => {
    if (log.some((x) => x.startsWith('udp:'))) {
      wrapUp();
    }
  };
  const probeUDP = () => {
    // the reuseAddr dgram sockets in the workers all hold the port; at
    // least one of them answers
    const sock = dgram.createSocket('udp4');
    sock.on('message', (m: any) => {
      log.push(`udp:${String(m)}`);
      finish();
    });
    sock.bind(0, '127.0.0.1', () => {
      sock.send(Buffer.from('ping'), 24702, '127.0.0.1');
    });
    setTimeout(finish, 2000);
  };
  const probeTCP = () => {
    // connections to the shared port are served by workers
    let served = 0;
    const tryConn = () => {
      const s = net.connect(24701, '127.0.0.1', () => {
        let data = '';
        s.on('data', (d: any) => (data += String(d)));
        s.on('close', () => {
          log.push(`tcp:${data}`);
          served++;
          if (served < 4) {
            setTimeout(tryConn, 60);
          } else {
            probeUDP();
          }
        });
      });
      s.on('error', (e: any) => {
        log.push(`tcp-err:${e.code}`);
        served++;
        if (served < 4) {
          setTimeout(tryConn, 60);
        } else {
          probeUDP();
        }
      });
    };
    setTimeout(tryConn, 100);
  };
  const done = () => {
    if (exclusivePort === 0) {
      return;
    }
    // the exclusive listener binds directly: its own port, served
    const s = net.connect(exclusivePort, '127.0.0.1', () => {
      s.on('data', () => {
        log.push('excl-served');
        s.end();
        probeTCP();
      });
    });
    s.on('error', (e: any) => {
      log.push(`excl-err:${e.code}`);
      probeTCP();
    });
  };

  cluster.on('listening', (w, addr) => {
    ports.add(Number((addr as any).port));
  });
  cluster.on('message', (w, msg: any) => {
    if (msg.sawDisconnect) {
      log.push(`dis-w${w.id}`);
      return;
    }
    if (msg.ready) ready++;
    if (msg.udp) udpBound++;
    if (msg.udpGot) udpGot++;
    if (msg.exclusivePort) {
      exclusivePort = msg.exclusivePort;
      done();
    }
  });
  for (let i = 0; i < 3; i++) cluster.fork({ TN_ROLE: 'sched' });
  cluster.fork({ TN_ROLE: 'excl' });
  setTimeout(() => {
    console.error(`TIMEOUT ready=${ready} udp=${udpBound} log=${log.join(',')}`);
    process.exit(1);
  }, 15000);
}
