// Type definitions for the Node.js standard library modules TypeNative lowers
// to Go (see conformance.md for the feature matrix). Signatures follow
// @types/node; only what the transpiler implements is declared.
// `readline.question()` is a TypeNative extension (synchronous line input).
//
// Each module uses `export =` so named, default and namespace imports all work;
// bare specifiers ('fs') and subpaths ('fs/promises') re-export the `node:` ones.

declare module 'node:path' {
  namespace path {
    interface ParsedPath {
      root: string;
      dir: string;
      base: string;
      ext: string;
      name: string;
    }
    interface FormatInputPathObject {
      root?: string;
      dir?: string;
      base?: string;
      ext?: string;
      name?: string;
    }
    interface PlatformPath {
      readonly sep: '\\' | '/';
      readonly delimiter: ';' | ':';
      join(...paths: string[]): string;
      resolve(...paths: string[]): string;
      normalize(path: string): string;
      relative(from: string, to: string): string;
      dirname(path: string): string;
      basename(path: string, suffix?: string): string;
      extname(path: string): string;
      isAbsolute(path: string): boolean;
      parse(path: string): ParsedPath;
      format(pathObject: FormatInputPathObject): string;
      toNamespacedPath(path: string): string;
      readonly posix: PlatformPath;
      readonly win32: PlatformPath;
    }
  }
  const path: path.PlatformPath;
  export = path;
}
declare module 'node:path/posix' {
  import path = require('node:path');
  const posix: path.PlatformPath;
  export = posix;
}
declare module 'node:path/win32' {
  import path = require('node:path');
  const win32: path.PlatformPath;
  export = win32;
}

declare module 'node:buffer' {
  namespace buffer {
    const Buffer: BufferConstructor;
    type Buffer = globalThis.Buffer;
    function atob(data: string): string;
    function btoa(data: string): string;
    const constants: { readonly MAX_LENGTH: number };
    const Blob: typeof globalThis.Blob;
    type Blob = globalThis.Blob;
    const File: typeof globalThis.File;
    type File = globalThis.File;
  }
  export = buffer;
}

declare module 'node:fs' {
  import { Readable, Writable } from 'node:stream';
  namespace fs {
    type PathLike = string;
    type EncodingOption = BufferEncoding | { encoding?: BufferEncoding | null; flag?: string } | null;
    interface StatsBase {
      isFile(): boolean;
      isDirectory(): boolean;
      isSymbolicLink(): boolean;
      isFIFO(): boolean;
      isSocket(): boolean;
      isBlockDevice(): boolean;
      isCharacterDevice(): boolean;
    }
    interface Stats extends StatsBase {
      dev: number;
      ino: number;
      mode: number;
      nlink: number;
      uid: number;
      gid: number;
      rdev: number;
      size: number;
      blksize: number;
      blocks: number;
      atimeMs: number;
      mtimeMs: number;
      ctimeMs: number;
      birthtimeMs: number;
      atime: Date;
      mtime: Date;
      ctime: Date;
      birthtime: Date;
    }
    interface Dirent extends StatsBase {
      name: string;
      parentPath: string;
      path: string;
    }
    interface WriteFileOptions {
      encoding?: BufferEncoding | null;
      flag?: string;
      mode?: number;
    }
    interface MakeDirectoryOptions {
      recursive?: boolean;
      mode?: number;
    }
    interface RmOptions {
      recursive?: boolean;
      force?: boolean;
    }
    interface ReadStream extends Readable {
      readonly path: string;
      readonly bytesRead: number;
    }
    interface WriteStream extends Writable {
      readonly path: string;
      readonly bytesWritten: number;
    }
    type NoParamCallback = (err: NodeJS.ErrnoException | null) => void;

    const constants: {
      readonly F_OK: number;
      readonly R_OK: number;
      readonly W_OK: number;
      readonly X_OK: number;
      readonly COPYFILE_EXCL: number;
      readonly COPYFILE_FICLONE: number;
      readonly COPYFILE_FICLONE_FORCE: number;
      readonly O_RDONLY: number;
      readonly O_WRONLY: number;
      readonly O_RDWR: number;
      readonly S_IFMT: number;
      readonly S_IFREG: number;
      readonly S_IFDIR: number;
      readonly S_IFLNK: number;
    };
    const F_OK: number;
    const R_OK: number;
    const W_OK: number;
    const X_OK: number;

    // --- sync ---
    function readFileSync(path: PathLike | number, options?: { encoding?: null; flag?: string } | null): Buffer;
    function readFileSync(path: PathLike | number, options: BufferEncoding | { encoding: BufferEncoding; flag?: string }): string;
    function writeFileSync(file: PathLike | number, data: string | Uint8Array, options?: WriteFileOptions | BufferEncoding): void;
    function appendFileSync(file: PathLike | number, data: string | Uint8Array, options?: WriteFileOptions | BufferEncoding): void;
    function existsSync(path: PathLike): boolean;
    function mkdirSync(path: PathLike, options?: MakeDirectoryOptions | number): string | undefined;
    function readdirSync(path: PathLike, options?: BufferEncoding | { encoding?: BufferEncoding; withFileTypes?: false; recursive?: boolean }): string[];
    function readdirSync(path: PathLike, options: { withFileTypes: true; recursive?: boolean }): Dirent[];
    function statSync(path: PathLike, options?: { throwIfNoEntry?: true }): Stats;
    function statSync(path: PathLike, options: { throwIfNoEntry: false }): Stats | undefined;
    function lstatSync(path: PathLike, options?: { throwIfNoEntry?: true }): Stats;
    function lstatSync(path: PathLike, options: { throwIfNoEntry: false }): Stats | undefined;
    function fstatSync(fd: number): Stats;
    function renameSync(oldPath: PathLike, newPath: PathLike): void;
    function rmSync(path: PathLike, options?: RmOptions): void;
    function rmdirSync(path: PathLike, options?: { recursive?: boolean }): void;
    function unlinkSync(path: PathLike): void;
    function copyFileSync(src: PathLike, dest: PathLike, mode?: number): void;
    function cpSync(source: string, destination: string, options?: { recursive?: boolean; force?: boolean }): void;
    function realpathSync(path: PathLike): string;
    namespace realpathSync {
      function native(path: PathLike): string;
    }
    function mkdtempSync(prefix: string): string;
    function truncateSync(path: PathLike, len?: number): void;
    function chmodSync(path: PathLike, mode: number | string): void;
    function utimesSync(path: PathLike, atime: number | string | Date, mtime: number | string | Date): void;
    function symlinkSync(target: PathLike, path: PathLike, type?: string): void;
    function readlinkSync(path: PathLike): string;
    function linkSync(existingPath: PathLike, newPath: PathLike): void;
    function accessSync(path: PathLike, mode?: number): void;
    function openSync(path: PathLike, flags?: string, mode?: number | string): number;
    function closeSync(fd: number): void;
    function readSync(fd: number, buffer: Uint8Array, offset?: number, length?: number, position?: number | null): number;
    function writeSync(fd: number, buffer: Uint8Array, offset?: number, length?: number, position?: number | null): number;
    function writeSync(fd: number, string: string, position?: number | null): number;
    function fsyncSync(fd: number): void;
    function ftruncateSync(fd: number, len?: number): void;

    // --- callbacks: work on a goroutine, the callback on the event loop ---
    function readFile(path: PathLike, callback: (err: NodeJS.ErrnoException | null, data: Buffer) => void): void;
    function readFile(path: PathLike, options: { encoding?: null; flag?: string } | null | undefined, callback: (err: NodeJS.ErrnoException | null, data: Buffer) => void): void;
    function readFile(path: PathLike, options: BufferEncoding | { encoding: BufferEncoding; flag?: string }, callback: (err: NodeJS.ErrnoException | null, data: string) => void): void;
    function writeFile(file: PathLike, data: string | Uint8Array, callback: NoParamCallback): void;
    function writeFile(file: PathLike, data: string | Uint8Array, options: WriteFileOptions | BufferEncoding, callback: NoParamCallback): void;
    function appendFile(file: PathLike, data: string | Uint8Array, callback: NoParamCallback): void;
    function appendFile(file: PathLike, data: string | Uint8Array, options: WriteFileOptions | BufferEncoding, callback: NoParamCallback): void;
    function mkdir(path: PathLike, callback: (err: NodeJS.ErrnoException | null, path?: string) => void): void;
    function mkdir(path: PathLike, options: MakeDirectoryOptions | number, callback: (err: NodeJS.ErrnoException | null, path?: string) => void): void;
    function readdir(path: PathLike, callback: (err: NodeJS.ErrnoException | null, files: string[]) => void): void;
    function readdir(path: PathLike, options: { withFileTypes?: false; recursive?: boolean } | BufferEncoding, callback: (err: NodeJS.ErrnoException | null, files: string[]) => void): void;
    function readdir(path: PathLike, options: { withFileTypes: true; recursive?: boolean }, callback: (err: NodeJS.ErrnoException | null, files: Dirent[]) => void): void;
    function stat(path: PathLike, callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void): void;
    function lstat(path: PathLike, callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void): void;
    function unlink(path: PathLike, callback: NoParamCallback): void;
    function rm(path: PathLike, callback: NoParamCallback): void;
    function rm(path: PathLike, options: RmOptions, callback: NoParamCallback): void;
    function rmdir(path: PathLike, callback: NoParamCallback): void;
    function rename(oldPath: PathLike, newPath: PathLike, callback: NoParamCallback): void;
    function copyFile(src: PathLike, dest: PathLike, callback: NoParamCallback): void;
    function copyFile(src: PathLike, dest: PathLike, mode: number, callback: NoParamCallback): void;
    function cp(source: string, destination: string, options: { recursive?: boolean; force?: boolean }, callback: NoParamCallback): void;
    function access(path: PathLike, callback: NoParamCallback): void;
    function access(path: PathLike, mode: number, callback: NoParamCallback): void;
    function realpath(path: PathLike, callback: (err: NodeJS.ErrnoException | null, resolvedPath: string) => void): void;
    function mkdtemp(prefix: string, callback: (err: NodeJS.ErrnoException | null, folder: string) => void): void;
    function truncate(path: PathLike, len: number, callback: NoParamCallback): void;
    function chmod(path: PathLike, mode: number | string, callback: NoParamCallback): void;
    function utimes(path: PathLike, atime: number | string | Date, mtime: number | string | Date, callback: NoParamCallback): void;
    function symlink(target: PathLike, path: PathLike, callback: NoParamCallback): void;
    function readlink(path: PathLike, callback: (err: NodeJS.ErrnoException | null, linkString: string) => void): void;
    function link(existingPath: PathLike, newPath: PathLike, callback: NoParamCallback): void;
    /** @deprecated */
    function exists(path: PathLike, callback: (exists: boolean) => void): void;

    // --- streams ---
    function createReadStream(path: PathLike, options?: BufferEncoding | { encoding?: BufferEncoding; start?: number; end?: number; highWaterMark?: number }): ReadStream;
    function createWriteStream(path: PathLike, options?: BufferEncoding | { flags?: string; encoding?: BufferEncoding }): WriteStream;

    const promises: typeof import('node:fs/promises');
  }
  export = fs;
}

