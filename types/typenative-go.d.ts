// Type definitions for TypeNative's Go standard library modules.
//
// Each `declare module 'go:<pkg>'` mirrors what the transpiler supports for
// that package (see conformance.md → "Go standard library"). Conventions:
//   - Go int/int8..int64/uint*/byte/rune/float32 → `number`
//     (the transpiler converts JS numbers to the declared Go parameter type)
//   - Go `[]byte` parameters accept a JS `string` (converted) or `Uint8Array`
//   - Go `(T, error)` returns are declared as plain `T`: the transpiler wraps
//     the call in a helper that panics on error, so `try`/`catch` catches it
//   - Go `time.Duration` → `number` (arithmetic like `time.Second * 2` works)
//   - `GBytes` values are Go []byte: they print in Go format and can be
//     passed to other go: functions, indexed, and measured with .length

/** Go []byte slice (produced by ReadFile, Sum256, DecodeString, ...) */
type GBytes = Uint8Array;

/** context.Context, an opaque handle */
interface GoContext {
  _opaque: never;
}

/** hash.Hash from crypto/* and hash/* constructors */
interface GoHash {
  Sum(b: GBytes | null): GBytes;
  Reset(): void;
  Size(): number;
  BlockSize(): number;
}

/** io.Reader / io.Writer as opaque handles (os.Stdin, resp.Body, ...) */
interface GoReaderWriter {
  _opaque: never;
}

/** Go error value (errors.New, io.EOF, ...) */
type GoError = Error;

/** time.Time */
interface Gotime {
  // Go-style methods
  Add(d: number): Gotime;
  AddDate(years: number, months: number, days: number): Gotime;
  After(u: Gotime): boolean;
  Before(u: Gotime): boolean;
  Day(): number;
  Equal(u: Gotime): boolean;
  Format(layout: string): string;
  Hour(): number;
  IsZero(): boolean;
  Local(): Gotime;
  Location(): GotimeLocation;
  Minute(): number;
  Month(): number;
  Nanosecond(): number;
  Second(): number;
  String(): string;
  Sub(u: Gotime): number;
  Truncate(d: number): Gotime;
  UTC(): Gotime;
  Unix(): number;
  UnixMicro(): number;
  UnixMilli(): number;
  UnixNano(): number;
  Weekday(): number;
  Year(): number;
  YearDay(): number;
  // JS Date-style getters (mapped by the transpiler)
  getDate(): number;
  getDay(): number;
  getFullYear(): number;
  getHours(): number;
  getMilliseconds(): number;
  getMinutes(): number;
  getMonth(): number;
  getSeconds(): number;
  getTime(): number;
  toISOString(): string;
  toString(): string;
  valueOf(): number;
}

/** *time.Location */
interface GotimeLocation {
  String(): string;
}

/** regexp.Regexp */
interface GoRegexp {
  FindAllString(s: string, n: number): string[];
  FindAllStringIndex(s: string, n: number): number[][];
  FindAllStringSubmatch(s: string, n: number): string[][];
  FindString(s: string): string;
  FindStringIndex(s: string): number[];
  FindStringSubmatch(s: string): string[];
  Longest(): void;
  Match(b: string | GBytes): boolean;
  MatchString(s: string): boolean;
  NumSubexp(): number;
  ReplaceAllLiteralString(src: string, repl: string): string;
  ReplaceAllString(src: string, repl: string): string;
  Split(s: string, n: number): string[];
  String(): string;
  SubexpNames(): string[];
}

/** *url.URL */
interface GoURL {
  Fragment: string;
  Host: string;
  Hostname: string;
  Opaque: string;
  Path: string;
  Port: string;
  RawFragment: string;
  RawPath: string;
  RawQuery: string;
  Scheme: string;
  EscapedPath(): string;
  IsAbs(): boolean;
  Query(): GoURLValues;
  RequestURI(): string;
  String(): string;
}

/** url.Values */
interface GoURLValues {
  Add(key: string, value: string): void;
  Del(key: string): void;
  Encode(): string;
  Get(key: string): string;
  Has(key: string): boolean;
  Set(key: string, value: string): void;
}

/** *http.Response */
interface GoHTTPResponse {
  Body: GoReaderWriter;
  ContentLength: number;
  Header: GoHTTPHeader;
  Proto: string;
  Status: string;
  StatusCode: number;
  Cookies(): unknown;
}

