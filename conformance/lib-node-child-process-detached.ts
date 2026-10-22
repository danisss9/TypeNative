// spawn({ detached: true }) runs the child in its own session (Unix) or
// process group (Windows); unref() lets the parent exit without waiting
import { spawn } from 'node:child_process';

function sessionOf(detached: boolean, done: (pid: number, sid: string) => void): void {
  const child = spawn('sh', ['-c', 'cut -d" " -f6 /proc/$$/stat'], { detached: detached });
  let out = '';
  child.stdout.on('data', (chunk: any) => {
    out += String(chunk);
  });
  child.on('close', () => done(child.pid ?? 0, out.trim()));
}

if (process.platform === 'linux') {
  sessionOf(true, (pid, sid) => {
    assert(sid === String(pid), `a detached child leads its own session (${sid} vs ${pid})`);
    sessionOf(false, (pid2, sid2) => {
      assert(sid2 !== String(pid2), 'an attached child stays in the parent session');
      console.log('detached ok');
    });
  });
} else {
  console.log('detached ok');
}

// unref(): this program exits right away, while the sleeper is killed
const sleeper = spawn('sleep', ['30'], { detached: true, stdio: 'ignore' });
sleeper.unref();
sleeper.ref();
sleeper.unref();
setTimeout(() => sleeper.kill(), 10);
