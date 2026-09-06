// Type definitions for TypeNative NPM standard library modules

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function dirname(p: string): string;
  export function basename(p: string, ext?: string): string;
  export function extname(p: string): string;
  export function resolve(...parts: string[]): string;
}

declare module 'node:fs' {
  export function readFileSync(path: string): string;
  export function writeFileSync(path: string, content: string): void;
  export function appendFileSync(path: string, content: string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function readdirSync(path: string): string[];
  export function copyFileSync(src: string, dest: string): void;
  export function rmSync(path: string, options?: { recursive?: boolean }): void;
}

declare module 'node:url' {
  export function fileURLToPath(url: string): string;
  export function pathToFileURL(path: string): string;
}

declare module 'node:os' {
  export function platform(): string;
  export function homedir(): string;
  export function tmpdir(): string;
}

declare module 'node:child_process' {
  export interface ExecResult {
    stdout: string;
    stderr: string;
    status: number;
  }
  export function exec(command: string): ExecResult;
  export function execSync(command: string): string;
  export function spawnSync(file: string, args: string[], options?: object): ExecResult;
  export function spawnInherit(file: string, ...args: string[]): number;
}

declare module 'node:readline' {
  // TypeNative extension: synchronous line reading (mapped to a Go helper).
  // Not part of Node's real readline API — used by self-hosted prompts.
  export function question(prompt: string): string;
}