/** *http.Request */
interface GoHTTPRequest {
  Header: GoHTTPHeader;
  Host: string;
  Method: string;
  Proto: string;
  RemoteAddr: string;
  URL: GoURL;
  Context(): GoContext;
  SetBasicAuth(username: string, password: string): void;
  UserAgent(): string;
}

/** http.Header */
interface GoHTTPHeader {
  Add(key: string, value: string): void;
  Del(key: string): void;
  Get(key: string): string;
  Set(key: string, value: string): void;
  Values(key: string): string[];
}

/** *os.File */
interface GoFile {
  Close(): void;
  Name(): string;
  Stat(): GoFileInfo;
  Sync(): void;
}

/** os.FileInfo */
interface GoFileInfo {
  IsDir(): boolean;
  ModTime(): Gotime;
  Name(): string;
  Size(): number;
}

/** os.DirEntry */
interface GoDirEntry {
  IsDir(): boolean;
  Name(): string;
}

/** bufio.Reader */
interface GoBufioReader {
  Buffered(): number;
  ReadByte(): number;
  ReadRune(): number;
  ReadString(delim: string): string;
}

/** bufio.Scanner */
interface GoBufioScanner {
  Bytes(): GBytes;
  Err(): GoError | null;
  Scan(): boolean;
  Text(): string;
}

/** bufio.Writer */
interface GoBufioWriter {
  Flush(): void;
}

/** bytes.Buffer */
interface GoBuffer {
  Bytes(): GBytes;
  Len(): number;
  Reset(): void;
  String(): string;
  WriteByte(c: string): void;
  WriteString(s: string): number;
}

/** *base64.Encoding */
interface GoBase64Encoding {
  DecodeString(s: string): GBytes;
  DecodedLen(n: number): number;
  EncodeToString(src: string | GBytes): string;
  EncodedLen(n: number): number;
}

/** *exec.Cmd */
interface GoCmd {
  CombinedOutput(): GBytes;
  Output(): GBytes;
  Run(): void;
  Start(): void;
  String(): string;
  Wait(): void;
}

/** reflect.Type */
interface GoReflectType {
  Kind(): number;
  Name(): string;
  String(): string;
}

/** reflect.Value */
interface GoReflectValue {
  Bool(): boolean;
  Float(): number;
  Int(): number;
  Interface(): unknown;
  IsNil(): boolean;
  IsValid(): boolean;
  Kind(): number;
  Len(): number;
  String(): string;
  Type(): GoReflectType;
}

/** *log.Logger */
interface GoLogger {
  Fatal(...args: unknown[]): void;
  Fatalf(format: string, ...args: unknown[]): void;
  Panic(...args: unknown[]): void;
  Panicf(format: string, ...args: unknown[]): void;
  Print(...args: unknown[]): void;
  Printf(format: string, ...args: unknown[]): void;
  Println(...args: unknown[]): void;
}

/** Go [N]byte digest arrays (sha256.Sum256 etc.) */
type GoDigest = number[];

declare module 'go:bufio' {
  export function NewReader(r: GoReaderWriter): GoBufioReader;
  export function NewScanner(r: GoReaderWriter): GoBufioScanner;
  export function NewWriter(w: GoReaderWriter): GoBufioWriter;
}

