import cluster from 'node:cluster';
import http from 'node:http';
import net from 'node:net';

// One raw HTTP request on its own connection: which worker answered
function ask(port: number): Promise<string> {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1', () => socket.write('GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n'));
    let raw = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => (raw += chunk));
    socket.on('end', () => resolve(raw.slice(raw.indexOf('\r\n\r\n') + 4)));
  });
}

if (cluster.isPrimary) {
  const events: string[] = [];
  const listening: number[] = [];
  let port = 0;
  let greetings = 0;
  cluster.on('online', (worker) => events.push(`online:${worker.id}`));
  cluster.on('message', (worker, msg: any) => {
    assert(msg.hello === worker.id, 'worker messages reach the primary');
    greetings++;
  });
  cluster.on('listening', async (worker, address) => {
    listening.push(worker.id);
    port = address.port;
    if (listening.length < 2) return;
    // Each worker answers with its id; new connections alternate between them
    const answers = new Set<string>();
    const remotes = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const body = await ask(port);
      const [id, remote] = body.split(' ');
      answers.add(id);
      remotes.add(remote);
    }
    console.log('workers answering', answers.size, 'remote', [...remotes].join(','));
    assert(answers.size === 2, 'connections are spread over both workers');
    assert(remotes.size === 1 && [...remotes][0] === '127.0.0.1', 'workers see the client address');
    cluster.disconnect(() => events.push('disconnected'));
  });
  let exits = 0;
  cluster.on('exit', (worker, code) => {
    exits++;
    assert(worker.exitedAfterDisconnect, 'exit after disconnect');
    assert(code === 0, 'clean worker exit');
    if (exits === 2) {
      console.log('greetings', greetings, events.includes('disconnected'), Object.keys(cluster.workers!).length);
      assert(greetings === 2 && events.includes('disconnected'), 'messages and disconnect callback');
    }
  });
  const first = cluster.fork();
  cluster.fork({ WORKER_FLAVOR: 'second' });
  assert(first.id === 1 && cluster.isWorker === false, 'primary state');
} else {
  const worker = cluster.worker!;
  http
    .createServer((req, res) => {
      res.end(`${worker.id} ${req.socket.remoteAddress}`);
    })
    .listen(0, '127.0.0.1', () => {
      process.send!({ hello: worker.id });
    });
  assert(cluster.isWorker && (worker.id === 1 || process.env.WORKER_FLAVOR === 'second'), 'worker state');
}
