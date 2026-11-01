// A chat client for any OpenAI-compatible API: answers stream into the
// terminal token by token while the model is still writing. Works with the
// free OpenRouter API out of the box, and with OpenAI or any other
// /v1/chat/completions server via --base-url.
//
//   openai-chat                               interactive multi-turn REPL
//   openai-chat "explain SSE in one line"     one question, streamed answer
//   openai-chat --model google/gemma-4-31b-it:free
//   openai-chat --base-url https://api.openai.com/v1 --model gpt-4o-mini
//
// The API key comes from OPENROUTER_API_KEY or OPENAI_API_KEY (free keys at
// openrouter.ai/keys), or pass --api-key. In the REPL: /exit quits, /clear
// resets the conversation, /system <text> sets the system prompt, and Ctrl+C
// aborts the answer in flight without killing the session.
//
// The interesting part is the stream: fetch() POSTs with stream: true and the
// response body — a server-sent-event stream — is parsed line by line as
// chunks arrive, printing each content delta the moment the server sends it.
import { createInterface } from 'node:readline/promises';

interface ChatMessage {
  role: string;
  content: string;
}

interface Delta {
  role?: string;
  content?: string | null;
}

interface StreamChoice {
  delta?: Delta;
  finish_reason?: string | null;
}

interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface StreamChunk {
  choices?: StreamChoice[];
  usage?: TokenUsage | null;
  error?: { message?: string } | string;
}

interface Config {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  maxTokens: number | null;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENAI_BASE = 'https://api.openai.com/v1';
const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';
const OPENAI_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 120000;

// Set while a response is streaming, so Ctrl+C aborts the request instead of
// killing the process; interrupted is read by whoever awaited the stream.
let activeRequest: AbortController | null = null;
let interrupted = false;

process.on('SIGINT', () => {
  if (activeRequest !== null) {
    interrupted = true;
    activeRequest.abort();
  } else {
    process.exit(130);
  }
});

function usage(): void {
  console.log(`usage: openai-chat [options] [question...]

Asks an OpenAI-compatible chat API and streams the answer. With a question
the client runs once and exits; without one it starts an interactive
multi-turn REPL (/exit quits, /clear resets, /system <text> sets the system
prompt).

Options:
  --model <id>         model id, provider default when omitted
  --base-url <url>     API root, default https://openrouter.ai/api/v1
                       (or https://api.openai.com/v1 for OpenAI keys)
  --api-key <key>      API key; otherwise OPENROUTER_API_KEY or
                       OPENAI_API_KEY from the environment
  --system <prompt>    system prompt for the conversation
  --max-tokens <n>     cap on generated tokens
  -h, --help           show this help`);
}

interface ParsedArgs {
  help: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  maxTokens: number | null;
  positional: string[];
}

function parseArgs(argv: string[]): ParsedArgs | null {
  const parsed: ParsedArgs = {
    help: false,
    apiKey: '',
    baseUrl: '',
    model: '',
    system: '',
    maxTokens: null,
    positional: [],
  };
  const valueFlags = ['--api-key', '--base-url', '--model', '--system', '--max-tokens'];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      parsed.positional.push(arg);
      i += 1;
      continue;
    }
    let name = arg;
    let value: string | undefined;
    const eq = arg.indexOf('=');
    if (eq >= 0) {
      name = arg.slice(0, eq);
      value = arg.slice(eq + 1);
    }
    if (name === '--help' || name === '-h') {
      parsed.help = true;
      i += 1;
      continue;
    }
    if (valueFlags.indexOf(name) < 0) {
      console.error(`openai-chat: unknown option ${arg}`);
      return null;
    }
    if (value === undefined) {
      value = argv[i + 1];
      i += 2;
    } else {
      i += 1;
    }
    if (value === undefined) {
      console.error(`openai-chat: ${name} needs a value`);
      return null;
    }
    if (name === '--api-key') parsed.apiKey = value;
    else if (name === '--base-url') parsed.baseUrl = value;
    else if (name === '--model') parsed.model = value;
    else if (name === '--system') parsed.system = value;
    else if (name === '--max-tokens') {
      const n = Number(value);
      if (Number.isNaN(n) || n <= 0 || Math.floor(n) !== n) {
        console.error(`openai-chat: --max-tokens wants a positive whole number, got ${value}`);
        return null;
      }
      parsed.maxTokens = n;
    }
  }
  return parsed;
}

