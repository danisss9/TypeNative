# OpenAI-compatible chat CLI

A terminal chat client for any OpenAI-compatible API. Answers **stream into
the terminal token by token** while the model is still writing them. It works
with the free OpenRouter API out of the box — no payment, just a key from
[openrouter.ai/keys](https://openrouter.ai/keys) — and with OpenAI, Ollama,
LM Studio, vLLM, or any other server that speaks `/v1/chat/completions`.

Demonstrates: WHATWG `fetch` with a **streaming response body**
(`response.body.getReader()` read in a loop), hand-parsed server-sent events
(`data:` lines, comments, `[DONE]`), `TextDecoder` with `{ stream: true }`,
`AbortController` + `setTimeout` as a request timeout, `node:readline/promises`
driven by `for await`, `JSON.parse` on each chunk, `process.env` / `argv`
handling, and writing deltas to `process.stdout` the moment they arrive — all
in one dependency-free file that runs unchanged under Node and as a compiled
binary.

## Usage

```sh
openai-chat                                  # interactive multi-turn REPL
openai-chat "Explain SSE in one sentence"    # one question, streamed answer, exit
openai-chat --model google/gemma-4-31b-it:free
openai-chat --system "Answer in as few words as possible"
```

In the REPL each message sees the whole conversation. Slash commands:
`/exit` (or Ctrl+D) quits, `/clear` resets the conversation,
`/system <text>` sets or replaces the system prompt. Ctrl+C aborts the answer
in flight without killing the session.

| Option | Meaning | Default |
|--------|---------|---------|
| `--model <id>` | Model id | provider default (`google/gemma-4-31b-it:free` on OpenRouter, `gpt-4o-mini` on OpenAI) |
| `--base-url <url>` | API root | `https://openrouter.ai/api/v1`, or `https://api.openai.com/v1` when only `OPENAI_API_KEY` is set |
| `--api-key <key>` | API key | `OPENROUTER_API_KEY`, else `OPENAI_API_KEY` |
| `--system <prompt>` | System prompt | none |
| `--max-tokens <n>` | Cap on generated tokens | provider default |

Other OpenAI-compatible servers, no account needed:

```sh
ollama serve    # then:
openai-chat --base-url http://127.0.0.1:11434/v1 --api-key ollama --model llama3.2
```

A one-shot run keeps stdout clean — only the answer goes to stdout, the
token/time stats go to stderr — so piping works:

```sh
openai-chat "write a haiku about go channels" | tee haiku.txt
```

## Run it

Get a free OpenRouter key, then:

```sh
# sh
export OPENROUTER_API_KEY=sk-or-...
node main.ts "hello!"                 # under Node.js 24+
```

```sh
# with TypeNative, build one binary and run it
npx typenative --source main.ts --output dist/openai-chat.exe --release
./dist/openai-chat.exe
```

From a checkout of this repository:

```sh
node bin/cli.js --source examples/openai-chat/main.ts --output dist/openai-chat.exe
```

## How the streaming works

`streamChat` POSTs the conversation with `stream: true` and
`stream_options: { include_usage: true }`. The response body is a
server-sent-event stream, read incrementally:

```ts
const reader = response.body.getReader();
const decoder = new TextDecoder();
while (!finished) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });   // don't split UTF-8 mid-character
  // ... peel off complete lines, collect `data:` lines, dispatch on blank lines
}
```

One SSE event is one or more `data:` lines ended by a blank line; the line
`data: [DONE]` ends the stream, and `: OPENROUTER PROCESSING` comment lines
(the provider's keep-alive) are ignored. Each event's JSON carries a
`choices[0].delta.content` fragment, which is printed as it arrives. A
malformed frame is skipped, not fatal. Errors surface the provider's own
message (`HTTP 401: No auth credentials found`), connection failures get a
friendly hint, and every request is bounded by an `AbortController` timeout.

## Benchmark: Node.js vs TypeNative

Reproduce with `node bench.mjs [runs=30]`. A real API call spends its time
waiting on the model, which would hide any client-side difference, so the
bench stands up a local mock API (plain `node:http`) that answers
`POST /v1/chat/completions` with a deterministic 46-chunk event stream sent
with pauses between chunks — the same shape OpenRouter and OpenAI return.
First both runtimes answer the same question once and their stdout is
compared byte for byte (**parity: identical, and equal to the streamed
answer**). Then it times full process runs (spawn to exit) of the one-shot
client, which covers startup, the HTTP round trip, and parsing the stream as
it arrives.

**Environment:** Windows 11 Pro, AMD Ryzen 5 5500U, Node v24.19.0, Go 1.26.0,
TypeNative 0.5.0 (unreleased changes), default (non-`--release`) build.

| Runtime    | min       | median    | mean      | max       |
|------------|-----------|-----------|-----------|-----------|
| Node.js    | 832.20 ms | 864.20 ms | 868.11 ms | 916.76 ms |
| TypeNative | 668.19 ms | 716.66 ms | 712.19 ms | 740.19 ms |

**TypeNative is 1.2x faster per answer** (median). The ratio looks small
because both runtimes spend most of each run waiting for the mock's paced
chunks — that part is identical by construction. The client-side share
(startup, connect, first byte) is where they differ: about 150 ms of the
median run, mostly Node's ~100 ms startup. For an interactive chat session
the numbers that matter are the first token and memory, and the binary starts
about 7x faster and holds a fraction of Node's idle memory.

## Notes for your own streaming clients

Two TypeScript patterns that look natural but hit transpiler sharp edges
while writing this example (both are avoided above; TypeNative 0.4.1):

- `continue`/`break` out of a loop from inside a `catch` block does not
  compile (`continue is not in a loop`) — the catch is emitted as its own Go
  function. Set a flag in the catch and act on it after.
- `return` inside a `catch` block sets the return value but **falls through**
  to the statements after the try/catch, unlike Node. Assign a result
  variable instead:

  ```ts
  try { throw new Error('boom'); } catch { return 42; }
  console.error('reached in Go, skipped in Node');
  ```

Streaming itself needs no special support: `fetch`, reader loops, async
iteration over readline, and `AbortController` all behave as under Node.
