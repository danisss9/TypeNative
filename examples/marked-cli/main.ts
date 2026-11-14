// The `marked` package's own command-line tool, compiled from its unmodified
// upstream TypeScript (vendor/marked/src, see vendor/marked/VENDOR.md). This
// file is a TypeScript port of upstream's bin/main.js: it parses the same
// options, reads markdown from a string, a file or stdin, and prints the HTML
// (or the lexer's tokens as JSON).
//
//   marked < in.md                  render markdown to HTML
//   marked -s '*hi*'                render a string
//   marked -i in.md -o out.html     read a file, write a file
//   marked --tokens < in.md         print the token list as JSON
//   marked --no-gfm --pedantic      any boolean option of marked.defaults
//
// Runs as-is under Node.js (`node main.ts`) and compiles with TypeNative.
//
// Differences from bin/main.js: --help prints the option summary below
// instead of opening the man page, --version prints the vendored version
// instead of reading package.json, a config file (-c, ~/.marked.json) must be
// JSON (a JavaScript config is a module Node would import and run, which a
// native binary can't), and the HTML is flushed before the process exits
// (bin/main.js exits right after writing it, cutting output to a pipe off at
// 64 KB).
import { promises } from 'node:fs';
import { resolve } from 'node:path';
import { availableParallelism, homedir, tmpdir } from 'node:os';
import { Buffer } from 'node:buffer';
import { gzipSync, gunzipSync } from 'node:zlib';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { marked } from './vendor/marked/src/marked.ts';
import type { MarkedExtension, MarkedOptions } from './vendor/marked/src/marked.ts';

const { access, readFile, unlink, writeFile } = promises;

const VERSION = '18.1.2';

const HELP = `marked - a markdown parser

Usage: marked [options] [file]

  -o, --output <file>    write the HTML to <file> instead of stdout
  -i, --input <file>     read the markdown from <file>
  -s, --string <string>  parse <string> as markdown
  -t, --tokens           print the token list as JSON instead of HTML
  -c, --config <file>    load options and extensions from a JSON file
  -n, --no-clobber       don't overwrite the --output file
  -h, --help             print this help
  -v, --version          print the version

  --<option> / --no-<option>
                         set or clear any option of marked.defaults,
                         e.g. --gfm, --no-gfm, --breaks, --pedantic

With no file, --input or --string, the markdown is read from stdin.
`;

interface CliError {
  code?: string;
  path?: string;
  message: string;
}

// Large documents are parsed in a few processes, one contiguous run of
// sections each: marked renders top-level blocks independently, so the
// concatenation is the whole document's HTML (checked byte for byte by
// bench.mjs). Splits happen only before a top-level ATX heading that follows
// a blank line and is outside a code fence; documents with reference link
// definitions, raw HTML blocks or CRLF line endings take the sequential path,
// as the pieces would not stand on their own. Between the processes a section
// run travels in workerData, and its HTML comes back gzipped through one small
// temporary file (the worker IPC handles one compact message, not megabytes).
const PARALLEL_MIN_BYTES = 512 * 1024;