declare module 'go:bytes' {
  export function Compare(a: string | GBytes, b: string | GBytes): number;
  export function Contains(s: string | GBytes, substr: string | GBytes): boolean;
  export function ContainsAny(s: string | GBytes, chars: string): boolean;
  export function ContainsRune(s: string | GBytes, r: string): boolean;
  export function Count(s: string | GBytes, sep: string | GBytes): number;
  export function Equal(a: string | GBytes, b: string | GBytes): boolean;
  export function EqualFold(a: string | GBytes, b: string | GBytes): boolean;
  export function Fields(s: string | GBytes): GBytes[];
  export function HasPrefix(s: string | GBytes, prefix: string | GBytes): boolean;
  export function HasSuffix(s: string | GBytes, suffix: string | GBytes): boolean;
  export function Index(s: string | GBytes, sep: string | GBytes): number;
  export function IndexAny(s: string | GBytes, chars: string): number;
  export function IndexByte(s: string | GBytes, c: string): number;
  export function IndexRune(s: string | GBytes, r: string): number;
  export function Join(s: (string | GBytes)[], sep: string | GBytes): GBytes;
  export function LastIndex(s: string | GBytes, sep: string | GBytes): number;
  export function LastIndexAny(s: string | GBytes, chars: string): number;
  export function NewBuffer(buf: string | GBytes): GoBuffer;
  export function NewBufferString(str: string): GoBuffer;
  export function Repeat(s: string | GBytes, count: number): GBytes;
  export function Replace(s: string | GBytes, old: string | GBytes, nu: string | GBytes, n: number): GBytes;
  export function ReplaceAll(s: string | GBytes, old: string | GBytes, nu: string | GBytes): GBytes;
  export function Runes(s: string | GBytes): string[];
  export function Split(s: string | GBytes, sep: string | GBytes): GBytes[];
  export function SplitAfter(s: string | GBytes, sep: string | GBytes): GBytes[];
  export function SplitN(s: string | GBytes, sep: string | GBytes, n: number): GBytes[];
  export function Title(s: string | GBytes): GBytes;
  export function ToLower(s: string | GBytes): GBytes;
  export function ToTitle(s: string | GBytes): GBytes;
  export function ToUpper(s: string | GBytes): GBytes;
  export function Trim(s: string | GBytes, cutset: string): GBytes;
  export function TrimLeft(s: string | GBytes, cutset: string): GBytes;
  export function TrimPrefix(s: string | GBytes, prefix: string | GBytes): GBytes;
  export function TrimRight(s: string | GBytes, cutset: string): GBytes;
  export function TrimSpace(s: string | GBytes): GBytes;
  export function TrimSuffix(s: string | GBytes, suffix: string | GBytes): GBytes;
}

declare module 'go:cmp' {
  export function Compare(x: number | string, y: number | string): number;
  export function Less(x: number | string, y: number | string): boolean;
}

declare module 'go:context' {
  export function Background(): GoContext;
  export function TODO(): GoContext;
  export function WithValue(parent: GoContext, key: unknown, value: unknown): GoContext;
}

declare module 'go:crypto/hmac' {
  export function New(h: () => GoHash, key: string | GBytes): GoHash;
  export function Equal(mac1: string | GBytes, mac2: string | GBytes): boolean;
}

declare module 'go:crypto/md5' {
  export function Sum(data: string | GBytes): GoDigest;
  export function New(): GoHash;
}

declare module 'go:crypto/rand' {
  /** Random text string (Go 1.24+), 26 letters, no error return */
  export function Text(): string;
}

declare module 'go:crypto/sha1' {
  export function Sum(data: string | GBytes): GoDigest;
  export function New(): GoHash;
}

declare module 'go:crypto/sha256' {
  export function Sum224(data: string | GBytes): GoDigest;
  export function Sum256(data: string | GBytes): GoDigest;
  export function New(): GoHash;
  export function New224(): GoHash;
  export const Size: number;
  export const BlockSize: number;
}

declare module 'go:crypto/sha512' {
  export function Sum384(data: string | GBytes): GoDigest;
  export function Sum512(data: string | GBytes): GoDigest;
  export function New384(): GoHash;
  export function New512(): GoHash;
}

declare module 'go:crypto/subtle' {
  export function ConstantTimeCompare(x: string | GBytes, y: string | GBytes): number;
  export function ConstantTimeByteEq(x: number, y: number): boolean;
}

declare module 'go:encoding/base64' {
  export const StdEncoding: GoBase64Encoding;
  export const URLEncoding: GoBase64Encoding;
  export const RawStdEncoding: GoBase64Encoding;
  export const RawURLEncoding: GoBase64Encoding;
}

declare module 'go:encoding/hex' {
  export function EncodeToString(src: string | GBytes): string;
  export function DecodeString(s: string): GBytes;
  export function Encode(src: string | GBytes): GBytes;
  export function Decode(src: string | GBytes): GBytes;
  export function Dump(data: string | GBytes): string;
}

declare module 'go:encoding/json' {
  export function Marshal(v: unknown): GBytes;
  export function MarshalIndent(v: unknown, prefix: string, indent: string): GBytes;
  export function Valid(data: string | GBytes): boolean;
}

