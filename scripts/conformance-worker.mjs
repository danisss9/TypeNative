// Persistent worker for conformance-parallel.mjs (Node mode).
// Keeps Node, the transpiler, TypeScript, and parsed .d.ts files warm across
// probes instead of paying cold-start + Go-check + .d.ts-parse on every probe.
import { spawn } from 'node:child_process';
import module from 'node:module';
import path from 'node:path';

module.enableCompileCache?.();

const { run, parseCliArgs } = await import('../bin/index.js');
const { parseAstJson } = await import('../bin/parse-node.js');
const { typeCheckNode } = await import('../bin/typecheck-node.js');

const root = path.resolve(import.meta.dirname, '..');
const typesDir = path.join(root, 'types');
const vendorDir = path.join(root, 'govendor');
const exeName = process.platform === 'win32' ? 'native.exe' : 'native';

class ExitSignal extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
  }
}

const origExit = process.exit.bind(process);
const origStdoutWrite = process.stdout.write.bind(process.stdout);
const origStderrWrite = process.stderr.write.bind(process.stderr);

process.on('message', (msg) => {
  const { id, args: jobArgs, dir, build } = msg;
  const parsed = parseCliArgs(jobArgs);
  if (parsed.error) {
    process.send({ id, code: 2, out: `error: ${parsed.error}\n` });
    return;
  }

  let out = '';
  const append = (chunk, encoding, cb) => {
    if (typeof encoding === 'function') {
      cb = encoding;
      encoding = undefined;
    }
    out += Buffer.isBuffer(chunk) ? chunk.toString(encoding) : String(chunk);
    if (cb) cb();
    return true;
  };

  let exitCode = null;
  process.chdir(dir);
  process.stdout.write = append;
  process.stderr.write = append;
  process.exit = (code) => {
    throw new ExitSignal(code ?? 0);
  };

  try {
    run({
      source: parsed.source,
      output: parsed.output,
      scriptMode: false,
      tsCode: null,
      parse: parseAstJson,
      typeCheck: parsed.noTypeCheck ? null : (fileName) => typeCheckNode(fileName, typesDir),
      vendorDir,
      target: parsed.target,
      release: parsed.release,
      gui: parsed.gui,
      cover: parsed.cover,
      profile: parsed.profile,
      emitGo: parsed.emitGo,
      seaConfig: parsed.seaConfig
    });
  } catch (err) {
    if (err instanceof ExitSignal) {
      exitCode = err.code;
    } else {
      out += (err && err.stack) || String(err);
      exitCode = 1;
    }
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    process.exit = origExit;
    // Leave dir before the coordinator removes it (Windows locks a process's cwd)
    process.chdir(root);
  }

  if (exitCode !== null) {
    process.send({ id, code: exitCode, out });
    return;
  }

  if (build) {
    process.send({ id, code: 0, out });
    return;
  }

  const child = spawn(path.join(dir, 'dist', exeName), [], { cwd: dir });
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.on('error', (err) => {
    process.send({ id, code: 1, out: `${out}\n${err.message}` });
  });
  child.on('close', (code) => {
    process.send({ id, code: code ?? 1, out });
  });
});