function splitForParallel(data: string, options: MarkedOptions): string[] | undefined {
  if (data.length < PARALLEL_MIN_BYTES || data.includes('\r')) return undefined;
  if (options.extensions || options.hooks || options.walkTokens) return undefined;
  // a reference definition is shared by the whole document
  if (/(^|\n) {0,3}\[[^\]\n]+\]:/.test(data)) return undefined;
  // a cut line inside one of these would not be a top-level heading
  if (/<(?:pre|script|style|textarea)\b/i.test(data) || data.includes('<!--') || data.includes('<?') || data.includes('<![CDATA[')) return undefined;

  const lines = data.split('\n');
  const cuts: number[] = [0];
  let fence = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (open) {
      if (!fence) fence = open[1][0];
      else if (open[1][0] === fence) fence = '';
      continue;
    }
    if (fence) continue;
    if (i > 0 && lines[i - 1] === '' && /^#{1,6} /.test(line)) cuts.push(i);
  }
  cuts.push(lines.length);
  if (cuts.length < 3) return undefined;

  // One contiguous run of chunks per process, balanced by size
  const chunks: string[] = [];
  let total = 0;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const chunk = lines.slice(cuts[i], cuts[i + 1]).join('\n');
    chunks.push(chunk);
    total += chunk.length;
  }
  const requested = Number(process.env.MARKED_WORKERS ?? '0') || availableParallelism();
  const count = Math.min(6, Math.max(1, requested));
  if (count < 2) return undefined;
  const parts: string[] = [];
  let at = 0;
  let size = 0;
  for (let m = 0; m < count && at < chunks.length; m++) {
    const target = total * (m + 1) / count;
    const start = at;
    while (at < chunks.length && (at === start || size < target)) {
      size += chunks[at].length;
      at++;
    }
    parts.push(chunks.slice(start, at).join('\n'));
  }
  return parts.length > 1 ? parts : undefined;
}

interface ParseJob {
  text: string;
  output: string;
  options: MarkedOptions;
}