declare module 'go:errors' {
  export function New(text: string): GoError;
  export function Is(err: unknown, target: unknown): boolean;
  export function Unwrap(err: GoError): GoError | null;
  export function Join(errs: (GoError | null)[]): GoError;
}

declare module 'go:fmt' {
  export function Append(b: string | GBytes, ...args: unknown[]): GBytes;
  export function Appendf(b: string | GBytes, format: string, ...args: unknown[]): GBytes;
  export function Errorf(format: string, ...args: unknown[]): GoError;
  export function Fprint(w: GoReaderWriter, ...args: unknown[]): void;
  export function Fprintf(w: GoReaderWriter, format: string, ...args: unknown[]): void;
  export function Fprintln(w: GoReaderWriter, ...args: unknown[]): void;
  export function Print(...args: unknown[]): void;
  export function Printf(format: string, ...args: unknown[]): void;
  export function Println(...args: unknown[]): void;
  export function Sprint(...args: unknown[]): string;
  export function Sprintf(format: string, ...args: unknown[]): string;
  export function Sprintln(...args: unknown[]): string;
}

declare module 'go:hash/adler32' {
  export function Checksum(data: string | GBytes): number;
  export function New(): GoHash;
}

declare module 'go:hash/crc32' {
  export function Checksum(data: string | GBytes, tab: unknown): number;
  export function ChecksumIEEE(data: string | GBytes): number;
  export function Update(crc: number, tab: unknown, p: string | GBytes): number;
  export function NewIEEE(): GoHash;
}

declare module 'go:hash/crc64' {
  export function Checksum(crc: string | GBytes, tab: unknown): number;
  export function Update(crc: number, tab: unknown, p: string | GBytes): number;
  export function NewIEEE(): GoHash;
  export function MakeTable(poly: number): unknown;
  export const ECMA: number;
  export const ISO: number;
}

declare module 'go:hash/fnv' {
  export function New32(): GoHash;
  export function New32a(): GoHash;
  export function New64(): GoHash;
  export function New64a(): GoHash;
}

declare module 'go:html' {
  export function EscapeString(s: string): string;
  export function UnescapeString(s: string): string;
}

declare module 'go:io' {
  export function Copy(dst: GoReaderWriter, src: GoReaderWriter): void;
  export function CopyN(dst: GoReaderWriter, src: GoReaderWriter, n: number): void;
  export function Discard(r: GoReaderWriter, n: number): void;
  export function NopCloser(r: GoReaderWriter): GoReaderWriter;
  export function ReadAll(r: GoReaderWriter): GBytes;
  export function WriteString(w: GoReaderWriter, s: string): void;
  export const EOF: GoError;
  export const ErrClosed: GoError;
  export const ErrUnexpectedEOF: GoError;
}

declare module 'go:log' {
  export function Fatal(...args: unknown[]): void;
  export function Fatalf(format: string, ...args: unknown[]): void;
  export function Fatalln(...args: unknown[]): void;
  export function Panic(...args: unknown[]): void;
  export function Panicf(format: string, ...args: unknown[]): void;
  export function Panicln(...args: unknown[]): void;
  export function Print(...args: unknown[]): void;
  export function Printf(format: string, ...args: unknown[]): void;
  export function Println(...args: unknown[]): void;
  export function SetFlags(flags: number): void;
  export function SetOutput(w: GoReaderWriter): void;
  export function SetPrefix(prefix: string): void;
}

declare module 'go:log/slog' {
  export function Debug(msg: string, ...args: unknown[]): void;
  export function Error(msg: string, ...args: unknown[]): void;
  export function Info(msg: string, ...args: unknown[]): void;
  export function Warn(msg: string, ...args: unknown[]): void;
}

