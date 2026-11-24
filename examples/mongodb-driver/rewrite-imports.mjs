// One-time vendor import rewrite for the mongodb-driver example.
// See vendor/VENDOR.md for the exact changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, 'vendor');

function rewrite(file, from, to) {
  const full = path.join(vendor, file);
  let s = fs.readFileSync(full, 'utf8');
  const before = s;
  s = s.split(from).join(to);
  if (s === before) {
    console.log(`skip ${file} (no ${from})`);
    return;
  }
  fs.writeFileSync(full, s);
  console.log(`rewrote ${file}`);
}

rewrite('mongodb/src/bson.ts', "from 'bson'", "from '../../bson/src/index.ts'");
rewrite('mongodb/src/connection_string.ts', "from 'mongodb-connection-string-url'", "from '../../shims/mongodb-connection-string-url.ts'");
rewrite('mongodb/src/connection_string.ts', "from '../shims/mongodb-connection-string-url.ts'", "from '../../shims/mongodb-connection-string-url.ts'");
rewrite('mongodb/src/cmap/auth/scram.ts', "from '@mongodb-js/saslprep'", "from '../../../../shims/saslprep.ts'");
rewrite('mongodb/src/cmap/auth/scram.ts', "from '../../../shims/saslprep.ts'", "from '../../../../shims/saslprep.ts'");
