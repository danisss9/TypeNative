import { parseArgs, getSystemErrorName, getSystemErrorMessage, getSystemErrorMap, MIMEType, parseEnv, aborted, debuglog } from 'node:util';
import { writeFileSync, rmSync } from 'node:fs';

// parseArgs
const options = {
  verbose: { type: 'boolean' as const, short: 'v' },
  port: { type: 'string' as const, short: 'p', default: '80' },
  tag: { type: 'string' as const, multiple: true }
};
const parsed = parseArgs({ args: ['-v', '--port=8080', '--tag', 'a', '--tag=b', 'file'], options, allowPositionals: true });
console.log(parsed.values.verbose, parsed.values.port, JSON.stringify(parsed.values.tag), parsed.positionals.join(','));
assert(parsed.values.verbose === true && parsed.values.port === '8080' && parsed.positionals[0] === 'file', 'values / positionals');
const defaults = parseArgs({ args: ['-vp', '99'], options });
assert(defaults.values.port === '99', 'short option groups');
assert(parseArgs({ args: [], options }).values.port === '80', 'defaults');
const tokens = parseArgs({ args: ['-vp9', '--', '-x'], options, allowPositionals: true, tokens: true }).tokens!;
console.log(tokens.map((t) => `${t.kind}:${t.name ?? t.value ?? ''}`).join(' '));
assert(tokens.length === 4 && tokens[1].inlineValue === true && tokens[2].kind === 'option-terminator', 'tokens');
const loose = parseArgs({ args: ['--color', '--x=1', 'y'], strict: false });
assert(loose.values.color === true && loose.values.x === '1' && loose.positionals[0] === 'y', 'non-strict');
assert(parseArgs({ args: ['--no-verbose'], options, allowNegative: true }).values.verbose === false, 'allowNegative');
const failures: string[] = [];
for (const args of [['--nope'], ['--port'], ['--verbose=1'], ['x']]) {
  try {
    parseArgs({ args, options });
  } catch (err) {
    failures.push(`${(err as NodeJS.ErrnoException).code}: ${(err as Error).message}`);
  }
}
console.log(failures.join('\n'));
assert(failures.length === 4 && failures[1].includes("Option '-p, --port <value>' argument missing"), 'parseArgs errors');

// System errors
console.log(getSystemErrorName(-2), getSystemErrorName(-13), getSystemErrorMessage(-2));
assert(getSystemErrorName(-2) === 'ENOENT' && getSystemErrorMap().get(-13)![0] === 'EACCES', 'system error names');

// MIMEType
const mime = new MIMEType('Text/HTML; Charset="utf-8"; foo=bar');
console.log(mime.type, mime.subtype, mime.essence, mime.params.get('charset'), String(mime));
assert(mime.essence === 'text/html' && mime.params.get('charset') === 'utf-8' && mime.params.has('foo'), 'MIMEType parse');
mime.params.set('foo', 'b z');
mime.params.delete('charset');
assert(mime.toString() === 'text/html;foo="b z"', 'MIMEType serialize');
assert([...mime.params.keys()].join(',') === 'foo' && mime.params.get('nope') === null, 'MIMEParams');

// parseEnv / process.loadEnvFile
const env = parseEnv('A=1\n# comment\nB="two words"\nexport C=3\nD=\'x\\ny\'\nE="line\\nnext"\nF=plain # trailing\n');
console.log(JSON.stringify(env));
assert(env.A === '1' && env.B === 'two words' && env.C === '3' && env.D === 'x\\ny' && env.E === 'line\nnext' && env.F === 'plain', 'parseEnv');
writeFileSync('tn-probe.env', 'TN_PROBE_ENV=loaded\nPATH=overridden\n');
process.loadEnvFile('tn-probe.env');
rmSync('tn-probe.env');
assert(process.env.TN_PROBE_ENV === 'loaded' && process.env.PATH !== 'overridden', 'loadEnvFile keeps existing variables');

// debuglog (silent unless NODE_DEBUG names the section); aborted
const log = debuglog('tnprobe');
log('not shown %d', 1);
const controller = new AbortController();
aborted(controller.signal, {}).then(() => console.log('aborted resolved'));
setTimeout(() => controller.abort(), 5);