declare module 'go:math' {
  export function Abs(x: number): number;
  export function Acos(x: number): number;
  export function Acosh(x: number): number;
  export function Asin(x: number): number;
  export function Asinh(x: number): number;
  export function Atan(x: number): number;
  export function Atan2(y: number, x: number): number;
  export function Atanh(x: number): number;
  export function Cbrt(x: number): number;
  export function Ceil(x: number): number;
  export function Copysign(x: number, y: number): number;
  export function Cos(x: number): number;
  export function Cosh(x: number): number;
  export function Dim(x: number, y: number): number;
  export function Erf(x: number): number;
  export function Erfc(x: number): number;
  export function Erfinv(x: number): number;
  export function Exp(x: number): number;
  export function Exp2(x: number): number;
  export function Expm1(x: number): number;
  export function Floor(x: number): number;
  export function Gamma(x: number): number;
  export function Hypot(x: number, y: number): number;
  export function Ilogb(x: number): number;
  export function Inf(sign: number): number;
  export function IsInf(f: number, sign: number): boolean;
  export function IsNaN(f: number): boolean;
  export function Jn(n: number, x: number): number;
  export function Ldexp(frac: number, exp: number): number;
  export function Log(x: number): number;
  export function Log10(x: number): number;
  export function Log1p(x: number): number;
  export function Log2(x: number): number;
  export function Logb(x: number): number;
  export function Max(x: number, y: number): number;
  export function Min(x: number, y: number): number;
  export function Mod(x: number, y: number): number;
  export function NaN(): number;
  export function Nextafter(x: number, y: number): number;
  export function Pow(x: number, y: number): number;
  export function Remainder(x: number, y: number): number;
  export function Round(x: number): number;
  export function RoundToEven(x: number): number;
  export function Signbit(x: number): boolean;
  export function Sin(x: number): number;
  export function Sinh(x: number): number;
  export function Sqrt(x: number): number;
  export function Tan(x: number): number;
  export function Tanh(x: number): number;
  export function Trunc(x: number): number;

  export const E: number;
  export const Ln10: number;
  export const Ln2: number;
  export const Log10E: number;
  export const Log2E: number;
  export const MaxFloat64: number;
  export const MaxInt: number;
  export const MaxInt8: number;
  export const MaxInt16: number;
  export const MaxInt32: number;
  export const MaxInt64: number;
  export const MaxUint8: number;
  export const MaxUint16: number;
  export const MaxUint32: number;
  export const MaxUint64: number;
  export const MinInt: number;
  export const MinInt8: number;
  export const MinInt16: number;
  export const MinInt32: number;
  export const MinInt64: number;
  export const Phi: number;
  export const Pi: number;
  export const SmallestNonzeroFloat64: number;
  export const Sqrt2: number;
  export const SqrtE: number;
  export const SqrtPi: number;
}

declare module 'go:math/big' {
  export function NewInt(x: number): bigint;
}

declare module 'go:math/bits' {
  export function LeadingZeros(x: number): number;
  export function LeadingZeros8(x: number): number;
  export function LeadingZeros16(x: number): number;
  export function LeadingZeros32(x: number): number;
  export function LeadingZeros64(x: number): number;
  export function Len(x: number): number;
  export function Len8(x: number): number;
  export function Len16(x: number): number;
  export function Len32(x: number): number;
  export function Len64(x: number): number;
  export function OnesCount(x: number): number;
  export function OnesCount8(x: number): number;
  export function OnesCount16(x: number): number;
  export function OnesCount32(x: number): number;
  export function OnesCount64(x: number): number;
  export function Reverse(x: number): number;
  export function Reverse8(x: number): number;
  export function Reverse16(x: number): number;
  export function Reverse32(x: number): number;
  export function Reverse64(x: number): number;
  export function ReverseBytes(x: number): number;
  export function ReverseBytes16(x: number): number;
  export function ReverseBytes32(x: number): number;
  export function ReverseBytes64(x: number): number;
  export function RotateLeft(x: number, k: number): number;
  export function RotateLeft8(x: number, k: number): number;
  export function RotateLeft16(x: number, k: number): number;
  export function RotateLeft32(x: number, k: number): number;
  export function RotateLeft64(x: number, k: number): number;
  export function RotateRight(x: number, k: number): number;
  export function TrailingZeros(x: number): number;
  export function TrailingZeros8(x: number): number;
  export function TrailingZeros16(x: number): number;
  export function TrailingZeros32(x: number): number;
  export function TrailingZeros64(x: number): number;
}

declare module 'go:math/rand' {
  export function ExpFloat64(): number;
  export function Float32(): number;
  export function Float64(): number;
  export function Int(): number;
  export function Int31(): number;
  export function Int31N(n: number): number;
  export function Int63(): number;
  export function Int63N(n: number): number;
  export function Intn(n: number): number;
  export function NormFloat64(): number;
  export function Perm(n: number): number[];
  export function Seed(seed: number): void;
  export function Uint32(): number;
  export function Uint64(): number;
}

