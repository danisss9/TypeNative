// node:wasi: a Go program built for GOOS=wasip1 runs with args, env, a preopened directory and stdout on a file; start() returns proc_exit's code
import { WASI } from 'node:wasi';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The command it runs: prints its args and environment, reads and writes a
// file in the preopened /sandbox, then exits with code 7
const fixture = `package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Printf("args=%v\\n", os.Args)
	fmt.Printf("greeting=%s\\n", os.Getenv("GREETING"))
	data, err := os.ReadFile("/sandbox/in.txt")
	if err != nil {
		fmt.Println("read error:", err)
		os.Exit(2)
	}
	fmt.Printf("file=%s\\n", data)
	if err := os.WriteFile("/sandbox/out.txt", []byte("written by wasm"), 0o644); err != nil {
		fmt.Println("write error:", err)
		os.Exit(3)
	}
	if _, err := os.ReadFile("/etc/hostname"); err == nil {
		fmt.Println("escaped the sandbox")
		os.Exit(4)
	}
	os.Exit(7)
}
`;

async function main(): Promise<void> {
  // (built in a temp dir: probes may run outside the repository)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-wasi-'));
  const src = path.join(dir, 'src');
  fs.mkdirSync(src);
  fs.writeFileSync(path.join(src, 'go.mod'), 'module wasifixture\n\ngo 1.21\n');
  fs.writeFileSync(path.join(src, 'main.go'), fixture);
  const wasmPath = path.join(dir, 'fixture.wasm');
  const build = spawnSync('go', ['build', '-C', src, '-o', wasmPath, '.'], {
    env: { ...process.env, GOOS: 'wasip1', GOARCH: 'wasm' },
    encoding: 'utf8'
  });
  assert(build.status === 0, `builds the fixture: ${build.stderr}`);

  const sandbox = path.join(dir, 'sandbox');
  fs.mkdirSync(sandbox);
  fs.writeFileSync(path.join(sandbox, 'in.txt'), 'hello from the host');
  const outPath = path.join(dir, 'stdout.txt');
  const outFd = fs.openSync(outPath, 'w');
  const wasi = new WASI({
    version: 'preview1',
    args: ['fixture', 'one', 'two'],
    env: { GREETING: 'hi' },
    preopens: { '/sandbox': sandbox },
    stdout: outFd
  });
  assert(typeof wasi.wasiImport === 'object', 'wasiImport');
  const imports = wasi.getImportObject();
  assert(imports.wasi_snapshot_preview1 === wasi.wasiImport, 'getImportObject');

  const { instance } = await WebAssembly.instantiate(fs.readFileSync(wasmPath), imports);
  const code = wasi.start(instance);
  fs.closeSync(outFd);
  assert(code === 7, `start returns proc_exit's code (got ${code})`);
  const out = fs.readFileSync(outPath, 'utf8');
  console.log(out);
  assert(out.includes('args=[fixture one two]'), 'args');
  assert(out.includes('greeting=hi'), 'env');
  assert(out.includes('file=hello from the host'), 'a preopened file read');
  assert(fs.readFileSync(path.join(sandbox, 'out.txt'), 'utf8') === 'written by wasm', 'a preopened file written');

  let code2 = '';
  try {
    wasi.start(instance);
  } catch (e) {
    code2 = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(code2 === 'ERR_WASI_ALREADY_STARTED', 'a second start');

  // initialize() is for reactors: a command (it exports _start) is refused
  const other = new WASI({ version: 'preview1', stdout: 2 });
  const second = await WebAssembly.instantiate(fs.readFileSync(wasmPath), other.getImportObject());
  let refused = false;
  try {
    other.initialize(second.instance);
  } catch (e) {
    refused = e instanceof TypeError;
  }
  assert(refused, 'initialize on a command');

  let badVersion = '';
  try {
    new WASI({ version: 'bogus' as any });
  } catch (e) {
    badVersion = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(badVersion === 'ERR_INVALID_ARG_VALUE', "other versions than 'preview1' and 'unstable' rejected");
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('ok');
}

main();

export {};
