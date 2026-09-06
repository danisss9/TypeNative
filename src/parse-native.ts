// Self-hosted parser: spawns the tsparser Go tool (tsparser/main.go) to parse
// TypeScript into the normalized JSON AST. Fully transpilable — used by the
// native compiler binary instead of the typescript npm package.

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';

export function parseAstJsonNative(code: string): any {
  const exe = findTsparser();
  const result = (childProcess as any).spawnSync(exe, [], { input: code, encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error('tsparser failed: ' + result.stderr);
  }
  return JSON.parse(result.stdout);
}

// Locates the tsparser binary: TYPENATIVE_TSPARSER env var, next to this
// executable, or in a sibling tsparser/ directory (dev checkout layout).
function findTsparser(): string {
  const exeName = platformIsWindows() ? 'tsparser.exe' : 'tsparser';
  const envPath = (process.env as any).TYPENATIVE_TSPARSER;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const thisDir = path.dirname(path.resolve(process.argv[0]));
  const candidates: string[] = [
    path.join(thisDir, exeName),
    path.join(thisDir, 'tsparser', exeName),
    path.join(thisDir, '..', 'tsparser', exeName),
    path.join(thisDir, '..', '..', 'tsparser', exeName)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('tsparser binary not found; set TYPENATIVE_TSPARSER');
}

function platformIsWindows(): boolean {
  return process.platform === 'win32';
}