declare module 'node:fs/promises' {
  import fs = require('node:fs');
  namespace promises {
    interface FileHandle {
      readonly fd: number;
      readFile(options?: { encoding?: null } | null): Promise<Buffer>;
      readFile(options: BufferEncoding | { encoding: BufferEncoding }): Promise<string>;
      writeFile(data: string | Uint8Array, options?: fs.WriteFileOptions | BufferEncoding): Promise<void>;
      appendFile(data: string | Uint8Array, options?: fs.WriteFileOptions | BufferEncoding): Promise<void>;
      read(buffer: Uint8Array, offset?: number, length?: number, position?: number | null): Promise<{ bytesRead: number; buffer: Buffer }>;
      write(data: string | Uint8Array, ...args: any[]): Promise<{ bytesWritten: number; buffer: any }>;
      stat(): Promise<fs.Stats>;
      truncate(len?: number): Promise<void>;
      sync(): Promise<void>;
      close(): Promise<void>;
    }
    const constants: typeof fs.constants;
    function readFile(path: fs.PathLike, options?: { encoding?: null; flag?: string } | null): Promise<Buffer>;
    function readFile(path: fs.PathLike, options: BufferEncoding | { encoding: BufferEncoding; flag?: string }): Promise<string>;
    function writeFile(file: fs.PathLike, data: string | Uint8Array, options?: fs.WriteFileOptions | BufferEncoding): Promise<void>;
    function appendFile(file: fs.PathLike, data: string | Uint8Array, options?: fs.WriteFileOptions | BufferEncoding): Promise<void>;
    function mkdir(path: fs.PathLike, options?: fs.MakeDirectoryOptions | number): Promise<string | undefined>;
    function readdir(path: fs.PathLike, options?: BufferEncoding | { withFileTypes?: false; recursive?: boolean }): Promise<string[]>;
    function readdir(path: fs.PathLike, options: { withFileTypes: true; recursive?: boolean }): Promise<fs.Dirent[]>;
    function stat(path: fs.PathLike): Promise<fs.Stats>;
    function lstat(path: fs.PathLike): Promise<fs.Stats>;
    function unlink(path: fs.PathLike): Promise<void>;
    function rm(path: fs.PathLike, options?: fs.RmOptions): Promise<void>;
    function rmdir(path: fs.PathLike, options?: { recursive?: boolean }): Promise<void>;
    function rename(oldPath: fs.PathLike, newPath: fs.PathLike): Promise<void>;
    function copyFile(src: fs.PathLike, dest: fs.PathLike, mode?: number): Promise<void>;
    function cp(source: string, destination: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
    function access(path: fs.PathLike, mode?: number): Promise<void>;
    function realpath(path: fs.PathLike): Promise<string>;
    function mkdtemp(prefix: string): Promise<string>;
    function truncate(path: fs.PathLike, len?: number): Promise<void>;
    function chmod(path: fs.PathLike, mode: number | string): Promise<void>;
    function utimes(path: fs.PathLike, atime: number | string | Date, mtime: number | string | Date): Promise<void>;
    function symlink(target: fs.PathLike, path: fs.PathLike): Promise<void>;
    function readlink(path: fs.PathLike): Promise<string>;
    function link(existingPath: fs.PathLike, newPath: fs.PathLike): Promise<void>;
    function open(path: fs.PathLike, flags?: string, mode?: number | string): Promise<FileHandle>;
  }
  export = promises;
}

declare module 'node:url' {
  namespace url {
    const URL: typeof globalThis.URL;
    type URL = globalThis.URL;
    const URLSearchParams: typeof globalThis.URLSearchParams;
    type URLSearchParams = globalThis.URLSearchParams;
    function fileURLToPath(url: string | URL): string;
    function pathToFileURL(path: string): URL;
    function format(url: URL | string): string;
    function domainToASCII(domain: string): string;
    function domainToUnicode(domain: string): string;
  }
  export = url;
}

declare module 'node:querystring' {
  namespace querystring {
    interface ParsedUrlQuery {
      [key: string]: string | string[] | undefined;
    }
    type ParsedUrlQueryInput = { [key: string]: string | number | boolean | bigint | readonly (string | number | boolean | bigint)[] | null | undefined };
    function parse(str: string, sep?: string, eq?: string): ParsedUrlQuery;
    function decode(str: string, sep?: string, eq?: string): ParsedUrlQuery;
    function stringify(obj: ParsedUrlQueryInput, sep?: string, eq?: string): string;
    function encode(obj: ParsedUrlQueryInput, sep?: string, eq?: string): string;
    function escape(str: string): string;
    function unescape(str: string): string;
  }
  export = querystring;
}

declare module 'node:punycode' {
  /** @deprecated punycode is deprecated upstream */
  namespace punycode {
    function encode(input: string): string;
    function decode(input: string): string;
    function toASCII(domain: string): string;
    function toUnicode(domain: string): string;
    const version: string;
  }
  export = punycode;
}

declare module 'node:string_decoder' {
  namespace string_decoder {
    class StringDecoder {
      constructor(encoding?: BufferEncoding);
      readonly encoding: BufferEncoding;
      write(buffer: string | Uint8Array): string;
      end(buffer?: string | Uint8Array): string;
    }
  }
  export = string_decoder;
}

declare module 'node:os' {
  namespace os {
    interface UserInfo {
      username: string;
      uid: number;
      gid: number;
      shell: string | null;
      homedir: string;
    }
    interface CpuInfo {
      model: string;
      speed: number;
      times: { user: number; nice: number; sys: number; idle: number; irq: number };
    }
    interface NetworkInterfaceInfo {
      address: string;
      netmask: string;
      family: 'IPv4' | 'IPv6';
      mac: string;
      internal: boolean;
      cidr: string | null;
      scopeid?: number;
    }
    const EOL: string;
    const devNull: string;
    const constants: { readonly signals: { readonly [name: string]: number; readonly SIGINT: number; readonly SIGTERM: number; readonly SIGKILL: number; readonly SIGHUP: number } };
    function platform(): string;
    function arch(): string;
    function type(): string;
    function machine(): string;
    function hostname(): string;
    function homedir(): string;
    function tmpdir(): string;
    function endianness(): 'BE' | 'LE';
    function userInfo(): UserInfo;
    function cpus(): CpuInfo[];
    function availableParallelism(): number;
    function networkInterfaces(): Record<string, NetworkInterfaceInfo[]>;
  }
  export = os;
}

declare module 'node:process' {
  const process: Process;
  export = process;
}

declare module 'node:console' {
  namespace console {
    class Console {
      constructor(stdout: import('node:stream').Writable, stderr?: import('node:stream').Writable);
      constructor(options: { stdout: import('node:stream').Writable; stderr?: import('node:stream').Writable });
      log(...data: any[]): void;
      info(...data: any[]): void;
      debug(...data: any[]): void;
      error(...data: any[]): void;
      warn(...data: any[]): void;
      dir(item: any, options?: { depth?: number | null }): void;
    }
    function log(...data: any[]): void;
    function info(...data: any[]): void;
    function debug(...data: any[]): void;
    function error(...data: any[]): void;
    function warn(...data: any[]): void;
    function dir(item: any, options?: { depth?: number | null }): void;
    function count(label?: string): void;
    function countReset(label?: string): void;
    function group(...label: any[]): void;
    function groupEnd(): void;
    function time(label?: string): void;
    function timeEnd(label?: string): void;
    function timeLog(label?: string, ...data: any[]): void;
    function trace(...data: any[]): void;
    function assert(condition?: boolean, ...data: any[]): void;
  }
  export = console;
}

declare module 'node:util' {
  namespace util {
    interface InspectOptions {
      depth?: number | null;
      breakLength?: number;
      compact?: boolean | number;
    }
    function format(format?: any, ...param: any[]): string;
    function formatWithOptions(inspectOptions: InspectOptions, format?: any, ...param: any[]): string;
    function inspect(object: any, options?: InspectOptions): string;
    function isDeepStrictEqual(val1: unknown, val2: unknown): boolean;
    function deprecate<T extends (...args: any[]) => any>(fn: T, msg: string, code?: string): T;
    function stripVTControlCharacters(str: string): string;
    function styleText(format: string | string[], text: string, options?: { validateStream?: boolean }): string;
    /** @deprecated */
    function isArray(object: unknown): object is unknown[];
    // Node callback functions map to their promise variants (fs.readFile → fs/promises.readFile,
    // exec → { stdout, stderr }); other (…args, (err, value) => void) functions are wrapped
    function promisify(fn: typeof import('node:child_process').exec): (command: string, options?: { cwd?: string; env?: Record<string, string | undefined> }) => Promise<{ stdout: string; stderr: string }>;
    function promisify(fn: typeof import('node:child_process').execFile): (file: string, args?: readonly string[], options?: { cwd?: string }) => Promise<{ stdout: string; stderr: string }>;
    function promisify(fn: typeof globalThis.setTimeout): <T = void>(ms?: number, value?: T) => Promise<T>;
    function promisify(fn: typeof import('node:fs').readFile): typeof import('node:fs/promises').readFile;
    function promisify(fn: typeof import('node:fs').writeFile): typeof import('node:fs/promises').writeFile;
    function promisify<T, A extends any[]>(fn: (...args: [...A, (err: any, result?: T) => void]) => void): (...args: A) => Promise<T>;
    function promisify(fn: Function): (...args: any[]) => Promise<any>;
    function callbackify<T, A extends any[]>(fn: (...args: A) => Promise<T>): (...args: [...A, (err: unknown, result: T) => void]) => void;
    const types: typeof import('node:util/types');
    const TextEncoder: typeof globalThis.TextEncoder;
    const TextDecoder: typeof globalThis.TextDecoder;
  }
  export = util;
}

declare module 'node:util/types' {
  namespace types {
    function isDate(object: unknown): object is Date;
    function isRegExp(object: unknown): object is RegExp;
    function isPromise(object: unknown): object is Promise<unknown>;
    function isMap(object: unknown): object is Map<unknown, unknown>;
    function isSet(object: unknown): object is Set<unknown>;
    function isNativeError(object: unknown): object is Error;
    function isUint8Array(object: unknown): object is Uint8Array;
    function isAnyArrayBuffer(object: unknown): boolean;
    function isBoxedPrimitive(object: unknown): boolean;
    function isGeneratorObject(object: unknown): boolean;
    function isAsyncFunction(object: unknown): boolean;
  }
  export = types;
}

declare module 'node:assert' {
  function assert(value: unknown, message?: string | Error): asserts value;
  namespace assert {
    class AssertionError extends Error {
      actual: unknown;
      expected: unknown;
      operator: string;
      generatedMessage: boolean;
      code: 'ERR_ASSERTION';
    }
    type ErrorValidator = RegExp | Function | { message?: string | RegExp; code?: string; name?: string } | ((err: any) => boolean);
    function ok(value: unknown, message?: string | Error): asserts value;
    function equal(actual: unknown, expected: unknown, message?: string | Error): void;
    function notEqual(actual: unknown, expected: unknown, message?: string | Error): void;
    function strictEqual<T>(actual: unknown, expected: T, message?: string | Error): asserts actual is T;
    function notStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
    function deepEqual(actual: unknown, expected: unknown, message?: string | Error): void;
    function notDeepEqual(actual: unknown, expected: unknown, message?: string | Error): void;
    function deepStrictEqual<T>(actual: unknown, expected: T, message?: string | Error): asserts actual is T;
    function notDeepStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
    function throws(block: () => unknown, message?: string | Error): void;
    function throws(block: () => unknown, error: ErrorValidator, message?: string | Error): void;
    function doesNotThrow(block: () => unknown, message?: string | Error): void;
    function rejects(block: (() => Promise<unknown>) | Promise<unknown>, message?: string | Error): Promise<void>;
    function rejects(block: (() => Promise<unknown>) | Promise<unknown>, error: ErrorValidator, message?: string | Error): Promise<void>;
    function doesNotReject(block: (() => Promise<unknown>) | Promise<unknown>, message?: string | Error): Promise<void>;
    function match(value: string, regExp: RegExp, message?: string | Error): void;
    function doesNotMatch(value: string, regExp: RegExp, message?: string | Error): void;
    function fail(message?: string | Error): never;
    function ifError(value: unknown): asserts value is null | undefined;
    const strict: typeof assert;
  }
  export = assert;
}
declare module 'node:assert/strict' {
  import assert = require('node:assert');
  export = assert;
}

declare module 'node:crypto' {
  namespace crypto {
    type BinaryLike = string | Uint8Array;
    type BinaryToTextEncoding = 'base64' | 'base64url' | 'hex' | 'binary';
    interface Hash {
      update(data: BinaryLike, inputEncoding?: BufferEncoding): Hash;
      digest(): Buffer;
      digest(encoding: BinaryToTextEncoding | BufferEncoding): string;
      copy(): Hash;
    }
    interface Hmac {
      update(data: BinaryLike, inputEncoding?: BufferEncoding): Hmac;
      digest(): Buffer;
      digest(encoding: BinaryToTextEncoding | BufferEncoding): string;
    }
    interface Cipheriv {
      update(data: BinaryLike): Buffer;
      update(data: string, inputEncoding: BufferEncoding | undefined, outputEncoding: BufferEncoding): string;
      final(): Buffer;
      final(outputEncoding: BufferEncoding): string;
      setAAD(buffer: Uint8Array, options?: { plaintextLength: number }): this;
      getAuthTag(): Buffer;
      setAutoPadding(autoPadding?: boolean): this;
    }
    interface Decipheriv {
      update(data: Uint8Array): Buffer;
      update(data: string, inputEncoding: BufferEncoding, outputEncoding: BufferEncoding): string;
      final(): Buffer;
      final(outputEncoding: BufferEncoding): string;
      setAAD(buffer: Uint8Array, options?: { plaintextLength: number }): this;
      setAuthTag(buffer: Uint8Array): this;
      setAutoPadding(autoPadding?: boolean): this;
    }
    function createHash(algorithm: string): Hash;
    function createHmac(algorithm: string, key: BinaryLike): Hmac;
    function hash(algorithm: string, data: BinaryLike, outputEncoding?: BinaryToTextEncoding): string;
    function getHashes(): string[];
    function getCiphers(): string[];
    function randomBytes(size: number): Buffer;
    function randomUUID(): string;
    function randomInt(max: number): number;
    function randomInt(min: number, max: number): number;
    function getRandomValues<T extends Uint8Array>(typedArray: T): T;
    function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
    function pbkdf2Sync(password: BinaryLike, salt: BinaryLike, iterations: number, keylen: number, digest: string): Buffer;
    function hkdfSync(digest: string, ikm: BinaryLike, salt: BinaryLike, info: BinaryLike, keylen: number): ArrayBuffer;
    function createCipheriv(algorithm: string, key: BinaryLike, iv: BinaryLike): Cipheriv;
    function createDecipheriv(algorithm: string, key: BinaryLike, iv: BinaryLike): Decipheriv;
    const webcrypto: typeof crypto;

