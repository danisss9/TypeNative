import { exec, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const self = [...process.execArgv, process.argv[1]];

if (process.argv.includes('--child')) {
  if (process.argv.includes('--echo')) {
    process.stdin.on('data', (chunk) => process.stdout.write(String(chunk).toUpperCase()));
  } else {
    console.log('hi from child');
    if (process.argv.includes('--fail')) process.exitCode = 2;
  }
} else {
  const events: string[] = [];
  execFile(process.execPath, [...self, '--child'], (err, stdout) => {
    assert(err === null && stdout.trim() === 'hi from child', 'execFile callback');
    events.push('execFile');
  });
  exec('echo shell', (err, stdout) => {
    assert(!err && stdout.trim() === 'shell', 'exec callback');
    events.push('exec');
  });
  execFile(process.execPath, [...self, '--child', '--fail'], (err) => {
    assert(err !== null && (err as any).code === 2, 'non-zero exit is an error with the exit code');
    events.push('failure');
  });

  const child = spawn(process.execPath, [...self, '--child', '--echo']);
  let echoed = '';
  child.stdout.on('data', (chunk) => {
    echoed += String(chunk);
  });
  child.on('close', (code) => {
    assert(code === 0 && echoed === 'ABC', 'spawn with piped stdin / stdout');
    events.push('spawn');
  });
  child.stdin.write('abc');
  child.stdin.end();

  const execAsync = promisify(exec);
  execAsync('echo promised').then((out) => {
    assert(out.stdout.trim() === 'promised', 'promisify(exec)');
    events.push('promisify');
  });

  setTimeout(() => {
    assert(events.length === 5, `all callbacks ran: ${events.join(',')}`);
  }, 4000);
}