function resolveConfig(parsed: ParsedArgs): Config | null {
  let apiKey = parsed.apiKey;
  let baseUrl = parsed.baseUrl;
  let model = parsed.model;
  if (apiKey === '' && process.env.OPENROUTER_API_KEY) {
    apiKey = process.env.OPENROUTER_API_KEY;
  }
  if (apiKey === '' && process.env.OPENAI_API_KEY) {
    apiKey = process.env.OPENAI_API_KEY;
  }
  if (apiKey === '') {
    console.error(`openai-chat: no API key found.
Get a free one at https://openrouter.ai/keys and set it with

  export OPENROUTER_API_KEY=...        (sh)
  set OPENROUTER_API_KEY=...           (cmd)
  $env:OPENROUTER_API_KEY = "..."      (PowerShell)

or pass --api-key. OPENAI_API_KEY works too, as does --base-url for any
other OpenAI-compatible server.`);
    return null;
  }
  // An explicit --base-url decides the provider; otherwise an OpenRouter key
  // (from env or flag) talks to OpenRouter, anything else to OpenAI.
  if (baseUrl === '') {
    baseUrl = baseUrlFor(parsed);
  }
  if (model === '') {
    model = baseUrl.indexOf('openrouter.ai') >= 0 ? OPENROUTER_MODEL : OPENAI_MODEL;
  }
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  return { apiKey, baseUrl, model, system: parsed.system, maxTokens: parsed.maxTokens };
}

function baseUrlFor(parsed: ParsedArgs): string {
  const envBase = process.env.OPENAI_BASE_URL;
  if (envBase) return envBase;
  if (parsed.apiKey !== '') return OPENROUTER_BASE;
  return process.env.OPENROUTER_API_KEY ? OPENROUTER_BASE : OPENAI_BASE;
}

// POSTs the conversation with stream: true and feeds every content delta to
// onDelta as it arrives. Resolves with the usage block from the final chunk
// (providers that honor stream_options.include_usage), or null.
async function streamChat(cfg: Config, messages: ChatMessage[], onDelta: (text: string) => void): Promise<TokenUsage | null> {
  const controller = new AbortController();
  activeRequest = controller;
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (cfg.baseUrl.indexOf('openrouter.ai') >= 0) {
      headers['X-Title'] = 'TypeNative openai-chat example';
    }
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };
    if (cfg.maxTokens !== null) body.max_tokens = cfg.maxTokens;
    const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(describeHttpError(response.status, text));
    }
    if (response.body === null) {
      throw new Error('the server returned a response with no body');
    }
    return await readEventStream(response.body, onDelta);
  } finally {
    activeRequest = null;
    clearTimeout(timer);
  }
}

function describeHttpError(status: number, body: string): string {
  let detail = body.trim();
  try {
    const parsed = JSON.parse(body) as StreamChunk;
    if (typeof parsed.error === 'string') detail = parsed.error;
    else if (parsed.error && typeof parsed.error.message === 'string') detail = parsed.error.message;
  } catch {
    // not JSON — show the raw body
  }
  if (detail === '') return `HTTP ${status}`;
  return `HTTP ${status}: ${detail}`;
}

async function readEventStream(body: ReadableStream<Uint8Array>, onDelta: (text: string) => void): Promise<TokenUsage | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let dataLines: string[] = [];
  let finished = false;
  let usage: TokenUsage | null = null;

  // One SSE event is one or more data: lines ended by a blank line; [DONE]
  // marks the end of the stream. Comments (": OPENROUTER PROCESSING"
  // keep-alives) and event/id/retry fields are ignored; a frame that fails
  // to parse is skipped rather than fatal.
  const dispatch = (): void => {
    if (dataLines.length === 0) return;
    const data = dataLines.join('\n');
    dataLines = [];
    if (data === '[DONE]') {
      finished = true;
      return;
    }
    let chunk: StreamChunk | null = null;
    try {
      chunk = JSON.parse(data) as StreamChunk;
    } catch {
      chunk = null; // malformed frame: skip it
    }
    if (chunk !== null) {
      if (chunk.usage) usage = chunk.usage;
      const content = chunk.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content.length > 0) onDelta(content);
    }
  };

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineAt = buffer.indexOf('\n');
    while (newlineAt >= 0 && !finished) {
      const line = buffer.slice(0, newlineAt).replace(/\r$/, '');
      buffer = buffer.slice(newlineAt + 1);
      if (line.startsWith(':')) {
        // SSE comment
      } else if (line === '') {
        dispatch();
      } else if (line.startsWith('data:')) {
        let payload = line.slice(5);
        if (payload.startsWith(' ')) payload = payload.slice(1);
        dataLines.push(payload);
      }
      newlineAt = buffer.indexOf('\n');
    }
  }
  if (finished) {
    reader.cancel();
  }
  buffer += decoder.decode();
  if (buffer !== '') {
    // Trailing bytes without a final blank line still form an event.
    const tail = buffer.replace(/\r$/, '');
    if (tail.startsWith('data:')) dataLines.push(tail.slice(5).replace(/^ /, ''));
    dispatch();
  }
  return usage;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function friendlyError(err: unknown, cfg: Config): string {
  const message = messageOf(err);
  if (message.indexOf('fetch failed') >= 0) {
    return `could not reach ${cfg.baseUrl} — check the URL and your connection (${message})`;
  }
  if (message.indexOf('abort') >= 0 || message.indexOf('timeout') >= 0) {
    return `the request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s (${message})`;
  }
  return message;
}