declare module 'go:math/rand/v2' {
  export function ExpFloat64(): number;
  export function Float32(): number;
  export function Float64(): number;
  export function Int(): number;
  export function Int32N(n: number): number;
  export function Int64N(n: number): number;
  export function IntN(n: number): number;
  export function NormFloat64(): number;
  export function Perm(n: number): number[];
  export function Uint32(): number;
  export function Uint64(): number;
  export function UintN(n: number): number;
}

declare module 'go:net/http' {
  export function Get(url: string): GoHTTPResponse;
  export function Head(url: string): GoHTTPResponse;
  export function Post(url: string, contentType: string, body: string | GBytes | null): GoHTTPResponse;
  export function PostForm(url: string, data: GoURLValues): GoHTTPResponse;
  export function NewRequest(method: string, url: string, body: string | GBytes | null): GoHTTPRequest;
  export function ReadResponse(r: GoReaderWriter, req: GoHTTPRequest | null): GoHTTPResponse;
  export const DefaultMaxHeaderBytes: number;
  export const DefaultMaxIdleConns: number;
}

declare module 'go:net/url' {
  export function JoinPath(base: string, elem: string[]): GoURL;
  export function Parse(rawURL: string): GoURL;
  export function ParseQuery(query: string): GoURLValues;
  export function ParseRequestURI(rawURL: string): GoURL;
  export function PathEscape(s: string): string;
  export function PathUnescape(s: string): string;
  export function QueryEscape(s: string): string;
  export function QueryUnescape(s: string): string;
}

declare module 'go:os' {
  export function Chdir(dir: string): void;
  export function Chmod(name: string, mode: number): void;
  export function Create(name: string): GoFile;
  export function Environ(): string[];
  export function Executable(): string;
  export function Exit(code: number): void;
  export function Expand(s: string, mapping: (key: string) => string): string;
  export function Getenv(key: string): string;
  export function Getpagesize(): number;
  export function Getwd(): string;
  export function Hostname(): string;
  export function LookupEnv(key: string): string;
  export function Mkdir(name: string, mode: number): void;
  export function MkdirAll(path: string, mode: number): void;
  export function MkdirTemp(dir: string, pattern: string): string;
  export function Open(name: string): GoFile;
  export function OpenFile(name: string, flag: number, mode: number): GoFile;
  export function ReadDir(name: string): GoDirEntry[];
  export function ReadFile(name: string): GBytes;
  export function Remove(name: string): void;
  export function RemoveAll(path: string): void;
  export function Rename(oldpath: string, newpath: string): void;
  export function SameFile(fi1: GoFileInfo, fi2: GoFileInfo): boolean;
  export function Setenv(key: string, value: string): void;
  export function Stat(name: string): GoFileInfo;
  export function TempDir(): string;
  export function Truncate(name: string, size: number): void;
  export function Unsetenv(key: string): void;
  export function UserCacheDir(): string;
  export function UserConfigDir(): string;
  export function UserHomeDir(): string;
  export function WriteFile(name: string, data: string | GBytes, mode: number): void;

  export const Args: string[];
  export const DevNull: string;
  export const Stderr: GoFile;
  export const Stdin: GoFile;
  export const Stdout: GoFile;
}

declare module 'go:os/exec' {
  export function Command(name: string, ...arg: string[]): GoCmd;
  export function CommandContext(ctx: GoContext, name: string, ...arg: string[]): GoCmd;
}

declare module 'go:path' {
  export function Base(p: string): string;
  export function Clean(p: string): string;
  export function Dir(p: string): string;
  export function Ext(p: string): string;
  export function IsAbs(p: string): boolean;
  export function Join(...elem: string[]): string;
  export function Match(pattern: string, name: string): boolean;
}

