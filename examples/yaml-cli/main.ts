// The `yaml` npm package's own command-line tool, compiled from its unmodified
// upstream TypeScript (vendor/yaml/src, see vendor/yaml/VENDOR.md). This file
// is a TypeScript port of upstream's bin.js: it hands stdin and the arguments
// to cli() and turns the error it reports into an exit code.
//
//   yaml < in.yaml             re-emit the YAML stream
//   yaml --json < in.yaml      print it as JSON
//   yaml valid < in.yaml       exit 1 on the first error
//   yaml lex < in.yaml         print the lexer's tokens
//   yaml cst < in.yaml         print the concrete syntax tree
//
// Runs as-is under Node.js (`node main.ts`) and compiles with TypeNative.
//
// One addition to bin.js: `yaml --json` on a large stream of documents
// converts runs of documents in parallel worker processes (see below). The
// output is the same JSON cli() prints, byte for byte.
import { promises } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { UserError, cli, help } from './vendor/yaml/src/cli.ts';
import { Composer } from './vendor/yaml/src/compose/composer.ts';
import type { Document } from './vendor/yaml/src/doc/Document.ts';
import { Pair } from './vendor/yaml/src/nodes/Pair.ts';
import { Scalar } from './vendor/yaml/src/nodes/Scalar.ts';
import { YAMLMap } from './vendor/yaml/src/nodes/YAMLMap.ts';
import { YAMLSeq } from './vendor/yaml/src/nodes/YAMLSeq.ts';
import { YAMLSet } from './vendor/yaml/src/nodes/YAMLSet.ts';
import { Parser } from './vendor/yaml/src/parse/parser.ts';

const { readFile, unlink, writeFile } = promises;

function done(error?: Error) {
  if (error instanceof UserError) {
    if (error.code === UserError.ARGS) console.error(`${help}\n`);
    console.error(error.message);
    process.exitCode = error.code;
  } else if (error) {
    // bin.js rethrows here; Node then prints the error and exits with 1
    console.error(error);
    process.exitCode = 1;
  }
}

// `yaml --json` on a large stream is split before the `---` lines that start
// its documents, and up to six worker processes each compose one contiguous
// run of documents and print it as JSON; the main process joins the arrays.
// A `---` at the start of a line always ends the document before it (it ends
// any scalar or collection still open, or that one is an error), so each
// run's documents are the ones the whole stream has. Only plain streams take
// this path: no directives (% lines, which carry over to later documents) and
// no CR line endings. Any error, warning, collection-valued key (its warning
// is printed while the JSON is made) or exception in a worker sends the whole
// input through cli() instead, which reports it as it always would. A run
// travels in workerData; its JSON comes back through a temporary file (the
// worker IPC carries one compact message, not megabytes).
const PARALLEL_MIN_BYTES = 512 * 1024;

interface ConvertJob {
  text: string;
  output: string;
  indent?: string;
}

// The --indent value when the arguments are just --json (and --indent):
// undefined for none, null when the arguments ask for anything else
function jsonOnlyArgs(argv: string[]): { indent?: string } | null {
  let json = false;
  let indent: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json' || arg === '-j') json = true;
    else if ((arg === '--indent' || arg === '-i') && i + 1 < argv.length && !argv[i + 1].startsWith('-')) indent = argv[++i];
    else if (arg.startsWith('--indent=')) indent = arg.slice('--indent='.length);
    else return null;
  }
  return json ? { indent } : null;
}

function splitDocuments(data: string): string[] | undefined {
  if (data.length < PARALLEL_MIN_BYTES || data.includes('\r')) return undefined;
  if (data.startsWith('%') || data.includes('\n%')) return undefined;
  const cuts: number[] = [0];
  let at = data.indexOf('\n---');
  while (at !== -1) {
    const after = data.charCodeAt(at + 4);
    // (`---` then a space, a tab, a newline or the end: a document start)
    if (Number.isNaN(after) || after === 32 || after === 9 || after === 10) cuts.push(at + 1);
    at = data.indexOf('\n---', at + 4);
  }
  if (cuts.length < 3) return undefined;
  cuts.push(data.length);
  const requested = Number(process.env.YAML_WORKERS ?? '0') || availableParallelism();
  const count = Math.min(6, Math.max(1, requested), cuts.length - 1);
  if (count < 2) return undefined;
  // one contiguous run of documents per process, balanced by size
  const parts: string[] = [];
  let next = 1;
  let start = 0;
  for (let m = 1; m <= count; m++) {
    const target = (data.length * m) / count;
    while (next < cuts.length - 1 && cuts[next] < target) next++;
    const end = m === count ? data.length : cuts[next];
    if (end > start) parts.push(data.slice(start, end));
    start = end;
  }
  return parts.length > 1 ? parts : undefined;
}

