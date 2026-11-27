// Full TypeScript compiler (`tsc` v6.0.3), compiled natively with TypeNative.
//
// Runs identically under Node.js (`node run-node.mjs ...`) and as a single
// native binary (`typenative --source main.ts --output dist/tsc`).
//
// Standard library declarations (`lib.*.d.ts`) are located automatically from:
//   1. $TS_LIB_DIR (if set),
//   2. an adjacent `lib/` directory beside the executable or script,
//   3. the executable's own directory (standard `tsc` layout),
//   4. `../lib/` relative to the executable, or
//   5. `node_modules/typescript/lib/` from the current directory.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from './vendor/typescript/src/compiler/_namespaces/ts.ts';

function resolveLibDir(): string | null {
  const candidates: string[] = [];
  const envDir = process.env.TS_LIB_DIR;
  if (envDir) candidates.push(path.resolve(envDir));

  // Under Node (`run-node.mjs`), process.argv[1] is `.cache/node/main.js`.
  // Under TypeNative, process.execPath (or process.argv[0]) is the binary path.
  const entry = process.argv[1] && (process.argv[1].endsWith('.js') || process.argv[1].endsWith('.ts'))
    ? path.resolve(process.argv[1])
    : path.resolve(process.execPath || process.argv[0] || '.');
  const entryDir = path.dirname(entry);

  candidates.push(
    path.join(entryDir, 'lib'),
    entryDir,
    path.resolve(entryDir, '..', 'lib'),
    path.resolve(process.cwd(), 'node_modules', 'typescript', 'lib'),
  );

  for (let i = 0; i < candidates.length; i++) {
    const dir = candidates[i];
    if (fs.existsSync(path.join(dir, 'lib.es5.d.ts'))) {
      return dir;
    }
  }
  return null;
}

const libDir = resolveLibDir();
if (libDir) {
  const executingPath = path.join(libDir, 'tsc.js');
  ts.sys.getExecutingFilePath = () => executingPath;
}

// Mirror src/tsc/tsc.ts entrypoint verbatim
ts.Debug.loggingHost = {
  log(_level, s) {
    ts.sys.write(`${s || ''}${ts.sys.newLine}`);
  },
};

if (ts.Debug.isDebugging) {
  ts.Debug.enableDebugInfo();
}

if (ts.sys.tryEnableSourceMapsForHost && /^development$/i.test(ts.sys.getEnvironmentVariable('NODE_ENV'))) {
  ts.sys.tryEnableSourceMapsForHost();
}

if (ts.sys.setBlocking) {
  ts.sys.setBlocking();
}

ts.executeCommandLine(ts.sys, ts.noop, ts.sys.args);