declare module 'go:path/filepath' {
  export function Abs(p: string): string;
  export function Base(p: string): string;
  export function Clean(p: string): string;
  export function Dir(p: string): string;
  export function EvalSymlinks(path: string): string;
  export function Ext(p: string): string;
  export function FromSlash(p: string): string;
  export function Glob(pattern: string): string[];
  export function IsAbs(p: string): boolean;
  export function Join(...elem: string[]): string;
  export function Localize(p: string): string;
  export function Match(pattern: string, name: string): boolean;
  export function Rel(basepath: string, targpath: string): string;
  export function SplitList(p: string): string[];
  export function ToSlash(p: string): string;
  export function VolumeName(p: string): string;
}

declare module 'go:reflect' {
  export function DeepEqual(x: unknown, y: unknown): boolean;
  export function Indirect(v: unknown): unknown;
  export function TypeOf(v: unknown): GoReflectType;
  export function ValueOf(v: unknown): GoReflectValue;
}

declare module 'go:regexp' {
  export function Compile(expr: string): GoRegexp;
  export function MustCompile(expr: string): GoRegexp;
  export function QuoteMeta(s: string): string;
}

declare module 'go:runtime' {
  export function Compiler(): string;
  export function GC(): void;
  export function GOROOT(): string;
  export function NumCPU(): number;
  export function NumGoroutine(): number;
  export function Version(): string;

  export const GOARCH: string;
  export const GOOS: string;
}

declare module 'go:runtime/debug' {
  export function FreeOSMemory(): void;
  export function PrintStack(): void;
  export function SetGCPercent(gcpercent: number): number;
  export function SetMemoryLimit(limit: number): number;
  export function SetTraceback(level: string): void;
  export function Stack(): GBytes;
}

declare module 'go:slices' {
  export function Clone<S extends unknown[]>(s: S): S;
  export function Compare(x: unknown[], y: unknown[]): number;
  export function Compact<S extends unknown[]>(s: S): S;
  export function Concat<S extends unknown[]>(...s: S[]): S;
  export function Contains(s: unknown[], v: unknown): boolean;
  export function Delete<S extends unknown[]>(s: S, i: number, j: number): S;
  export function Equal(x: unknown[], y: unknown[]): boolean;
  export function Index(s: unknown[], v: unknown): number;
  export function IsSorted(s: unknown[]): boolean;
  export function Max<E>(s: E[]): E;
  export function Min<E>(s: E[]): E;
  export function Repeat<S extends unknown[]>(s: S, count: number): S;
  export function Reverse<S extends unknown[]>(s: S): S;
  export function Sort(s: unknown[]): void;
}

declare module 'go:sort' {
  export function Float64s(a: number[]): void;
  export function Float64sAreSorted(a: number[]): boolean;
  export function SearchFloat64s(a: number[], x: number): number;
  export function SearchStrings(a: string[], x: string): number;
  export function Strings(a: string[]): void;
  export function StringsAreSorted(a: string[]): boolean;
}

declare module 'go:strconv' {
  export function AppendQuote(dst: string | GBytes, s: string): GBytes;
  export function Atoi(s: string): number;
  export function FormatBool(b: boolean): string;
  /** fmt is a single character: "e" | "E" | "f" | "g" | "G" */
  export function FormatFloat(f: number, fmt: string, prec: number, bitSize: number): string;
  export function FormatInt(i: number, base: number): string;
  export function FormatUint(i: number, base: number): string;
  export function Itoa(i: number): string;
  export function ParseBool(str: string): boolean;
  export function ParseFloat(s: string, bitSize: number): number;
  export function ParseInt(s: string, base: number, bitSize: number): number;
  export function ParseUint(s: string, base: number, bitSize: number): number;
  export function Quote(s: string): string;
  export function QuoteToASCII(s: string): string;
  export function Unquote(s: string): string;

  export const IntSize: number;
}