// Whether toJS could warn on this node: a map key that is not a scalar (an
// alias, a collection) is stringified with a warning. (A set: assumed so.)
function warnsOnKeys(node: unknown): boolean {
  if (node instanceof Pair) {
    return (node.key !== null && !(node.key instanceof Scalar)) || warnsOnKeys(node.value);
  }
  if (node instanceof YAMLMap) {
    for (const pair of node.values.values()) if (warnsOnKeys(pair)) return true;
    return false;
  }
  if (node instanceof YAMLSeq) {
    for (const item of node) if (warnsOnKeys(item)) return true;
    return false;
  }
  return node instanceof YAMLSet;
}

async function workerMain() {
  const job = workerData as ConvertJob;
  const text = job.text as string;
  const output = job.output as string;
  const indent = job.indent as string | undefined;
  try {
    // as cli() composes a stream: new Composer({ version: opt.yaml, merge: opt.merge })
    const composer = new Composer({ version: '1.2', merge: undefined });
    const parser = new Parser();
    for (const tok of parser.parse(text)) composer.next(tok);
    const docs: Document[] = [];
    let clean = true;
    for (const doc of composer.end(false)) {
      if (doc.errors.length > 0 || doc.warnings.length > 0 || warnsOnKeys(doc.value)) clean = false;
      docs.push(doc);
    }
    // (a run with no document must be all blank lines and comments: an error
    // with no document to report it is otherwise lost)
    if (docs.length === 0 && /^[ \t]*[^ \t\n#]/m.test(job.text)) clean = false;
    if (clean) {
      await writeFile(output, JSON.stringify(docs, null, Number(indent)));
      parentPort!.postMessage('ok');
    } else {
      parentPort!.postMessage('fallback');
    }
  } catch {
    parentPort!.postMessage('fallback');
  }
  parentPort!.close();
}

// The JSON of each run's array, as the JSON of one array of all their items
function joinArrays(arrays: string[]): string {
  const items: string[] = [];
  let separator = ',';
  for (const json of arrays) {
    if (json === '[]') continue;
    if (json.startsWith('[\n')) {
      separator = ',\n';
      items.push(json.slice(2, -2));
    } else {
      items.push(json.slice(1, -1));
    }
  }
  if (items.length === 0) return '[]';
  return separator === ',' ? '[' + items.join(',') + ']' : '[\n' + items.join(',\n') + '\n]';
}

// The runs converted in workers: their JSON, or '' when a worker found
// something cli() has to report
async function convertParallel(parts: string[], indent: string | undefined): Promise<string> {
  const base = tmpdir() + '/yaml-' + process.pid + '-' + Date.now();
  const results: string[] = await Promise.all(parts.map((text, index) => new Promise<string>((resolve, reject) => {
    const output = base + '-' + index + '.json';
    const job: ConvertJob = { text, output, indent };
    try {
      const worker = new Worker(new URL(import.meta.url), { workerData: job });
      worker.on('message', async (message: string) => {
        try {
          if (message === 'ok') {
            const json: string = await readFile(output, 'utf8');
            await unlink(output).catch(() => {});
            resolve(json);
          } else {
            resolve('');
          }
        } catch (err) {
          reject(err);
        }
        worker.terminate();
      });
      worker.on('error', (err: Error) => {
        unlink(output).catch(() => {});
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  })));
  if (results.some((json) => json === '')) return '';
  return joinArrays(results);
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let source = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      source += chunk;
    });
    process.stdin.on('error', (err: Error) => reject(err));
    process.stdin.on('end', () => resolve(source));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const json = jsonOnlyArgs(argv);
  if (!json) {
    cli(process.stdin, done, argv);
    return;
  }
  const source = await readStdin();
  const parts = splitDocuments(source);
  if (parts) {
    const output = await convertParallel(parts, json.indent);
    if (output !== '') {
      // (flushed before the process exits: a pipe gets all of it)
      await new Promise<void>((resolve) => {
        process.stdout.write(output + '\n', () => resolve());
      });
      return;
    }
  }
  // (the input read here, replayed to cli() as its stdin)
  const replay = new PassThrough();
  replay.end(source);
  cli(replay, done, argv);
}

if (isMainThread) {
  main();
} else {
  workerMain();
}