    // scrypt, callback forms
    interface ScryptOptions {
      cost?: number;
      blockSize?: number;
      parallelization?: number;
      N?: number;
      r?: number;
      p?: number;
      maxmem?: number;
    }
    function scryptSync(password: BinaryLike, salt: BinaryLike, keylen: number, options?: ScryptOptions): Buffer;
    function scrypt(password: BinaryLike, salt: BinaryLike, keylen: number, callback: (err: Error | null, derivedKey: Buffer) => void): void;
    function scrypt(password: BinaryLike, salt: BinaryLike, keylen: number, options: ScryptOptions, callback: (err: Error | null, derivedKey: Buffer) => void): void;
    function pbkdf2(password: BinaryLike, salt: BinaryLike, iterations: number, keylen: number, digest: string, callback: (err: Error | null, derivedKey: Buffer) => void): void;
    function hkdf(digest: string, ikm: BinaryLike, salt: BinaryLike, info: BinaryLike, keylen: number, callback: (err: Error | null, derivedKey: ArrayBuffer) => void): void;
    function randomBytes(size: number, callback: (err: Error | null, buf: Buffer) => void): void;
    function randomFillSync<T extends Uint8Array>(buffer: T, offset?: number, size?: number): T;
    function randomFill<T extends Uint8Array>(buffer: T, callback: (err: Error | null, buf: T) => void): void;
    function randomFill<T extends Uint8Array>(buffer: T, offset: number, callback: (err: Error | null, buf: T) => void): void;
    function randomFill<T extends Uint8Array>(buffer: T, offset: number, size: number, callback: (err: Error | null, buf: T) => void): void;

    // Keys
    type KeyObjectType = 'secret' | 'public' | 'private';
    type KeyType = 'rsa' | 'ec' | 'ed25519' | 'x25519';
    type KeyFormat = 'pem' | 'der' | 'jwk';
    interface JsonWebKey {
      kty?: string;
      crv?: string;
      x?: string;
      y?: string;
      d?: string;
      n?: string;
      e?: string;
      k?: string;
      [key: string]: unknown;
    }
    interface AsymmetricKeyDetails {
      modulusLength?: number;
      publicExponent?: bigint;
      namedCurve?: string;
    }
    interface KeyExportOptions<T extends KeyFormat> {
      type?: 'pkcs1' | 'spki' | 'pkcs8' | 'sec1';
      format: T;
    }
    interface JwkKeyExportOptions {
      format: 'jwk';
    }
    class KeyObject {
      private constructor();
      static from(key: webcrypto.CryptoKey): KeyObject;
      readonly type: KeyObjectType;
      readonly asymmetricKeyType?: KeyType;
      readonly asymmetricKeyDetails?: AsymmetricKeyDetails;
      readonly symmetricKeySize?: number;
      export(options: KeyExportOptions<'pem'>): string;
      export(options: KeyExportOptions<'der'>): Buffer;
      export(options: JwkKeyExportOptions): JsonWebKey;
      export(options?: { format?: 'buffer' }): Buffer;
      equals(otherKeyObject: KeyObject): boolean;
    }
    interface PrivateKeyInput {
      key: string | Buffer;
      format?: KeyFormat;
      type?: 'pkcs1' | 'pkcs8' | 'sec1';
      passphrase?: string | Buffer;
      encoding?: string;
    }
    interface PublicKeyInput {
      key: string | Buffer;
      format?: KeyFormat;
      type?: 'pkcs1' | 'spki';
      encoding?: string;
    }
    interface JsonWebKeyInput {
      key: JsonWebKey;
      format: 'jwk';
    }
    type KeyLike = string | Buffer | KeyObject;
    function createPrivateKey(key: PrivateKeyInput | string | Buffer | JsonWebKeyInput): KeyObject;
    function createPublicKey(key: PublicKeyInput | string | Buffer | KeyObject | JsonWebKeyInput): KeyObject;
    function createSecretKey(key: Uint8Array): KeyObject;
    function createSecretKey(key: string, encoding: BufferEncoding): KeyObject;
    interface BasePrivateKeyEncodingOptions<T extends KeyFormat> {
      format: T;
      cipher?: string;
      passphrase?: string;
    }
    interface KeyPairKeyObjectResult {
      publicKey: KeyObject;
      privateKey: KeyObject;
    }
    interface KeyPairSyncResult<T1 extends string | Buffer, T2 extends string | Buffer> {
      publicKey: T1;
      privateKey: T2;
    }
    interface KeyPairOptions<PubF extends KeyFormat, PrivF extends KeyFormat> {
      modulusLength?: number;
      publicExponent?: number;
      namedCurve?: string;
      publicKeyEncoding: { type: 'pkcs1' | 'spki'; format: PubF };
      privateKeyEncoding: BasePrivateKeyEncodingOptions<PrivF> & { type: 'pkcs1' | 'pkcs8' | 'sec1' };
    }
    interface KeyPairKeyObjectOptions {
      modulusLength?: number;
      publicExponent?: number;
      namedCurve?: string;
    }
    function generateKeyPairSync(type: KeyType, options: KeyPairOptions<'pem', 'pem'>): KeyPairSyncResult<string, string>;
    function generateKeyPairSync(type: KeyType, options: KeyPairOptions<'der', 'der'>): KeyPairSyncResult<Buffer, Buffer>;
    function generateKeyPairSync(type: KeyType, options?: KeyPairKeyObjectOptions): KeyPairKeyObjectResult;
    function generateKeyPair(type: KeyType, options: KeyPairOptions<'pem', 'pem'>, callback: (err: Error | null, publicKey: string, privateKey: string) => void): void;
    function generateKeyPair(type: KeyType, options: KeyPairOptions<'der', 'der'>, callback: (err: Error | null, publicKey: Buffer, privateKey: Buffer) => void): void;
    function generateKeyPair(type: KeyType, options: KeyPairKeyObjectOptions | undefined, callback: (err: Error | null, publicKey: KeyObject, privateKey: KeyObject) => void): void;
    function generateKeyPair(type: KeyType, callback: (err: Error | null, publicKey: KeyObject, privateKey: KeyObject) => void): void;
    function generateKeySync(type: 'hmac' | 'aes', options: { length: number }): KeyObject;
    function generateKey(type: 'hmac' | 'aes', options: { length: number }, callback: (err: Error | null, key: KeyObject) => void): void;

    // Signatures
    interface SigningOptions {
      padding?: number;
      saltLength?: number;
      dsaEncoding?: 'der' | 'ieee-p1363';
    }
    interface SignKeyObjectInput extends SigningOptions {
      key: KeyLike;
    }
    interface SignPrivateKeyInput extends PrivateKeyInput, SigningOptions {}
    interface VerifyKeyObjectInput extends SigningOptions {
      key: KeyLike;
    }
    type SignKey = KeyLike | SignKeyObjectInput | SignPrivateKeyInput;
    function sign(algorithm: string | null | undefined, data: Uint8Array, key: SignKey): Buffer;
    function verify(algorithm: string | null | undefined, data: Uint8Array, key: SignKey | VerifyKeyObjectInput, signature: Uint8Array): boolean;
    interface Sign {
      update(data: BinaryLike, inputEncoding?: BufferEncoding): this;
      sign(privateKey: SignKey): Buffer;
      sign(privateKey: SignKey, outputFormat: BinaryToTextEncoding): string;
    }
    interface Verify {
      update(data: BinaryLike, inputEncoding?: BufferEncoding): this;
      verify(object: SignKey, signature: Uint8Array): boolean;
      verify(object: SignKey, signature: string, signatureEncoding?: BinaryToTextEncoding): boolean;
    }
    function createSign(algorithm: string): Sign;
    function createVerify(algorithm: string): Verify;

    // RSA encryption
    interface RsaKeyInput {
      key: KeyLike;
      padding?: number;
      oaepHash?: string;
      oaepLabel?: Uint8Array;
    }
    function publicEncrypt(key: RsaKeyInput | KeyLike, buffer: Uint8Array | string): Buffer;
    function privateDecrypt(privateKey: RsaKeyInput | KeyLike, buffer: Uint8Array): Buffer;
    function privateEncrypt(privateKey: RsaKeyInput | KeyLike, buffer: Uint8Array | string): Buffer;
    function publicDecrypt(key: RsaKeyInput | KeyLike, buffer: Uint8Array): Buffer;
    const constants: {
      readonly RSA_PKCS1_PADDING: number;
      readonly RSA_NO_PADDING: number;
      readonly RSA_PKCS1_OAEP_PADDING: number;
      readonly RSA_PKCS1_PSS_PADDING: number;
      readonly RSA_PSS_SALTLEN_DIGEST: number;
      readonly RSA_PSS_SALTLEN_MAX_SIGN: number;
      readonly RSA_PSS_SALTLEN_AUTO: number;
    };

