// readline.question() is a TypeNative extension (synchronous line input); the
// probe re-runs itself with piped stdin
import { question } from 'node:readline';
import { spawnSync } from 'node:child_process';

if (process.argv.includes('--child')) {
  const name = question('name? ');
  const color = question('color? ');
  console.log(`${name}|${color}`);
} else {
  const result = spawnSync(process.execPath, [process.argv[1], '--child'], { input: 'Ana\nblue\n', encoding: 'utf-8' });
  assert(String(result.stdout).includes('name? color? Ana|blue'), 'answers come from stdin, in order');
}