declare module 'go:strings' {
  export function Compare(a: string, b: string): number;
  export function Contains(s: string, substr: string): boolean;
  export function ContainsAny(s: string, chars: string): boolean;
  export function ContainsRune(s: string, r: string): boolean;
  export function Count(s: string, substr: string): number;
  export function EqualFold(s: string, t: string): boolean;
  export function Fields(s: string): string[];
  export function HasPrefix(s: string, prefix: string): boolean;
  export function HasSuffix(s: string, suffix: string): boolean;
  export function Index(s: string, substr: string): number;
  export function IndexAny(s: string, chars: string): number;
  export function IndexByte(s: string, c: string): number;
  export function IndexRune(s: string, r: string): number;
  export function Join(elems: string[], sep: string): string;
  export function LastIndex(s: string, substr: string): number;
  export function LastIndexAny(s: string, chars: string): number;
  export function LastIndexByte(s: string, c: string): number;
  export function Repeat(s: string, count: number): string;
  export function Replace(s: string, old: string, nu: string, n: number): string;
  export function ReplaceAll(s: string, old: string, nu: string): string;
  export function Split(s: string, sep: string): string[];
  export function SplitAfter(s: string, sep: string): string[];
  export function SplitN(s: string, sep: string, n: number): string[];
  export function ToLower(s: string): string;
  export function ToTitle(s: string): string;
  export function ToUpper(s: string): string;
  export function ToValidUTF8(s: string, repl: string): string;
  export function Trim(s: string, cutset: string): string;
  export function TrimLeft(s: string, cutset: string): string;
  export function TrimPrefix(s: string, prefix: string): string;
  export function TrimRight(s: string, cutset: string): string;
  export function TrimSpace(s: string): string;
  export function TrimSuffix(s: string, suffix: string): string;
}

declare module 'go:time' {
  export function Date(
    year: number,
    month: number,
    day: number,
    hour: number,
    min: number,
    sec: number,
    nsec: number,
    loc: GotimeLocation | null
  ): Gotime;
  export function FixedZone(name: string, offset: number): GotimeLocation;
  export function LoadLocation(name: string): GotimeLocation;
  export function Now(): Gotime;
  export function Parse(layout: string, value: string): Gotime;
  export function ParseDuration(s: string): number;
  export function ParseInLocation(layout: string, value: string, loc: GotimeLocation): Gotime;
  export function Since(t: Gotime): number;
  export function Unix(sec: number, nsec: number): Gotime;
  export function UnixMicro(micro: number): Gotime;
  export function UnixMilli(milli: number): Gotime;
  export function Until(t: Gotime): number;

  export const ANSIC: string;
  export const April: number;
  export const August: number;
  export const DateOnly: string;
  export const DateTime: string;
  export const December: number;
  export const February: number;
  export const Friday: number;
  export const Hour: number;
  export const January: number;
  export const July: number;
  export const June: number;
  export const Kitchen: string;
  export const March: number;
  export const May: number;
  export const Microsecond: number;
  export const Millisecond: number;
  export const Minute: number;
  export const Monday: number;
  export const Nanosecond: number;
  export const November: number;
  export const October: number;
  export const RFC1123: string;
  export const RFC1123Z: string;
  export const RFC3339: string;
  export const RFC3339Nano: string;
  export const RFC822: string;
  export const RFC822Z: string;
  export const RFC850: string;
  export const RubyDate: string;
  export const Saturday: number;
  export const Second: number;
  export const September: number;
  export const Stamp: string;
  export const StampMicro: string;
  export const StampMilli: string;
  export const StampNano: string;
  export const Sunday: number;
  export const Thursday: number;
  export const TimeOnly: string;
  export const Tuesday: number;
  export const UnixDate: string;
  export const UTC: GotimeLocation;
  export const Wednesday: number;
}

declare module 'go:unicode' {
  export function IsControl(r: string): boolean;
  export function IsDigit(r: string): boolean;
  export function IsGraphic(r: string): boolean;
  export function IsLetter(r: string): boolean;
  export function IsLower(r: string): boolean;
  export function IsMark(r: string): boolean;
  export function IsNumber(r: string): boolean;
  export function IsPrint(r: string): boolean;
  export function IsPunct(r: string): boolean;
  export function IsSpace(r: string): boolean;
  export function IsSymbol(r: string): boolean;
  export function IsTitle(r: string): boolean;
  export function IsUpper(r: string): boolean;
  export function SimpleFold(r: string): string;
  export function ToLower(r: string): string;
  export function ToTitle(r: string): string;
  export function ToUpper(r: string): string;
}

declare module 'go:unicode/utf8' {
  export function FullRuneInString(s: string): boolean;
  export function RuneCountInString(s: string): number;
  export function RuneLen(r: string): number;
  export function RuneStart(b: string): boolean;
  export function Valid(b: string | GBytes): boolean;
  export function ValidRune(r: string): boolean;
  export function ValidString(s: string): boolean;

}