    // ECDH / Diffie-Hellman
    type ECDHKeyFormat = 'compressed' | 'uncompressed';
    interface ECDH {
      generateKeys(): Buffer;
      generateKeys(encoding: BinaryToTextEncoding, format?: ECDHKeyFormat): string;
      computeSecret(otherPublicKey: Uint8Array): Buffer;
      computeSecret(otherPublicKey: string, inputEncoding: BinaryToTextEncoding): Buffer;
      computeSecret(otherPublicKey: string | Uint8Array, inputEncoding: BinaryToTextEncoding | undefined, outputEncoding: BinaryToTextEncoding): string;
      getPrivateKey(): Buffer;
      getPrivateKey(encoding: BinaryToTextEncoding): string;
      getPublicKey(): Buffer;
      getPublicKey(encoding: BinaryToTextEncoding, format?: ECDHKeyFormat): string;
      setPrivateKey(privateKey: Uint8Array): void;
      setPrivateKey(privateKey: string, encoding: BinaryToTextEncoding): void;
    }
    function createECDH(curveName: string): ECDH;
    function getCurves(): string[];
    function diffieHellman(options: { privateKey: KeyObject; publicKey: KeyObject }): Buffer;
    interface DiffieHellman {
      readonly verifyError: number;
      generateKeys(): Buffer;
      generateKeys(encoding: BinaryToTextEncoding): string;
      computeSecret(otherPublicKey: Uint8Array): Buffer;
      computeSecret(otherPublicKey: string, inputEncoding: BinaryToTextEncoding): Buffer;
      computeSecret(otherPublicKey: string | Uint8Array, inputEncoding: BinaryToTextEncoding | undefined, outputEncoding: BinaryToTextEncoding): string;
      getPrime(): Buffer;
      getPrime(encoding: BinaryToTextEncoding): string;
      getGenerator(): Buffer;
      getGenerator(encoding: BinaryToTextEncoding): string;
      getPublicKey(): Buffer;
      getPublicKey(encoding: BinaryToTextEncoding): string;
      getPrivateKey(): Buffer;
      getPrivateKey(encoding: BinaryToTextEncoding): string;
      setPublicKey(publicKey: Uint8Array): void;
      setPublicKey(publicKey: string, encoding: BufferEncoding): void;
      setPrivateKey(privateKey: Uint8Array): void;
      setPrivateKey(privateKey: string, encoding: BufferEncoding): void;
    }
    type DiffieHellmanGroup = DiffieHellman;
    function createDiffieHellman(primeLength: number, generator?: number): DiffieHellman;
    function createDiffieHellman(prime: Uint8Array, generator?: number | Uint8Array): DiffieHellman;
    function createDiffieHellman(prime: string, primeEncoding: BinaryToTextEncoding, generator?: number | string, generatorEncoding?: BinaryToTextEncoding): DiffieHellman;
    function getDiffieHellman(groupName: string): DiffieHellmanGroup;
    function createDiffieHellmanGroup(name: string): DiffieHellmanGroup;

    // Primes
    function generatePrimeSync(size: number, options: { bigint: true; safe?: boolean; add?: bigint | Uint8Array; rem?: bigint | Uint8Array }): bigint;
    function generatePrimeSync(size: number, options?: { bigint?: false; safe?: boolean; add?: bigint | Uint8Array; rem?: bigint | Uint8Array }): ArrayBuffer;
    function generatePrime(size: number, options: { bigint: true; safe?: boolean }, callback: (err: Error | null, prime: bigint) => void): void;
    function generatePrime(size: number, callback: (err: Error | null, prime: ArrayBuffer) => void): void;
    function generatePrime(size: number, options: { bigint?: false; safe?: boolean }, callback: (err: Error | null, prime: ArrayBuffer) => void): void;
    function checkPrimeSync(candidate: bigint | Uint8Array, options?: { checks?: number }): boolean;
    function checkPrime(candidate: bigint | Uint8Array, callback: (err: Error | null, result: boolean) => void): void;
    function checkPrime(candidate: bigint | Uint8Array, options: { checks?: number }, callback: (err: Error | null, result: boolean) => void): void;

    // X509Certificate
    class X509Certificate {
      constructor(buffer: string | Uint8Array);
      readonly subject: string;
      readonly issuer: string;
      readonly subjectAltName: string | undefined;
      readonly validFrom: string;
      readonly validTo: string;
      readonly validFromDate: Date;
      readonly validToDate: Date;
      readonly fingerprint: string;
      readonly fingerprint256: string;
      readonly fingerprint512: string;
      readonly serialNumber: string;
      readonly ca: boolean;
      readonly raw: Buffer;
      readonly publicKey: KeyObject;
      readonly keyUsage: string[] | undefined;
      checkHost(name: string, options?: object): string | undefined;
      checkIP(ip: string): string | undefined;
      checkEmail(email: string, options?: object): string | undefined;
      checkIssued(otherCert: X509Certificate): boolean;
      verify(publicKey: KeyObject): boolean;
      toString(): string;
      toJSON(): string;
      toLegacyObject(): Record<string, any>;
    }

