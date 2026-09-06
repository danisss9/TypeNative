// TypeNative extension: synchronous line reading on node:readline.
// Mapped to a Go helper when transpiled; merges with @types/node's declarations
// for type-checking this project itself.
declare module 'node:readline' {
  export function question(prompt: string): string;
}
