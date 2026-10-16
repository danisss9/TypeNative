import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-cb-'));
const file = path.join(dir, 'cb.txt');
const order: string[] = [];

fs.writeFile(file, 'callback data', (err) => {
  assert(!err, 'writeFile succeeds');
  order.push('written');
  fs.readFile(file, 'utf8', (err2, text) => {
    assert(!err2 && text === 'callback data', 'readFile with encoding');
    order.push('read');
    fs.stat(file, (err3, stats) => {
      assert(!err3 && stats.size === 13 && stats.isFile(), 'stat');
      fs.readFile(path.join(dir, 'missing'), (err4) => {
        assert(err4 !== null && err4.code === 'ENOENT', 'error-first callback');
        fs.rm(dir, { recursive: true }, (err5) => {
          assert(!err5 && !fs.existsSync(dir), 'rm');
          order.push('done');
        });
      });
    });
  });
});
order.push('sync code first');

setTimeout(() => {
  assert(order.join(',') === 'sync code first,written,read,done', 'callbacks run after the sync code, in order');
}, 500);