    // webcrypto
    const subtle: webcrypto.SubtleCrypto;
    namespace webcrypto {
      type KeyUsage = 'decrypt' | 'deriveBits' | 'deriveKey' | 'encrypt' | 'sign' | 'unwrapKey' | 'verify' | 'wrapKey';
      type KeyFormat = 'jwk' | 'pkcs8' | 'raw' | 'spki';
      type AlgorithmIdentifier = string | { name: string; [key: string]: any };
      type BufferSource = Uint8Array | ArrayBuffer;
      interface CryptoKey {
        readonly type: 'secret' | 'public' | 'private';
        readonly extractable: boolean;
        readonly algorithm: KeyAlgorithm;
        readonly usages: KeyUsage[];
      }
      interface KeyAlgorithm {
        name: string;
        length?: number;
        hash?: { name: string };
        namedCurve?: string;
        modulusLength?: number;
        publicExponent?: Uint8Array;
      }
      interface CryptoKeyPair {
        publicKey: CryptoKey;
        privateKey: CryptoKey;
      }
      interface SubtleCrypto {
        digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer>;
        generateKey(algorithm: { name: 'HMAC' | 'AES-GCM' | 'AES-CBC' | 'AES-CTR'; [key: string]: any }, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
        generateKey(algorithm: { name: 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'RSA-OAEP' | 'ECDSA' | 'ECDH'; [key: string]: any } | 'Ed25519' | 'X25519' | { name: 'Ed25519' | 'X25519' }, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKeyPair>;
        generateKey(algorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKeyPair | CryptoKey>;
        importKey(format: 'jwk', keyData: JsonWebKey, algorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
        importKey(format: 'pkcs8' | 'raw' | 'spki', keyData: BufferSource, algorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
        exportKey(format: 'jwk', key: CryptoKey): Promise<JsonWebKey>;
        exportKey(format: 'pkcs8' | 'raw' | 'spki', key: CryptoKey): Promise<ArrayBuffer>;
        sign(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
        verify(algorithm: AlgorithmIdentifier, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean>;
        encrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
        decrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
        deriveBits(algorithm: AlgorithmIdentifier, baseKey: CryptoKey, length?: number | null): Promise<ArrayBuffer>;
        deriveKey(algorithm: AlgorithmIdentifier, baseKey: CryptoKey, derivedKeyAlgorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
        wrapKey(format: KeyFormat, key: CryptoKey, wrappingKey: CryptoKey, wrapAlgorithm: AlgorithmIdentifier): Promise<ArrayBuffer>;
        unwrapKey(format: KeyFormat, wrappedKey: BufferSource, unwrappingKey: CryptoKey, unwrapAlgorithm: AlgorithmIdentifier, unwrappedKeyAlgorithm: AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
      }
    }
  }
  export = crypto;
}

declare module 'node:zlib' {
  namespace zlib {
    interface ZlibOptions {
      level?: number;
    }
    type InputType = string | Uint8Array;
    function gzipSync(buf: InputType, options?: ZlibOptions): Buffer;
    function gunzipSync(buf: InputType, options?: ZlibOptions): Buffer;
    function deflateSync(buf: InputType, options?: ZlibOptions): Buffer;
    function inflateSync(buf: InputType, options?: ZlibOptions): Buffer;
    function deflateRawSync(buf: InputType, options?: ZlibOptions): Buffer;
    function inflateRawSync(buf: InputType, options?: ZlibOptions): Buffer;
    function unzipSync(buf: InputType, options?: ZlibOptions): Buffer;
    function crc32(data: string | Uint8Array, value?: number): number;
    function createGzip(options?: ZlibOptions): import('node:stream').Transform;
    function createGunzip(options?: ZlibOptions): import('node:stream').Transform;
    function createDeflate(options?: ZlibOptions): import('node:stream').Transform;
    function createInflate(options?: ZlibOptions): import('node:stream').Transform;
    function createDeflateRaw(options?: ZlibOptions): import('node:stream').Transform;
    function createInflateRaw(options?: ZlibOptions): import('node:stream').Transform;
    function createUnzip(options?: ZlibOptions): import('node:stream').Transform;
    const constants: {
      readonly Z_NO_FLUSH: number;
      readonly Z_SYNC_FLUSH: number;
      readonly Z_FULL_FLUSH: number;
      readonly Z_FINISH: number;
      readonly Z_OK: number;
      readonly Z_STREAM_END: number;
      readonly Z_DATA_ERROR: number;
      readonly Z_BUF_ERROR: number;
      readonly Z_NO_COMPRESSION: number;
      readonly Z_BEST_SPEED: number;
      readonly Z_BEST_COMPRESSION: number;
      readonly Z_DEFAULT_COMPRESSION: number;
    };
  }
  export = zlib;
}

declare module 'node:timers' {
  namespace timers {
    function setTimeout<A extends any[]>(callback: (...args: A) => void, ms?: number, ...args: A): number;
    function clearTimeout(timeout?: number): void;
    function setInterval<A extends any[]>(callback: (...args: A) => void, ms?: number, ...args: A): number;
    function clearInterval(interval?: number): void;
    function setImmediate<A extends any[]>(callback: (...args: A) => void, ...args: A): number;
    function clearImmediate(immediate?: number): void;
    function queueMicrotask(callback: () => void): void;
    const promises: typeof import('node:timers/promises');
  }
  export = timers;
}

declare module 'node:timers/promises' {
  namespace promises {
    interface TimerOptions {
      signal?: AbortSignal;
    }
    function setTimeout<T = void>(delay?: number, value?: T, options?: TimerOptions): Promise<T>;
    function setImmediate<T = void>(value?: T, options?: TimerOptions): Promise<T>;
    function setInterval<T = void>(delay?: number, value?: T): AsyncIterableIterator<T>;
    const scheduler: {
      wait(delay: number, options?: TimerOptions): Promise<void>;
      yield(): Promise<void>;
    };
  }
  export = promises;
}

declare module 'node:perf_hooks' {
  namespace perf_hooks {
    const performance: Performance;
    type PerformanceEntry = globalThis.PerformanceEntry;
  }
  export = perf_hooks;
}

declare module 'node:tty' {
  namespace tty {
    function isatty(fd: number): boolean;
  }
  export = tty;
}

declare module 'node:constants' {
  /** @deprecated fs.constants and os.constants.signals */
  namespace constants {
    const F_OK: number;
    const R_OK: number;
    const W_OK: number;
    const X_OK: number;
    const COPYFILE_EXCL: number;
    const O_RDONLY: number;
    const O_WRONLY: number;
    const O_RDWR: number;
    const S_IFMT: number;
    const S_IFREG: number;
    const S_IFDIR: number;
    const S_IFLNK: number;
    const SIGHUP: number;
    const SIGINT: number;
    const SIGQUIT: number;
    const SIGKILL: number;
    const SIGTERM: number;
  }
  export = constants;
}

declare module 'node:events' {
  class EventEmitter {
    constructor(options?: { captureRejections?: boolean });
    static defaultMaxListeners: number;
    on(eventName: string | symbol, listener: (...args: any[]) => void): this;
    addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
    once(eventName: string | symbol, listener: (...args: any[]) => void): this;
    prependListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
    off(eventName: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(eventName?: string | symbol): this;
    emit(eventName: string | symbol, ...args: any[]): boolean;
    listeners(eventName: string | symbol): Function[];
    rawListeners(eventName: string | symbol): Function[];
    listenerCount(eventName: string | symbol, listener?: Function): number;
    eventNames(): (string | symbol)[];
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    static once(emitter: EventEmitter, eventName: string | symbol, options?: { signal?: AbortSignal }): Promise<any[]>;
    static on(emitter: EventEmitter, eventName: string | symbol, options?: { signal?: AbortSignal }): AsyncIterableIterator<any[]>;
    static getEventListeners(emitter: EventEmitter, name: string | symbol): Function[];
    static listenerCount(emitter: EventEmitter, eventName: string | symbol): number;
  }
  namespace EventEmitter {
    export { EventEmitter };
    const defaultMaxListeners: number;
    function once(emitter: EventEmitter, eventName: string | symbol, options?: { signal?: AbortSignal }): Promise<any[]>;
    function on(emitter: EventEmitter, eventName: string | symbol, options?: { signal?: AbortSignal }): AsyncIterableIterator<any[]>;
    function getEventListeners(emitter: EventEmitter, name: string | symbol): Function[];
    function listenerCount(emitter: EventEmitter, eventName: string | symbol): number;
    const EventTarget: typeof globalThis.EventTarget;
    const Event: typeof globalThis.Event;
    const AbortController: typeof globalThis.AbortController;
    const AbortSignal: typeof globalThis.AbortSignal;
  }
  export = EventEmitter;
}

declare module 'node:stream' {
  import { EventEmitter } from 'node:events';
  class Stream extends EventEmitter {}
  namespace Stream {
    type TransformCallback = (error?: Error | null, data?: any) => void;
    interface ReadableOptions {
      objectMode?: boolean;
      encoding?: BufferEncoding;
      highWaterMark?: number;
      read?(this: Readable, size: number): void;
      destroy?(error: Error | null, callback: (error?: Error | null) => void): void;
    }
    interface WritableOptions {
      objectMode?: boolean;
      decodeStrings?: boolean;
      highWaterMark?: number;
      write?(this: Writable, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
      final?(this: Writable, callback: (error?: Error | null) => void): void;
      destroy?(error: Error | null, callback: (error?: Error | null) => void): void;
    }
    interface DuplexOptions extends ReadableOptions, WritableOptions {}
    interface TransformOptions extends DuplexOptions {
      transform?(this: Transform, chunk: any, encoding: BufferEncoding, callback: TransformCallback): void;
      flush?(this: Transform, callback: TransformCallback): void;
    }
    class Readable extends Stream implements AsyncIterable<any> {
      constructor(options?: ReadableOptions);
      static from(iterable: Iterable<any> | AsyncIterable<any> | string | Uint8Array, options?: ReadableOptions): Readable;
      readonly readable: boolean;
      readonly readableEnded: boolean;
      readonly readableFlowing: boolean | null;
      readonly readableLength: number;
      readonly readableObjectMode: boolean;
      readonly destroyed: boolean;
      readonly closed: boolean;
      readonly errored: Error | null;
      _read(size: number): void;
      _destroy(error: Error | null, callback: (error?: Error | null) => void): void;
      push(chunk: any, encoding?: BufferEncoding): boolean;
      unshift(chunk: any, encoding?: BufferEncoding): void;
      read(size?: number): any;
      setEncoding(encoding: BufferEncoding): this;
      pause(): this;
      resume(): this;
      isPaused(): boolean;
      pipe<T extends Writable>(destination: T, options?: { end?: boolean }): T;
      destroy(error?: Error): this;
      [Symbol.asyncIterator](): AsyncIterator<any>;
      static toWeb(streamReadable: Readable, options?: { strategy?: QueuingStrategy }): ReadableStream;
      static fromWeb(readableStream: ReadableStream, options?: ReadableOptions): Readable;
    }
    class Writable extends Stream {
      static toWeb(streamWritable: Writable): WritableStream;
      static fromWeb(writableStream: WritableStream, options?: WritableOptions): Writable;
      constructor(options?: WritableOptions);
      readonly writable: boolean;
      readonly writableEnded: boolean;
      readonly writableFinished: boolean;
      readonly writableLength: number;
      readonly writableObjectMode: boolean;
      readonly destroyed: boolean;
      readonly closed: boolean;
      readonly errored: Error | null;
      _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
      _final(callback: (error?: Error | null) => void): void;
      _destroy(error: Error | null, callback: (error?: Error | null) => void): void;
      write(chunk: any, callback?: (error: Error | null | undefined) => void): boolean;
      write(chunk: any, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void): boolean;
      end(cb?: () => void): this;
      end(chunk: any, cb?: () => void): this;
      end(chunk: any, encoding: BufferEncoding, cb?: () => void): this;
      cork(): void;
      uncork(): void;
      setDefaultEncoding(encoding: BufferEncoding): this;
      destroy(error?: Error): this;
    }
    class Duplex extends Readable implements Writable {
      static toWeb(streamDuplex: Duplex): { readable: ReadableStream; writable: WritableStream };
      static toWeb(streamReadable: Readable, options?: { strategy?: QueuingStrategy }): ReadableStream;
      static fromWeb(pair: { readable: ReadableStream; writable: WritableStream }, options?: DuplexOptions): Duplex;
      static fromWeb(readableStream: ReadableStream, options?: ReadableOptions): Readable;
      constructor(options?: DuplexOptions);
      readonly writable: boolean;
      readonly writableEnded: boolean;
      readonly writableFinished: boolean;
      readonly writableLength: number;
      readonly writableObjectMode: boolean;
      _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
      _final(callback: (error?: Error | null) => void): void;
      write(chunk: any, callback?: (error: Error | null | undefined) => void): boolean;
      write(chunk: any, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void): boolean;
      end(cb?: () => void): this;
      end(chunk: any, cb?: () => void): this;
      end(chunk: any, encoding: BufferEncoding, cb?: () => void): this;
      cork(): void;
      uncork(): void;
      setDefaultEncoding(encoding: BufferEncoding): this;
    }
    class Transform extends Duplex {
      constructor(options?: TransformOptions);
      _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void;
      _flush(callback: TransformCallback): void;
    }
    class PassThrough extends Transform {}
    function pipeline<T extends Writable | Duplex>(...args: [...streams: (Readable | Writable | Duplex)[], callback: (err: NodeJS.ErrnoException | null) => void]): T;
    function finished(stream: Readable | Writable, callback: (err?: NodeJS.ErrnoException | null) => void): void;
    function compose(...streams: (Readable | Writable | Duplex | ReadableStream | WritableStream | TransformStream)[]): Duplex;
    const promises: typeof import('node:stream/promises');
    const web: typeof import('node:stream/web');
  }
  export = Stream;
}

declare module 'node:stream/promises' {
  import { Readable, Writable, Duplex } from 'node:stream';
  function pipeline(...streams: (Readable | Writable | Duplex)[]): Promise<void>;
  function finished(stream: Readable | Writable): Promise<void>;
  export { pipeline, finished };
}

declare module 'node:stream/consumers' {
  import { Readable } from 'node:stream';
  function text(stream: Readable | AsyncIterable<any>): Promise<string>;
  function json(stream: Readable | AsyncIterable<any>): Promise<unknown>;
  function buffer(stream: Readable | AsyncIterable<any>): Promise<Buffer>;
  export { text, json, buffer };
}

declare module 'node:cluster' {
  import { EventEmitter } from 'node:events';
  import { ChildProcess } from 'node:child_process';
  namespace cluster {
    interface Address {
      address: string;
      port: number;
      addressType: number | 'udp4' | 'udp6';
    }
    interface ClusterSettings {
      args?: string[];
      silent?: boolean;
      exec?: string;
      execArgv?: string[];
      cwd?: string;
    }
    class Worker extends EventEmitter {
      readonly id: number;
      readonly process: ChildProcess;
      exitedAfterDisconnect: boolean;
      send(message: any, callback?: (error: Error | null) => void): boolean;
      kill(signal?: string): void;
      destroy(signal?: string): void;
      disconnect(): this;
      isConnected(): boolean;
      isDead(): boolean;
      on(event: 'message', listener: (message: any) => void): this;
      on(event: 'exit', listener: (code: number, signal: string) => void): this;
      on(event: 'listening', listener: (address: Address) => void): this;
      on(event: 'online' | 'disconnect', listener: () => void): this;
      on(event: 'error', listener: (error: Error) => void): this;
      on(event: string, listener: (...args: any[]) => void): this;
    }
    const isPrimary: boolean;
    /** @deprecated */
    const isMaster: boolean;
    const isWorker: boolean;
    const workers: Record<string, Worker> | undefined;
    const worker: Worker | undefined;
    const settings: ClusterSettings;
    const schedulingPolicy: number;
    const SCHED_NONE: number;
    const SCHED_RR: number;
    function fork(env?: Record<string, string | undefined>): Worker;
    function setupPrimary(settings?: ClusterSettings): void;
    /** @deprecated */
    function setupMaster(settings?: ClusterSettings): void;
    function disconnect(callback?: () => void): void;
    function on(event: 'fork' | 'online' | 'disconnect', listener: (worker: Worker) => void): EventEmitter;
    function on(event: 'listening', listener: (worker: Worker, address: Address) => void): EventEmitter;
    function on(event: 'message', listener: (worker: Worker, message: any) => void): EventEmitter;
    function on(event: 'exit', listener: (worker: Worker, code: number, signal: string) => void): EventEmitter;
    function once(event: 'fork' | 'online' | 'disconnect', listener: (worker: Worker) => void): EventEmitter;
    function once(event: 'listening', listener: (worker: Worker, address: Address) => void): EventEmitter;
    function once(event: 'message', listener: (worker: Worker, message: any) => void): EventEmitter;
    function once(event: 'exit', listener: (worker: Worker, code: number, signal: string) => void): EventEmitter;
    function off(event: string, listener: (...args: any[]) => void): EventEmitter;
    function removeAllListeners(event?: string): EventEmitter;
    function emit(event: string, ...args: any[]): boolean;
    function listenerCount(event: string): number;
  }
  export = cluster;
}

declare module 'node:stream/web' {
  const ReadableStream: typeof globalThis.ReadableStream;
  type ReadableStream<R = any> = globalThis.ReadableStream<R>;
  const ReadableStreamDefaultReader: typeof globalThis.ReadableStreamDefaultReader;
  type ReadableStreamDefaultReader<R = any> = globalThis.ReadableStreamDefaultReader<R>;
  type ReadableStreamDefaultController<R = any> = globalThis.ReadableStreamDefaultController<R>;
  type ReadableStreamReadResult<R> = globalThis.ReadableStreamReadResult<R>;
  const WritableStream: typeof globalThis.WritableStream;
  type WritableStream<W = any> = globalThis.WritableStream<W>;
  const WritableStreamDefaultWriter: typeof globalThis.WritableStreamDefaultWriter;
  type WritableStreamDefaultWriter<W = any> = globalThis.WritableStreamDefaultWriter<W>;
  type WritableStreamDefaultController = globalThis.WritableStreamDefaultController;
  const TransformStream: typeof globalThis.TransformStream;
  type TransformStream<I = any, O = any> = globalThis.TransformStream<I, O>;
  type TransformStreamDefaultController<O = any> = globalThis.TransformStreamDefaultController<O>;
  const TextEncoderStream: typeof globalThis.TextEncoderStream;
  type TextEncoderStream = globalThis.TextEncoderStream;
  const TextDecoderStream: typeof globalThis.TextDecoderStream;
  type TextDecoderStream = globalThis.TextDecoderStream;
  const CompressionStream: typeof globalThis.CompressionStream;
  type CompressionStream = globalThis.CompressionStream;
  const DecompressionStream: typeof globalThis.DecompressionStream;
  type DecompressionStream = globalThis.DecompressionStream;
  const CountQueuingStrategy: typeof globalThis.CountQueuingStrategy;
  type CountQueuingStrategy = globalThis.CountQueuingStrategy;
  const ByteLengthQueuingStrategy: typeof globalThis.ByteLengthQueuingStrategy;
  type ByteLengthQueuingStrategy = globalThis.ByteLengthQueuingStrategy;
  type QueuingStrategy<T = any> = globalThis.QueuingStrategy<T>;
  type UnderlyingSource<R = any> = globalThis.UnderlyingSource<R>;
  type UnderlyingSink<W = any> = globalThis.UnderlyingSink<W>;
  type Transformer<I = any, O = any> = globalThis.Transformer<I, O>;
}

declare module 'node:child_process' {
  import { EventEmitter } from 'node:events';
  import { Readable, Writable } from 'node:stream';
  namespace child_process {
    type StdioOption = 'pipe' | 'inherit' | 'ignore';
    interface CommonOptions {
      cwd?: string;
      env?: Record<string, string | undefined>;
      shell?: boolean | string;
      stdio?: StdioOption | StdioOption[];
      input?: string | Uint8Array;
    }
    interface ExecException extends Error {
      code?: number;
      killed?: boolean;
      signal?: string;
      cmd?: string;
      stdout?: string;
      stderr?: string;
    }
    type ExecFileException = ExecException;
    interface SpawnSyncReturns<T> {
      pid: number;
      output: (T | null)[];
      stdout: T;
      stderr: T;
      status: number | null;
      signal: string | null;
      error?: Error;
    }
    class ChildProcess extends EventEmitter {
      readonly stdin: Writable;
      readonly stdout: Readable;
      readonly stderr: Readable;
      readonly pid: number | undefined;
      readonly exitCode: number | null;
      readonly signalCode: string | null;
      readonly killed: boolean;
      readonly spawnfile: string;
      readonly connected: boolean;
      kill(signal?: string | number): boolean;
      send(message: any, callback?: (error: Error | null) => void): boolean;
      disconnect(): void;
    }
    interface ForkOptions {
      cwd?: string;
      env?: Record<string, string | undefined>;
      execArgv?: string[];
      silent?: boolean;
    }
    // Runs this program again (a native binary holds one program) with an IPC channel
    function fork(modulePath: string | URL, options?: ForkOptions): ChildProcess;
    function fork(modulePath: string | URL, args?: readonly string[], options?: ForkOptions): ChildProcess;
    type ExecCallback = (error: ExecException | null, stdout: string, stderr: string) => void;
    function exec(command: string, callback?: ExecCallback): ChildProcess;
    function exec(command: string, options: CommonOptions & { encoding?: BufferEncoding | null }, callback?: ExecCallback): ChildProcess;
    function execFile(file: string, callback?: ExecCallback): ChildProcess;
    function execFile(file: string, args: readonly string[], callback?: ExecCallback): ChildProcess;
    function execFile(file: string, args: readonly string[], options: CommonOptions & { encoding?: BufferEncoding | null }, callback?: ExecCallback): ChildProcess;
    function spawn(command: string, options?: CommonOptions): ChildProcess;
    function spawn(command: string, args: readonly string[], options?: CommonOptions): ChildProcess;
    function execSync(command: string, options: CommonOptions & { encoding: BufferEncoding }): string;
    function execSync(command: string, options?: CommonOptions & { encoding?: 'buffer' | null }): Buffer;
    function execFileSync(file: string, args: readonly string[], options: CommonOptions & { encoding: BufferEncoding }): string;
    function execFileSync(file: string, args?: readonly string[], options?: CommonOptions & { encoding?: 'buffer' | null }): Buffer;
    function spawnSync(command: string, args: readonly string[], options: CommonOptions & { encoding: BufferEncoding }): SpawnSyncReturns<string>;
    function spawnSync(command: string, args?: readonly string[], options?: CommonOptions & { encoding?: 'buffer' | null }): SpawnSyncReturns<Buffer>;
  }
  export = child_process;
}

declare module 'node:readline' {
  import { EventEmitter } from 'node:events';
  import { Readable, Writable } from 'node:stream';
  namespace readline {
    interface ReadLineOptions {
      input: Readable;
      output?: Writable;
      prompt?: string;
      terminal?: boolean;
    }
    class Interface extends EventEmitter implements AsyncIterable<string> {
      readonly closed: boolean;
      question(query: string, callback: (answer: string) => void): void;
      prompt(preserveCursor?: boolean): void;
      setPrompt(prompt: string): void;
      getPrompt(): string;
      write(data: string): void;
      pause(): this;
      resume(): this;
      close(): void;
      [Symbol.asyncIterator](): AsyncIterator<string>;
    }
    function createInterface(options: ReadLineOptions): Interface;
    function createInterface(input: Readable, output?: Writable): Interface;
    /** TypeNative extension: prints the prompt and reads one line from stdin, synchronously */
    function question(prompt: string): string;
    const promises: typeof import('node:readline/promises');
  }
  export = readline;
}

declare module 'node:readline/promises' {
  import { EventEmitter } from 'node:events';
  import { Readable, Writable } from 'node:stream';
  namespace promises {
    class Interface extends EventEmitter implements AsyncIterable<string> {
      readonly closed: boolean;
      question(query: string, options?: { signal?: AbortSignal }): Promise<string>;
      prompt(preserveCursor?: boolean): void;
      setPrompt(prompt: string): void;
      getPrompt(): string;
      pause(): this;
      resume(): this;
      close(): void;
      [Symbol.asyncIterator](): AsyncIterator<string>;
    }
    function createInterface(options: { input: Readable; output?: Writable; prompt?: string; terminal?: boolean }): Interface;
    function createInterface(input: Readable, output?: Writable): Interface;
  }
  export = promises;
}

declare module 'node:diagnostics_channel' {
  namespace diagnostics_channel {
    type ChannelListener = (message: unknown, name: string | symbol) => void;
    class Channel {
      readonly name: string | symbol;
      readonly hasSubscribers: boolean;
      publish(message: unknown): void;
      subscribe(onMessage: ChannelListener): void;
      unsubscribe(onMessage: ChannelListener): boolean;
    }
    function channel(name: string | symbol): Channel;
    function subscribe(name: string | symbol, onMessage: ChannelListener): void;
    function unsubscribe(name: string | symbol, onMessage: ChannelListener): boolean;
    function hasSubscribers(name: string | symbol): boolean;
  }
  export = diagnostics_channel;
}

declare module 'node:sys' {
  import util = require('node:util');
  export = util;
}

// Bare specifiers ('fs') are the same builtins as 'node:fs'
declare module 'node:net' {
  import { EventEmitter } from 'node:events';
  import { Duplex } from 'node:stream';
  namespace net {
    interface AddressInfo {
      address: string;
      family: string;
      port: number;
    }
    interface SocketConstructorOpts {
      allowHalfOpen?: boolean;
    }
    interface TcpSocketConnectOpts {
      port: number;
      host?: string;
      family?: number;
      timeout?: number;
      allowHalfOpen?: boolean;
    }
    interface IpcSocketConnectOpts {
      path: string;
      timeout?: number;
      allowHalfOpen?: boolean;
    }
    type SocketConnectOpts = TcpSocketConnectOpts | IpcSocketConnectOpts;
    class Socket extends Duplex {
      constructor(options?: SocketConstructorOpts);
      connect(port: number, host?: string, connectionListener?: () => void): this;
      connect(port: number, connectionListener?: () => void): this;
      connect(path: string, connectionListener?: () => void): this;
      connect(options: SocketConnectOpts, connectionListener?: () => void): this;
      setTimeout(timeout: number, callback?: () => void): this;
      setNoDelay(noDelay?: boolean): this;
      setKeepAlive(enable?: boolean, initialDelay?: number): this;
      address(): AddressInfo;
      ref(): this;
      unref(): this;
      resetAndDestroy(): this;
      destroySoon(): void;
      readonly bytesRead: number;
      readonly bytesWritten: number;
      readonly connecting: boolean;
      readonly pending: boolean;
      readonly readyState: 'opening' | 'open' | 'readOnly' | 'writeOnly' | 'closed';
      readonly remoteAddress?: string | undefined;
      readonly remoteFamily?: string | undefined;
      readonly remotePort?: number | undefined;
      readonly localAddress?: string;
      readonly localPort?: number;
      readonly localFamily?: string;
      readonly timeout?: number | undefined;
    }
    interface ServerOpts {
      allowHalfOpen?: boolean;
      pauseOnConnect?: boolean;
    }
    interface ListenOptions {
      port?: number;
      host?: string;
      path?: string;
      backlog?: number;
    }
    class Server extends EventEmitter {
      constructor(connectionListener?: (socket: Socket) => void);
      constructor(options?: ServerOpts, connectionListener?: (socket: Socket) => void);
      listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void): this;
      listen(port?: number, hostname?: string, listeningListener?: () => void): this;
      listen(port?: number, listeningListener?: () => void): this;
      listen(path: string, listeningListener?: () => void): this;
      listen(options: ListenOptions, listeningListener?: () => void): this;
      close(callback?: (err?: Error) => void): this;
      address(): AddressInfo | string | null;
      getConnections(cb: (error: Error | null, count: number) => void): this;
      ref(): this;
      unref(): this;
      maxConnections: number;
      readonly listening: boolean;
    }
    function createServer(connectionListener?: (socket: Socket) => void): Server;
    function createServer(options?: ServerOpts, connectionListener?: (socket: Socket) => void): Server;
    function connect(options: SocketConnectOpts, connectionListener?: () => void): Socket;
    function connect(port: number, host?: string, connectionListener?: () => void): Socket;
    function connect(path: string, connectionListener?: () => void): Socket;
    function createConnection(options: SocketConnectOpts, connectionListener?: () => void): Socket;
    function createConnection(port: number, host?: string, connectionListener?: () => void): Socket;
    function createConnection(path: string, connectionListener?: () => void): Socket;
    function isIP(input: string): number;
    function isIPv4(input: string): boolean;
    function isIPv6(input: string): boolean;
  }
  export = net;
}

declare module 'node:dns' {
  namespace dns {
    interface LookupOptions {
      family?: number | 'IPv4' | 'IPv6';
      all?: boolean;
    }
    interface LookupAddress {
      address: string;
      family: number;
    }
    interface MxRecord {
      exchange: string;
      priority: number;
    }
    interface SrvRecord {
      name: string;
      port: number;
      priority: number;
      weight: number;
    }
    function lookup(hostname: string, callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void): void;
    function lookup(hostname: string, family: number, callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void): void;
    function lookup(hostname: string, options: LookupOptions & { all: true }, callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void): void;
    function lookup(hostname: string, options: LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void): void;
    function resolve(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: string[]) => void): void;
    function resolve(hostname: string, rrtype: 'A' | 'AAAA' | 'CNAME' | 'NS' | 'PTR', callback: (err: NodeJS.ErrnoException | null, addresses: string[]) => void): void;
    function resolve(hostname: string, rrtype: 'MX', callback: (err: NodeJS.ErrnoException | null, addresses: MxRecord[]) => void): void;
    function resolve(hostname: string, rrtype: 'TXT', callback: (err: NodeJS.ErrnoException | null, addresses: string[][]) => void): void;
    function resolve(hostname: string, rrtype: 'SRV', callback: (err: NodeJS.ErrnoException | null, addresses: SrvRecord[]) => void): void;
    function resolve4(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: string[]) => void): void;
    function resolve6(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: string[]) => void): void;
    function resolveCname(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: string[]) => void): void;
    function resolveMx(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: MxRecord[]) => void): void;
    function resolveTxt(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: string[][]) => void): void;
    function resolveNs(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: string[]) => void): void;
    function resolveSrv(hostname: string, callback: (err: NodeJS.ErrnoException | null, addresses: SrvRecord[]) => void): void;
    function reverse(ip: string, callback: (err: NodeJS.ErrnoException | null, hostnames: string[]) => void): void;
    function getServers(): string[];
    function setDefaultResultOrder(order: 'ipv4first' | 'ipv6first' | 'verbatim'): void;
    function getDefaultResultOrder(): 'ipv4first' | 'ipv6first' | 'verbatim';
    const promises: typeof import('node:dns/promises');
  }
  export = dns;
}

declare module 'node:dns/promises' {
  import { LookupOptions, LookupAddress, MxRecord, SrvRecord } from 'node:dns';
  namespace dnsPromises {
    function lookup(hostname: string, options: LookupOptions & { all: true }): Promise<LookupAddress[]>;
    function lookup(hostname: string, options?: number | LookupOptions): Promise<LookupAddress>;
    function resolve(hostname: string, rrtype?: 'A' | 'AAAA' | 'CNAME' | 'NS' | 'PTR'): Promise<string[]>;
    function resolve(hostname: string, rrtype: 'MX'): Promise<MxRecord[]>;
    function resolve(hostname: string, rrtype: 'TXT'): Promise<string[][]>;
    function resolve(hostname: string, rrtype: 'SRV'): Promise<SrvRecord[]>;
    function resolve4(hostname: string): Promise<string[]>;
    function resolve6(hostname: string): Promise<string[]>;
    function resolveCname(hostname: string): Promise<string[]>;
    function resolveMx(hostname: string): Promise<MxRecord[]>;
    function resolveTxt(hostname: string): Promise<string[][]>;
    function resolveNs(hostname: string): Promise<string[]>;
    function resolveSrv(hostname: string): Promise<SrvRecord[]>;
    function reverse(ip: string): Promise<string[]>;
    function getServers(): string[];
    function setDefaultResultOrder(order: 'ipv4first' | 'ipv6first' | 'verbatim'): void;
    function getDefaultResultOrder(): 'ipv4first' | 'ipv6first' | 'verbatim';
  }
  export = dnsPromises;
}

declare module 'node:http' {
  import * as net from 'node:net';
  import { Readable, Writable } from 'node:stream';
  namespace http {
    // Repeated headers are joined with ', ' (see headersDistinct for every value)
    type IncomingHttpHeaders = Record<string, string>;
    type OutgoingHttpHeader = number | string | string[];
    type OutgoingHttpHeaders = Record<string, OutgoingHttpHeader>;
    class IncomingMessage extends Readable {
      readonly method?: string;
      readonly url?: string;
      readonly httpVersion: string;
      readonly httpVersionMajor: number;
      readonly httpVersionMinor: number;
      readonly headers: IncomingHttpHeaders;
      readonly headersDistinct: Record<string, string[]>;
      readonly rawHeaders: string[];
      readonly trailers: Record<string, string>;
      readonly statusCode?: number;
      readonly statusMessage?: string;
      readonly complete: boolean;
      readonly aborted: boolean;
      // A TLSSocket (encrypted: true) for https requests
      readonly socket: net.Socket & { readonly encrypted?: boolean };
      readonly connection: net.Socket;
      setTimeout(msecs: number, callback?: () => void): this;
    }
    class OutgoingMessage extends Writable {
      readonly headersSent: boolean;
      readonly socket: net.Socket | null;
      setHeader(name: string, value: OutgoingHttpHeader): this;
      getHeader(name: string): OutgoingHttpHeader | undefined;
      getHeaders(): OutgoingHttpHeaders;
      getHeaderNames(): string[];
      hasHeader(name: string): boolean;
      removeHeader(name: string): void;
      flushHeaders(): void;
    }
    class ServerResponse extends OutgoingMessage {
      statusCode: number;
      statusMessage: string;
      sendDate: boolean;
      readonly req: IncomingMessage;
      setHeaders(headers: Headers | Map<string, OutgoingHttpHeader> | OutgoingHttpHeaders): this;
      appendHeader(name: string, value: string | string[]): this;
      writeHead(statusCode: number, statusMessage?: string, headers?: OutgoingHttpHeaders | string[]): this;
      writeHead(statusCode: number, headers?: OutgoingHttpHeaders | string[]): this;
      writeContinue(): void;
      setTimeout(msecs: number, callback?: () => void): this;
    }
    class ClientRequest extends OutgoingMessage {
      readonly method: string;
      readonly path: string;
      readonly host: string;
      readonly protocol: string;
      readonly aborted: boolean;
      readonly reusedSocket: boolean;
      getRawHeaderNames(): string[];
      setTimeout(timeout: number, callback?: () => void): this;
      setNoDelay(noDelay?: boolean): void;
      setSocketKeepAlive(enable?: boolean, initialDelay?: number): void;
      abort(): void;
    }
    interface ServerOptions {
      keepAlive?: boolean;
      keepAliveTimeout?: number;
      requestTimeout?: number;
      headersTimeout?: number;
    }
    type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;
    class Server extends net.Server {
      constructor(requestListener?: RequestListener);
      constructor(options: ServerOptions, requestListener?: RequestListener);
      setTimeout(msecs?: number, callback?: () => void): this;
      closeAllConnections(): void;
      closeIdleConnections(): void;
      timeout: number;
      keepAliveTimeout: number;
      headersTimeout: number;
      requestTimeout: number;
      maxHeadersCount: number | null;
    }
    interface AgentOptions {
      keepAlive?: boolean;
      keepAliveMsecs?: number;
      maxSockets?: number;
      maxFreeSockets?: number;
      timeout?: number;
    }
    class Agent {
      constructor(options?: AgentOptions);
      readonly keepAlive: boolean;
      maxSockets: number;
      destroy(): void;
    }
    interface RequestOptions {
      protocol?: string | null;
      host?: string | null;
      hostname?: string | null;
      port?: number | string | null;
      path?: string | null;
      method?: string;
      headers?: OutgoingHttpHeaders;
      auth?: string | null;
      timeout?: number;
      socketPath?: string;
      signal?: AbortSignal;
      agent?: Agent | boolean;
      setHost?: boolean;
      family?: number;
      // https
      ca?: string | Buffer | Array<string | Buffer>;
      cert?: string | Buffer;
      key?: string | Buffer;
      rejectUnauthorized?: boolean;
      servername?: string;
    }
    const METHODS: string[];
    const STATUS_CODES: Record<number, string>;
    const maxHeaderSize: number;
    const globalAgent: Agent;
    function createServer(requestListener?: RequestListener): Server;
    function createServer(options: ServerOptions, requestListener?: RequestListener): Server;
    function request(url: string | URL, callback?: (res: IncomingMessage) => void): ClientRequest;
    function request(options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest;
    function request(url: string | URL, options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest;
    function get(url: string | URL, callback?: (res: IncomingMessage) => void): ClientRequest;
    function get(options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest;
    function get(url: string | URL, options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest;
  }
  export = http;
}

declare module 'node:https' {
  import * as http from 'node:http';
  import * as tls from 'node:tls';
  namespace https {
    type ServerOptions = tls.TlsOptions & http.ServerOptions;
    type RequestOptions = http.RequestOptions;
    class Server extends http.Server {}
    class Agent extends http.Agent {}
    const globalAgent: Agent;
    function createServer(options: ServerOptions, requestListener?: http.RequestListener): Server;
    function request(url: string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
    function request(options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
    function request(url: string | URL, options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
    function get(url: string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
    function get(options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
    function get(url: string | URL, options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
  }
  export = https;
}

declare module 'node:tls' {
  import * as net from 'node:net';
  namespace tls {
    interface PeerCertificate {
      subject: Record<string, string>;
      issuer: Record<string, string>;
      subjectaltname: string;
      valid_from: string;
      valid_to: string;
      fingerprint: string;
      fingerprint256: string;
      fingerprint512: string;
      serialNumber: string;
      ca: boolean;
      raw: Buffer;
    }
    interface CipherNameAndProtocol {
      name: string;
      standardName: string;
      version: string;
    }
    interface SecureContextOptions {
      key?: string | Buffer;
      cert?: string | Buffer;
      ca?: string | Buffer | Array<string | Buffer>;
      minVersion?: 'TLSv1' | 'TLSv1.1' | 'TLSv1.2' | 'TLSv1.3';
      maxVersion?: 'TLSv1' | 'TLSv1.1' | 'TLSv1.2' | 'TLSv1.3';
    }
    interface TlsOptions extends SecureContextOptions {
      requestCert?: boolean;
      rejectUnauthorized?: boolean;
      ALPNProtocols?: string[];
      allowHalfOpen?: boolean;
    }
    interface ConnectionOptions extends SecureContextOptions {
      host?: string;
      port?: number;
      path?: string;
      servername?: string;
      rejectUnauthorized?: boolean;
      ALPNProtocols?: string[];
      timeout?: number;
    }
    interface SecureContext {
      options: SecureContextOptions;
    }
    class TLSSocket extends net.Socket {
      readonly authorized: boolean;
      readonly authorizationError: string | null;
      readonly encrypted: true;
      readonly alpnProtocol: string | false | null;
      readonly servername: string | false | null;
      getPeerCertificate(detailed?: boolean): PeerCertificate;
      getCertificate(): PeerCertificate | null;
      getProtocol(): string | null;
      getCipher(): CipherNameAndProtocol;
    }
    class Server extends net.Server {}
    const DEFAULT_MIN_VERSION: string;
    const DEFAULT_MAX_VERSION: string;
    const DEFAULT_ECDH_CURVE: string;
    function createServer(options: TlsOptions, secureConnectionListener?: (socket: TLSSocket) => void): Server;
    function connect(options: ConnectionOptions, secureConnectListener?: () => void): TLSSocket;
    function connect(port: number, host?: string, options?: ConnectionOptions, secureConnectListener?: () => void): TLSSocket;
    function connect(port: number, options?: ConnectionOptions, secureConnectListener?: () => void): TLSSocket;
    function createSecureContext(options?: SecureContextOptions): SecureContext;
    function getCiphers(): string[];
  }
  export = tls;
}

declare module 'node:dgram' {
  import { EventEmitter } from 'node:events';
  import { AddressInfo } from 'node:net';
  namespace dgram {
    type SocketType = 'udp4' | 'udp6';
    interface SocketOptions {
      type: SocketType;
      reuseAddr?: boolean;
    }
    interface RemoteInfo {
      address: string;
      family: 'IPv4' | 'IPv6';
      port: number;
      size: number;
    }
    interface BindOptions {
      port?: number;
      address?: string;
    }
    type SendCallback = (error: Error | null, bytes: number) => void;
    class Socket extends EventEmitter {
      bind(port?: number, address?: string, callback?: () => void): this;
      bind(port?: number, callback?: () => void): this;
      bind(callback?: () => void): this;
      bind(options: BindOptions, callback?: () => void): this;
      send(msg: string | Uint8Array | any[], port?: number, address?: string, callback?: SendCallback): void;
      send(msg: string | Uint8Array | any[], port?: number, callback?: SendCallback): void;
      send(msg: string | Uint8Array, offset: number, length: number, port?: number, address?: string, callback?: SendCallback): void;
      send(msg: string | Uint8Array | any[], callback?: SendCallback): void;
      connect(port: number, address?: string, callback?: () => void): void;
      connect(port: number, callback: () => void): void;
      disconnect(): void;
      remoteAddress(): AddressInfo;
      address(): AddressInfo;
      close(callback?: () => void): this;
      ref(): this;
      unref(): this;
      setBroadcast(flag: boolean): void;
      setTTL(ttl: number): number;
      setMulticastTTL(ttl: number): number;
      setMulticastLoopback(flag: boolean): boolean;
      setRecvBufferSize(size: number): void;
      setSendBufferSize(size: number): void;
    }
    function createSocket(type: SocketType | SocketOptions, callback?: (msg: Buffer, rinfo: RemoteInfo) => void): Socket;
  }
  export = dgram;
}

declare module 'node:async_hooks' {
  namespace async_hooks {
    class AsyncLocalStorage<T> {
      constructor(options?: { name?: string });
      static bind<Func extends (...args: any[]) => any>(fn: Func): Func;
      static snapshot(): <R, TArgs extends any[]>(fn: (...args: TArgs) => R, ...args: TArgs) => R;
      readonly name: string;
      getStore(): T | undefined;
      run<R>(store: T, callback: () => R): R;
      run<R, TArgs extends any[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R;
      exit<R, TArgs extends any[]>(callback: (...args: TArgs) => R, ...args: TArgs): R;
      enterWith(store: T): void;
      disable(): void;
    }
    interface AsyncResourceOptions {
      triggerAsyncId?: number;
      requireManualDestroy?: boolean;
    }
    class AsyncResource {
      constructor(type: string, triggerAsyncId?: number | AsyncResourceOptions);
      static bind<Func extends (...args: any[]) => any>(fn: Func, type?: string): Func;
      bind<Func extends (...args: any[]) => any>(fn: Func): Func;
      runInAsyncScope<This, Result>(fn: (this: This, ...args: any[]) => Result, thisArg?: This, ...args: any[]): Result;
      emitDestroy(): this;
      asyncId(): number;
      triggerAsyncId(): number;
    }
    interface HookCallbacks {
      init?(asyncId: number, type: string, triggerAsyncId: number, resource: object): void;
      before?(asyncId: number): void;
      after?(asyncId: number): void;
      promiseResolve?(asyncId: number): void;
      destroy?(asyncId: number): void;
    }
    interface AsyncHook {
      enable(): this;
      disable(): this;
    }
    function createHook(callbacks: HookCallbacks): AsyncHook;
    function executionAsyncId(): number;
    function triggerAsyncId(): number;
    function executionAsyncResource(): object;
  }
  export = async_hooks;
}

declare module 'node:test' {
  function test(name?: string, fn?: test.TestFn): Promise<void>;
  function test(name?: string, options?: test.TestOptions, fn?: test.TestFn): Promise<void>;
  function test(fn?: test.TestFn): Promise<void>;
  namespace test {
    export { test };
    export function skip(name?: string, fn?: TestFn): Promise<void>;
    export function skip(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
    export function todo(name?: string, fn?: TestFn): Promise<void>;
    export function todo(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
    export function only(name?: string, fn?: TestFn): Promise<void>;
    export function only(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
    export interface TestOptions {
      skip?: boolean | string;
      todo?: boolean | string;
      only?: boolean;
      timeout?: number;
      concurrency?: number | boolean;
    }
    export type TestFn = (t: TestContext, done: (result?: any) => void) => any;
    export type SuiteFn = (s: SuiteContext) => any;
    export type HookFn = (c: TestContext, done: (result?: any) => void) => any;
    export interface MockFunctionCall<F extends (...args: any[]) => any> {
      arguments: Parameters<F>;
      result: ReturnType<F> | undefined;
      error: unknown;
      this: unknown;
    }
    export interface MockFunctionContext<F extends (...args: any[]) => any> {
      readonly calls: MockFunctionCall<F>[];
      callCount(): number;
      resetCalls(): void;
      mockImplementation(implementation: F): void;
      mockImplementationOnce(implementation: F, onCall?: number): void;
      restore(): void;
    }
    export type Mock<F extends (...args: any[]) => any> = F & { mock: MockFunctionContext<F> };
    export interface MockTracker {
      fn<F extends (...args: any[]) => any = (...args: any[]) => undefined>(original?: F): Mock<F>;
      fn<F extends (...args: any[]) => any, Implementation extends (...args: any[]) => any = F>(original: F, implementation: Implementation): Mock<F | Implementation>;
      reset(): void;
      restoreAll(): void;
    }
    export interface TestContext {
      readonly name: string;
      readonly fullName: string;
      readonly filePath: string | undefined;
      readonly signal: AbortSignal;
      readonly mock: MockTracker;
      test(name?: string, fn?: TestFn): Promise<void>;
      test(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
      test(fn?: TestFn): Promise<void>;
      skip(message?: string): void;
      todo(message?: string): void;
      diagnostic(message: string): void;
      plan(count: number): void;
      runOnly(shouldRunOnlyTests: boolean): void;
      before(fn?: HookFn): void;
      after(fn?: HookFn): void;
      beforeEach(fn?: HookFn): void;
      afterEach(fn?: HookFn): void;
    }
    export interface SuiteContext {
      readonly name: string;
      readonly fullName: string;
      readonly signal: AbortSignal;
    }
    export interface TestFunction {
      (name?: string, fn?: TestFn): Promise<void>;
      (name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
      (fn?: TestFn): Promise<void>;
      skip(name?: string, fn?: TestFn): Promise<void>;
      skip(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
      todo(name?: string, fn?: TestFn): Promise<void>;
      todo(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
      only(name?: string, fn?: TestFn): Promise<void>;
      only(name?: string, options?: TestOptions, fn?: TestFn): Promise<void>;
    }
    export interface SuiteFunction {
      (name?: string, fn?: SuiteFn): Promise<void>;
      (name?: string, options?: TestOptions, fn?: SuiteFn): Promise<void>;
      (fn?: SuiteFn): Promise<void>;
      skip(name?: string, fn?: SuiteFn): Promise<void>;
      skip(name?: string, options?: TestOptions, fn?: SuiteFn): Promise<void>;
      todo(name?: string, fn?: SuiteFn): Promise<void>;
      todo(name?: string, options?: TestOptions, fn?: SuiteFn): Promise<void>;
      only(name?: string, fn?: SuiteFn): Promise<void>;
      only(name?: string, options?: TestOptions, fn?: SuiteFn): Promise<void>;
    }
    export const it: TestFunction;
    export const describe: SuiteFunction;
    export const suite: SuiteFunction;
    export const mock: MockTracker;
    export function before(fn?: HookFn, options?: TestOptions): void;
    export function after(fn?: HookFn, options?: TestOptions): void;
    export function beforeEach(fn?: HookFn, options?: TestOptions): void;
    export function afterEach(fn?: HookFn, options?: TestOptions): void;
  }
  export = test;
}

declare module 'node:worker_threads' {
  import { EventEmitter } from 'node:events';
  namespace worker_threads {
    interface WorkerOptions {
      workerData?: any;
      argv?: any[];
      env?: Record<string, string> | typeof SHARE_ENV;
      eval?: false;
      stdout?: boolean;
      stderr?: boolean;
      name?: string;
    }
    // Runs this program again (pass __filename or new URL(import.meta.url))
    class Worker extends EventEmitter {
      constructor(filename: string | URL, options?: WorkerOptions);
      readonly threadId: number;
      postMessage(value: any, transferList?: readonly any[]): void;
      terminate(): Promise<number>;
      ref(): this;
      unref(): this;
    }
    class MessagePort extends EventEmitter {
      onmessage: ((event: MessageEvent) => void) | null;
      postMessage(value: any, transferList?: readonly any[]): void;
      start(): void;
      close(): void;
      ref(): this;
      unref(): this;
      hasRef(): boolean;
    }
    class MessageChannel {
      readonly port1: MessagePort;
      readonly port2: MessagePort;
    }
    interface MessageEvent {
      readonly data: any;
      readonly type: string;
    }
    // Instances with the same name in this process
    class BroadcastChannel {
      constructor(name: string);
      readonly name: string;
      onmessage: ((event: MessageEvent) => void) | null;
      postMessage(message: unknown): void;
      addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
      close(): void;
      ref(): this;
      unref(): this;
    }
    const isMainThread: boolean;
    const parentPort: MessagePort | null;
    const workerData: any;
    const threadId: number;
    const resourceLimits: Record<string, number>;
    const SHARE_ENV: unique symbol;
    function receiveMessageOnPort(port: MessagePort): { message: any } | undefined;
    function getEnvironmentData(key: string): any;
    function setEnvironmentData(key: string, value: any): void;
    function markAsUntransferable(object: object): void;
    function isMarkedAsUntransferable(object: object): boolean;
  }
  export = worker_threads;
}

declare module 'path' { import m = require('node:path'); export = m; }
declare module 'path/posix' { import m = require('node:path/posix'); export = m; }
declare module 'path/win32' { import m = require('node:path/win32'); export = m; }
declare module 'buffer' { import m = require('node:buffer'); export = m; }
declare module 'fs' { import m = require('node:fs'); export = m; }
declare module 'fs/promises' { import m = require('node:fs/promises'); export = m; }
declare module 'url' { import m = require('node:url'); export = m; }
declare module 'querystring' { import m = require('node:querystring'); export = m; }
declare module 'punycode' { import m = require('node:punycode'); export = m; }
declare module 'string_decoder' { import m = require('node:string_decoder'); export = m; }
declare module 'os' { import m = require('node:os'); export = m; }
declare module 'process' { import m = require('node:process'); export = m; }
declare module 'console' { import m = require('node:console'); export = m; }
declare module 'util' { import m = require('node:util'); export = m; }
declare module 'util/types' { import m = require('node:util/types'); export = m; }
declare module 'assert' { import m = require('node:assert'); export = m; }
declare module 'assert/strict' { import m = require('node:assert/strict'); export = m; }
declare module 'crypto' { import m = require('node:crypto'); export = m; }
declare module 'zlib' { import m = require('node:zlib'); export = m; }
declare module 'timers' { import m = require('node:timers'); export = m; }
declare module 'timers/promises' { import m = require('node:timers/promises'); export = m; }
declare module 'perf_hooks' { import m = require('node:perf_hooks'); export = m; }
declare module 'tty' { import m = require('node:tty'); export = m; }
declare module 'constants' { import m = require('node:constants'); export = m; }
declare module 'events' { import m = require('node:events'); export = m; }
declare module 'stream' { import m = require('node:stream'); export = m; }
declare module 'stream/promises' { export * from 'node:stream/promises'; }
declare module 'stream/consumers' { export * from 'node:stream/consumers'; }
declare module 'stream/web' { export * from 'node:stream/web'; }
declare module 'child_process' { import m = require('node:child_process'); export = m; }
declare module 'readline' { import m = require('node:readline'); export = m; }
declare module 'readline/promises' { import m = require('node:readline/promises'); export = m; }
declare module 'diagnostics_channel' { import m = require('node:diagnostics_channel'); export = m; }
declare module 'sys' { import m = require('node:sys'); export = m; }
declare module 'net' { import m = require('node:net'); export = m; }
declare module 'dns' { import m = require('node:dns'); export = m; }
declare module 'dns/promises' { import m = require('node:dns/promises'); export = m; }
declare module 'http' { import m = require('node:http'); export = m; }
declare module 'https' { import m = require('node:https'); export = m; }
declare module 'tls' { import m = require('node:tls'); export = m; }
declare module 'dgram' { import m = require('node:dgram'); export = m; }
declare module 'async_hooks' { import m = require('node:async_hooks'); export = m; }
// node:test has no bare alias in Node ('test' is not a builtin)
declare module 'worker_threads' { import m = require('node:worker_threads'); export = m; }
declare module 'cluster' { import m = require('node:cluster'); export = m; }