async function parseHtml(data: string, options: MarkedOptions): Promise<string> {
  const parts = splitForParallel(data, options);
  if (!parts) return await marked.parse(data, options);
  const base = tmpdir() + '/marked-' + process.pid + '-' + Date.now();
  const htmls: string[] = await Promise.all(parts.map((text, index) => new Promise<string>((resolve, reject) => {
    const output = base + '-' + index + '.html';
    const cleanup = () => unlink(output).catch(() => {});
    (async () => {
      try {
        const worker = new Worker(new URL(import.meta.url), { workerData: { text, output, options } as ParseJob });
        worker.on('message', async () => {
          try {
            resolve(gunzipSync(await readFile(output)).toString('utf8'));
          } catch (err) {
            reject(err);
          } finally {
            cleanup();
          }
          worker.terminate();
        });
        worker.on('error', (err) => {
          cleanup();
          reject(err);
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  }))) as string[];
  return htmls.join('');
}

async function workerMain() {
  const job = workerData as ParseJob;
  const options = job.options as MarkedOptions;
  const text = job.text as string;
  const output = job.output as string;
  await writeFile(output, gzipSync(Buffer.from(await marked.parse(text, options), 'utf8')));
  parentPort!.postMessage('ok');
  parentPort!.close();
}

export async function main() {
  async function help() {
    console.log(HELP);
  }

  async function version() {
    console.log(VERSION);
  }

  async function start(argv: string[]) {
    const files: string[] = [];
    const options: Record<string, unknown> = {};
    let input: string | undefined;
    let output: string | undefined;
    let string: string | undefined;
    let arg: string;
    let tokens = false;
    let config: string | undefined;
    let opt: string;
    let noclobber = false;

    function getArg(): string {
      let arg = argv.shift() as string;

      if (arg.indexOf('--') === 0) {
        // e.g. --opt
        const parts = arg.split('=');
        if (parts.length > 1) {
          // e.g. --opt=val
          argv.unshift(parts.slice(1).join('='));
        }
        arg = parts[0];
      } else if (arg[0] === '-') {
        if (arg.length > 2) {
          // e.g. -abc
          argv = arg.substring(1).split('').map(function(ch) {
            return '-' + ch;
          }).concat(argv);
          arg = argv.shift() as string;
        } else {
          // e.g. -a
        }
      } else {
        // e.g. foo
      }

      return arg;
    }

    while (argv.length) {
      arg = getArg();
      switch (arg) {
        case '-o':
        case '--output':
          output = argv.shift();
          break;
        case '-i':
        case '--input':
          input = argv.shift();
          break;
        case '-s':
        case '--string':
          string = argv.shift();
          break;
        case '-t':
        case '--tokens':
          tokens = true;
          break;
        case '-c':
        case '--config':
          config = argv.shift();
          break;
        case '-n':
        case '--no-clobber':
          noclobber = true;
          break;
        case '-h':
        case '--help':
          return await help();
        case '-v':
        case '--version':
          return await version();
        default:
          if (arg.indexOf('--') === 0) {
            opt = camelize(arg.replace(/^--(no-)?/, ''));
            const defaults = marked.defaults as Record<string, unknown>;
            if (!(opt in defaults)) {
              continue;
            }
            if (arg.indexOf('--no-') === 0) {
              options[opt] = typeof defaults[opt] !== 'boolean'
                ? null
                : false;
            } else {
              options[opt] = typeof defaults[opt] !== 'boolean'
                ? argv.shift()
                : true;
            }
          } else {
            files.push(arg);
          }
          break;
      }
    }

    async function getData(): Promise<string> {
      if (string !== undefined) {
        return string;
      }
      if (input) {
        return await readFile(input, 'utf8');
      }
      if (files.length > 0) {
        return await readFile(files.pop() as string, 'utf8');
      }
      return await getStdin();
    }

    function resolveFile(file: string): string {
      return resolve(file.replace(/^~/, () => homedir()));
    }

    async function fileExists(file: string): Promise<boolean> {
      try {
        await access(resolveFile(file));
        return true;
      } catch {
        return false;
      }
    }

    async function runConfig(file: string) {
      const configFile = resolveFile(file);
      if (!configFile.endsWith('.json')) {
        throw Error(`Cannot load config file '${file}': only JSON config files are supported`);
      }
      let markedConfig = JSON.parse(await readFile(configFile, 'utf8'));
      if (markedConfig.default) {
        markedConfig = markedConfig.default;
      }
      marked.use(markedConfig as MarkedExtension);
    }

    const data = await getData();

    if (config) {
      if (!await fileExists(config)) {
        throw Error(`Cannot load config file '${config}'`);
      }

      await runConfig(config);
    } else {
      const defaultConfig = [
        '~/.marked.json',
        '~/.marked.js',
        '~/.marked/index.js',
      ];

      for (const configFile of defaultConfig) {
        if (await fileExists(configFile)) {
          await runConfig(configFile);
          break;
        }
      }
    }

    const html = tokens
      ? JSON.stringify(marked.lexer(data, options as MarkedOptions), null, 2)
      : await parseHtml(data, options as MarkedOptions);

    if (output) {
      try {
        return await writeFile(output, html, { flag: noclobber ? 'wx' : 'w' });
      } catch (err) {
        if (noclobber && (err as CliError).code === 'EEXIST') {
          throw Error('marked: output file \'' + output + '\' already exists, disable the \'-n\' / \'--no-clobber\' flag to overwrite\n');
        }
        throw err;
      }
    }

    // (flushed before main() exits the process: bin/main.js exits right after
    // the write, which cuts output to a pipe off at 64 KB)
    await new Promise<void>((resolve) => {
      process.stdout.write(html + '\n', () => resolve());
    });
  }

  /**
   * Helpers
   */
  function getStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
      const stdin = process.stdin;
      let buff = '';

      stdin.setEncoding('utf8');

      stdin.on('data', function(data: string) {
        buff += data;
      });

      stdin.on('error', function(err: Error) {
        reject(err);
      });

      stdin.on('end', function() {
        resolve(buff);
      });

      stdin.resume();
    });
  }

  function camelize(text: string): string {
    return text.replace(/(\w)-(\w)/g, function(_, a: string, b: string) {
      return a + b.toUpperCase();
    });
  }

  try {
    await start(process.argv.slice(2));
    process.exit(0);
  } catch (err) {
    const e = err as CliError;
    if (e.code === 'ENOENT') {
      process.stderr.write('marked: ' + e.path + ': No such file or directory');
    } else {
      process.stderr.write(e.message);
    }
    return process.exit(1);
  }
}

if (isMainThread) {
  main();
} else {
  workerMain();
}
