// The child file lib-node-worker-entry.ts forks: a second entry point of its
// binary (run on its own, it does nothing)
const greeting = 'hello from the child';

process.on('message', (msg: any) => {
  process.send?.({ reply: greeting, got: msg, argv: process.argv.slice(2) });
  process.disconnect?.();
});