function statsLine(usage: TokenUsage | null, elapsedMs: number): string {
  const seconds = (elapsedMs / 1000).toFixed(1);
  if (usage && typeof usage.total_tokens === 'number') {
    const parts: string[] = [];
    if (typeof usage.prompt_tokens === 'number') parts.push(`${usage.prompt_tokens} prompt`);
    if (typeof usage.completion_tokens === 'number') parts.push(`${usage.completion_tokens} completion`);
    if (parts.length > 0) return `[${parts.join(' + ')} tokens · ${seconds}s]`;
    return `[${usage.total_tokens} tokens · ${seconds}s]`;
  }
  return `[${seconds}s]`;
}

// One question in, streamed answer out. Returns the process exit code.
// Note: no return inside the catch — generated Go falls through to the code
// after the try/catch when a catch returns (see this example's README).
async function oneShot(cfg: Config, question: string): Promise<number> {
  const messages: ChatMessage[] = [];
  if (cfg.system !== '') messages.push({ role: 'system', content: cfg.system });
  messages.push({ role: 'user', content: question });
  const started = Date.now();
  let usage: TokenUsage | null = null;
  let code = 0;
  let failure = '';
  try {
    usage = await streamChat(cfg, messages, (text) => process.stdout.write(text));
  } catch (err) {
    if (interrupted) {
      code = 130;
    } else {
      code = 1;
      failure = friendlyError(err, cfg);
    }
  }
  process.stdout.write('\n');
  if (code === 1) console.error(`openai-chat: ${failure}`);
  if (code === 0) console.error(statsLine(usage, Date.now() - started));
  return code;
}

async function repl(cfg: Config): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt('you> ');
  console.log(`openai-chat — ${cfg.model} on ${cfg.baseUrl}`);
  console.log('Multi-turn: each message sees the whole conversation. /exit quits, /clear');
  console.log('resets, /system <text> sets the system prompt. Ctrl+C aborts an answer.');
  const history: ChatMessage[] = [];
  if (cfg.system !== '') history.push({ role: 'system', content: cfg.system });
  // Iterating the interface (rather than question()) queues lines that are
  // typed while an answer is still streaming, so nothing is lost.
  rl.prompt();
  for await (const line of rl) {
    const input = line.trim();
    if (input === '') {
      showPrompt(rl);
      continue;
    }
    if (input === '/exit' || input === '/quit') break;
    if (input === '/clear') {
      history.splice(0, history.length);
      if (cfg.system !== '') history.push({ role: 'system', content: cfg.system });
      console.log('conversation cleared.');
      showPrompt(rl);
      continue;
    }
    if (input === '/system' || input.startsWith('/system ')) {
      const text = input.slice(7).trim();
      if (text === '') {
        console.error('usage: /system <prompt text>');
        showPrompt(rl);
        continue;
      }
      const existing = history.findIndex((m) => m.role === 'system');
      if (existing >= 0) history[existing] = { role: 'system', content: text };
      else history.unshift({ role: 'system', content: text });
      console.log('system prompt set.');
      showPrompt(rl);
      continue;
    }
    history.push({ role: 'user', content: input });
    process.stdout.write('assistant> ');
    const started = Date.now();
    let answer = '';
    let usage: TokenUsage | null = null;
    let failed = false;
    try {
      usage = await streamChat(cfg, history, (text) => {
        answer += text;
        process.stdout.write(text);
      });
    } catch (err) {
      failed = true;
      if (interrupted) {
        interrupted = false;
        process.stdout.write('\n');
        if (answer !== '') history.push({ role: 'assistant', content: answer });
      } else {
        history.pop(); // drop the unanswered turn so the retry starts clean
        console.error(`\nerror: ${friendlyError(err, cfg)}`);
      }
    }
    if (failed) {
      showPrompt(rl);
      continue;
    }
    process.stdout.write('\n');
    console.error(statsLine(usage, Date.now() - started));
    if (answer !== '') history.push({ role: 'assistant', content: answer });
    showPrompt(rl);
  }
  rl.close();
}

// The interface can close (EOF) while an answer is still streaming; Node
// throws ERR_USE_AFTER_CLOSE from prompt() then, and a missing prompt after
// that is fine because no more input will arrive.
function showPrompt(rl: ReturnType<typeof createInterface>): void {
  try {
    rl.prompt();
  } catch {
    // interface closed
  }
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed === null) {
    usage();
    return 1;
  }
  if (parsed.help) {
    usage();
    return 0;
  }
  const cfg = resolveConfig(parsed);
  if (cfg === null) return 1;
  if (parsed.positional.length > 0) {
    return oneShot(cfg, parsed.positional.join(' '));
  }
  await repl(cfg);
  return 0;
}

main().then((code: number) => {
  if (code !== 0) process.exit(code);
});
