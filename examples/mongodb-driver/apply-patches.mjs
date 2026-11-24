// Documented upstream patches for the files TypeNative cannot compile as-is.
// Run after `node rewrite-imports.mjs`; idempotent. See VENDOR.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, 'vendor');

function edit(file, from, to, all = false) {
  const full = path.join(vendor, file);
  let s = fs.readFileSync(full, 'utf8');
  if (to !== '' && s.includes(to) && to.includes(from)) {
    console.log(`already applied ${file}`);
    return;
  }
  if (!s.includes(from)) {
    console.log(`already applied ${file}`);
    return;
  }
  s = all ? s.split(from).join(to) : s.replace(from, to);
  fs.writeFileSync(full, s);
  console.log(`patched ${file}`);
}

// TypeNative lowers Node's zstd helper with a Go package named `zstd`; the
// driver's module-level `let zstd` collides with it.
edit('mongodb/src/cmap/wire_protocol/compression.ts', 'let zstd: ZStandard;', 'let zstdLib: ZStandard;');
for (const [from, to] of [
  ["'kModuleError' in zstd)", "'kModuleError' in zstdLib)"],
  ["throw zstd[", "throw zstdLib["],
  ['zstd.compress(', 'zstdLib.compress('],
  ['zstd.decompress(', 'zstdLib.decompress('],
  ['if (!zstd)', 'if (!zstdLib)'],
  ['zstd = getZstdLibrary()', 'zstdLib = getZstdLibrary()']
]) edit('mongodb/src/cmap/wire_protocol/compression.ts', from, to, true);

// `class Timeout extends Promise<never>`: TypeNative's promises are Go
// channels, and a class cannot extend one. Keep the promise it settles as a
// field, and race that field (see the call sites below).
edit(
  'mongodb/src/timeout.ts',
  'export class Timeout extends Promise<never> {',
  `export class Timeout {
  /** The promise this timeout settles; await or race this. */
  readonly promise: Promise<never>;`
);
edit(
  'mongodb/src/timeout.ts',
  `    let reject!: Reject;
    super((_, promiseReject) => {
      reject = promiseReject;

      executor(noop, promiseReject);
    });`,
  `    let reject!: Reject;
    this.promise = new Promise<never>((_, promiseReject) => {
      reject = promiseReject;

      executor(noop, promiseReject);
    });`
);
edit('mongodb/src/timeout.ts', '      this.then(undefined, squashError);', '      this.promise.then(undefined, squashError);');
edit('mongodb/src/timeout.ts', '  static override reject(rejection?: Error): Timeout {', '  static reject(rejection?: Error): Timeout {');

// Promise.race([promise, timeout]) now races the timeout's promise
for (const [file, from, to] of [
  ['mongodb/src/client-side-encryption/state_machine.ts', 'Promise.race([connectPromise, timeout])', 'Promise.race([connectPromise, timeout.promise])'],
  ['mongodb/src/client-side-encryption/state_machine.ts', 'Promise.race([willResolveKmsRequest, kmsRequestTimeout])', 'Promise.race([willResolveKmsRequest, kmsRequestTimeout.promise])'],
  ['mongodb/src/cmap/connection.ts', 'Promise.race([drainEvent, timeout])', 'Promise.race([drainEvent, timeout.promise])'],
  ['mongodb/src/cmap/connection_pool.ts', 'Promise.race([promise, timeout])', 'Promise.race([promise, timeout.promise])'],
  ['mongodb/src/sdam/topology.ts', 'Promise.race([serverPromise, timeout])', 'Promise.race([serverPromise, timeout.promise])'],
  ['mongodb/src/cmap/auth/mongodb_oidc/automated_callback_workflow.ts', 'Promise.race([this.executeAndValidateCallback(params), timeout])', 'Promise.race([this.executeAndValidateCallback(params), timeout.promise])'],
  ['mongodb/src/cmap/auth/mongodb_oidc/human_callback_workflow.ts', 'Promise.race([this.executeAndValidateCallback(params), timeout])', 'Promise.race([this.executeAndValidateCallback(params), timeout.promise])']
]) edit(file, from, to);

// `require('child_process')` in a TypeScript body: a static import is what
// this call means (the driver runs the same under Node).
edit(
  'mongodb/src/client-side-encryption/mongocryptd_manager.ts',
  "import type { ChildProcess } from 'child_process';",
  "import { spawn, type ChildProcess } from 'child_process';"
);
edit(
  'mongodb/src/client-side-encryption/mongocryptd_manager.ts',
  `    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { spawn } = require('child_process') as typeof import('child_process');

`,
  ''
);

// `require('../../../package.json').version`: a JSON require in a TS body.
// Inline the version (the vendored tree is pinned; Node reads the same value).
edit(
  'mongodb/src/cmap/handshake/client_metadata.ts',
  "// eslint-disable-next-line @typescript-eslint/no-require-imports\nconst NODE_DRIVER_VERSION = require('../../../package.json').version;",
  "// (TypeNative: the vendored tree is pinned at this version)\nconst NODE_DRIVER_VERSION = '7.9.1';"
);

// `interface LogConvertible extends Record<string, any>`: an interface cannot
// embed a Go map, so spell the index signature out.
edit(
  'mongodb/src/mongo_logger.ts',
  `export interface LogConvertible extends Record<string, any> {`,
  `export interface LogConvertible {
  [key: string]: any;`
);

// The example does not need these optional features. Removing them keeps
// their modules (and optional native dependencies) out of the binary.
// `db.ts`: no admin() and no change streams.
edit('mongodb/src/db.ts', "import { Admin } from './admin';\n", '');
edit(
  'mongodb/src/db.ts',
  "import { ChangeStream, type ChangeStreamDocument, type ChangeStreamOptions } from './change_stream';\n",
  ''
);
edit(
  'mongodb/src/db.ts',
  `  /** Return the Admin db instance */
  admin(): Admin {
    return new Admin(this);
  }

`,
  ''
);
edit(
  'mongodb/src/db.ts',
  `  watch<
    TSchema extends Document = Document,
    TChange extends Document = ChangeStreamDocument<TSchema>
  >(pipeline: Document[] = [], options: ChangeStreamOptions = {}): ChangeStream<TSchema, TChange> {
    // Allow optionally not specifying a pipeline
    if (!Array.isArray(pipeline)) {
      options = pipeline;
      pipeline = [];
    }

    return new ChangeStream<TSchema, TChange>(this, pipeline, resolveOptions(this, options));
  }

`,
  ''
);

// `collection.ts`: no change streams.
edit(
  'mongodb/src/collection.ts',
  "import { ChangeStream, type ChangeStreamDocument, type ChangeStreamOptions } from './change_stream';\n",
  ''
);
edit(
  'mongodb/src/collection.ts',
  `  watch<TLocal extends Document = TSchema, TChange extends Document = ChangeStreamDocument<TLocal>>(
    pipeline: Document[] = [],
    options: ChangeStreamOptions = {}
  ): ChangeStream<TLocal, TChange> {
    // Allow optionally not specifying a pipeline
    if (!Array.isArray(pipeline)) {
      options = pipeline;
      pipeline = [];
    }

    return new ChangeStream<TLocal, TChange>(this, pipeline, resolveOptions(this, options));
  }

`,
  ''
);

// `mongo_client.ts` imported TopologyType from the package barrel ('.'),
// which links every export, including bulk/GridFS/encryption/change streams.
edit(
  'mongodb/src/mongo_client.ts',
  "import { TopologyType } from '.';",
  "import { TopologyType } from './sdam/common';"
);
edit(
  'mongodb/src/mongo_client.ts',
  "import { ChangeStream, type ChangeStreamDocument, type ChangeStreamOptions } from './change_stream';\n",
  ''
);
edit(
  'mongodb/src/mongo_client.ts',
  `  watch<
    TSchema extends Document = Document,
    TChange extends Document = ChangeStreamDocument<TSchema>
  >(pipeline: Document[] = [], options: ChangeStreamOptions = {}): ChangeStream<TSchema, TChange> {
    // Allow optionally not specifying a pipeline
    if (!Array.isArray(pipeline)) {
      options = pipeline;
      pipeline = [];
    }

    return new ChangeStream<TSchema, TChange>(this, pipeline, resolveOptions(this, options));
  }

`,
  ''
);

// A value import of GSSAPI pulled Kerberos (and its optional module) into a
// build that only needs SCRAM. Keep the shared constant locally.
edit(
  'mongodb/src/cmap/auth/mongo_credentials.ts',
  "import { GSSAPICanonicalizationValue } from './gssapi';\n",
  `export const GSSAPICanonicalizationValue = Object.freeze({
  on: true,
  off: false,
  none: 'none',
  forward: 'forward',
  forwardAndReverse: 'forwardAndReverse'
} as const);

`
);

// `AbstractCursor.stream()` returns a Node Readable; this example does not
// expose cursor streams, and the intersection return type maps to a different
// Go stream type than the subclass.
edit(
  'mongodb/src/cursor/abstract_cursor.ts',
  '  stream(): Readable & AsyncIterable<TSchema> {',
  '  stream(): any {'
);
edit(
  'mongodb/src/cursor/abstract_cursor.ts',
  `    if (!this.listeners('close').includes(removeActiveCursor)) {
      this.once('close', removeActiveCursor);
    }`,
  `    this.once('close', removeActiveCursor);`
);
edit(
  'mongodb/src/cursor/abstract_cursor.ts',
  `    const listeners = this.listeners('close') as unknown as Array<() => void>;
    if (!listeners.includes(removeActiveCursor)) {
      this.once('close', removeActiveCursor);
    }`,
  `    this.once('close', removeActiveCursor);`
);
// TimeoutContext.create takes a union intersected with a session; TypeNative
// lowers the union's first member, so the option object loses fields.
edit(
  'mongodb/src/timeout.ts',
  '  static create(options: TimeoutContextOptions): TimeoutContext {',
  '  static create(options: any): TimeoutContext {'
);

// `EventKey | symbol` erases to interface{}; TypeNative's EventEmitter takes a
// string event name. Every call site in the driver passes a string key.
edit(
  'mongodb/src/mongo_types.ts',
  '    event: EventKey | symbol,',
  '    event: string,',
  true
);

// BSON's dual Node/browser byte utils: TypeNative cannot pick a return type
// through the `ByteUtils` interface, so use the Node implementation directly.
const byteUtilsFile = path.join(vendor, 'bson/src/utils/byte_utils.ts');
let byteUtils = fs.readFileSync(byteUtilsFile, 'utf8');
let byteUtilsChanged = false;
if (byteUtils.includes("import { webByteUtils } from './web_byte_utils';\n")) {
  byteUtils = byteUtils.replace("import { webByteUtils } from './web_byte_utils';\n", '');
  byteUtilsChanged = true;
}
const byteUtilsStart = byteUtils.indexOf('declare const Buffer:');
const byteUtilsMarker = 'export const ByteUtils: ByteUtils = hasGlobalBuffer ? nodeJsByteUtils : webByteUtils;';
if (byteUtilsStart >= 0 && byteUtils.includes(byteUtilsMarker)) {
  byteUtils = byteUtils.slice(0, byteUtilsStart) + 'export const ByteUtils = nodeJsByteUtils;\n';
  byteUtilsChanged = true;
}
if (byteUtilsChanged) {
  fs.writeFileSync(byteUtilsFile, byteUtils);
  console.log('patched bson/src/utils/byte_utils.ts');
}

edit(
  'bson/src/bson_value.ts',
  '    return this.inspect(depth, options, inspect);',
  '    return this.inspect(0, options, inspect);'
);
edit(
  'bson/src/utils/node_byte_utils.ts',
  'function nodejsMathRandomBytes(byteLength: number): NodeJsBuffer {',
  'function nodejsMathRandomBytes(byteLength: number): Uint8Array {'
);
edit(
  'bson/src/utils/node_byte_utils.ts',
  'function nodejsSecureRandomBytes(byteLength: number): NodeJsBuffer {',
  'function nodejsSecureRandomBytes(byteLength: number): Uint8Array {'
);
edit(
  'mongodb/src/cmap/handshake/client_metadata.ts',
  'BSON.serialize(new Map().set(key, value)).byteLength - 5',
  'BSON.serialize(new Map().set(key, value)).length - 5'
);

// Destructuring from process.env lowers to direct field reads on the Go env
// map. Spell the reads out (the transpiler maps `process.env.NAME` to TnGetenv).
edit(
  'mongodb/src/cmap/handshake/client_metadata.ts',
  "  const { KUBERNETES_SERVICE_HOST = '' } = process.env;",
  "  const KUBERNETES_SERVICE_HOST = process.env.KUBERNETES_SERVICE_HOST ?? '';"
);
edit(
  'mongodb/src/cmap/handshake/client_metadata.ts',
  `  const {
    AWS_EXECUTION_ENV = '',
    AWS_LAMBDA_RUNTIME_API = '',
    FUNCTIONS_WORKER_RUNTIME = '',
    K_SERVICE = '',
    FUNCTION_NAME = '',
    VERCEL = '',
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE = '',
    AWS_REGION = '',
    FUNCTION_MEMORY_MB = '',
    FUNCTION_REGION = '',
    FUNCTION_TIMEOUT_SEC = '',
    VERCEL_REGION = ''
  } = process.env;`,
  `  const AWS_EXECUTION_ENV = process.env.AWS_EXECUTION_ENV ?? '';
  const AWS_LAMBDA_RUNTIME_API = process.env.AWS_LAMBDA_RUNTIME_API ?? '';
  const FUNCTIONS_WORKER_RUNTIME = process.env.FUNCTIONS_WORKER_RUNTIME ?? '';
  const K_SERVICE = process.env.K_SERVICE ?? '';
  const FUNCTION_NAME = process.env.FUNCTION_NAME ?? '';
  const VERCEL = process.env.VERCEL ?? '';
  const AWS_LAMBDA_FUNCTION_MEMORY_SIZE = process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE ?? '';
  const AWS_REGION = process.env.AWS_REGION ?? '';
  const FUNCTION_MEMORY_MB = process.env.FUNCTION_MEMORY_MB ?? '';
  const FUNCTION_REGION = process.env.FUNCTION_REGION ?? '';
  const FUNCTION_TIMEOUT_SEC = process.env.FUNCTION_TIMEOUT_SEC ?? '';
  const VERCEL_REGION = process.env.VERCEL_REGION ?? '';`
);
edit(
  'mongodb/src/cmap/handshake/client_metadata.ts',
  `function getRuntimeInfo(): string {
  const endianness = NumberUtils.isBigEndian ? 'BE' : 'LE';
  if ('Deno' in globalThis) {
    const version = typeof Deno?.version?.deno === 'string' ? Deno?.version?.deno : '0.0.0-unknown';

    return \`Deno v\${version}, \${endianness}\`;
  }

  if ('Bun' in globalThis) {
    const version = typeof Bun?.version === 'string' ? Bun?.version : '0.0.0-unknown';

    return \`Bun v\${version}, \${endianness}\`;
  }

  return \`Node.js \${process.version}, \${endianness}\`;
}`,
  `function getRuntimeInfo(): string {
  const endianness = NumberUtils.isBigEndian ? 'BE' : 'LE';
  // TypeNative runs a native binary: report the Node runtime name/version the
  // metadata fields have always used.
  return \`Node.js \${process.version}, \${endianness}\`;
}`
);

// A `PkFactory` is an object literal with a createPk function; model it as a
// property so the literal's func field matches.
edit(
  'mongodb/src/mongo_client.ts',
  `export interface PkFactory {
  createPk(): any;
}`,
  `export interface PkFactory {
  createPk: () => any;
}`
);

// NodeJsBuffer is an intersection type (erased to interface{}): the concrete
// byte-utils methods return plain Uint8Array, which is the Go []byte type.
const nodeByteUtilsFile = path.join(vendor, 'bson/src/utils/node_byte_utils.ts');
let nodeByteUtils = fs.readFileSync(nodeByteUtilsFile, 'utf8');
if (nodeByteUtils.includes('): NodeJsBuffer {')) {
  nodeByteUtils = nodeByteUtils.replaceAll('): NodeJsBuffer {', '): Uint8Array {');
  fs.writeFileSync(nodeByteUtilsFile, nodeByteUtils);
  console.log('patched bson/src/utils/node_byte_utils.ts');
}

// Promise executors use `return reject(err)`; TypeNative's reject is a void
// call, so make the early return explicit.
edit(
  'mongodb/src/cmap/wire_protocol/compression.ts',
  '      if (error) return reject(error);',
  '      if (error) {\n        reject(error);\n        return;\n      }',
  true
);

// Option types are structural in TypeScript (`AggregateOptions extends
// CommandOperationOptions`, `Omit<…>`); Go needs one concrete type at the
// boundary.
edit(
  'mongodb/src/operations/command.ts',
  '  constructor(parent?: OperationParent, options?: CommandOperationOptions) {',
  '  constructor(parent?: OperationParent, options?: any) {'
);
edit(
  'mongodb/src/operations/command.ts',
  `  override buildOptions(timeoutContext: TimeoutContext): ServerCommandOptions {
    const opts: any = this.options;
    return {
      ...opts,
      ...this.bsonOptions,
      timeoutContext,
      readPreference: this.readPreference,
      session: this.session
    };
  }`,
  `  override buildOptions(timeoutContext: TimeoutContext): ServerCommandOptions {
    return Object.assign({}, this.options as any, this.bsonOptions as any, {
      timeoutContext,
      readPreference: this.readPreference,
      session: this.session
    }) as any;
  }`
);
edit(
  'mongodb/src/operations/command.ts',
  `  override buildOptions(timeoutContext: TimeoutContext): ServerCommandOptions {
    return {
      ...this.options,
      ...this.bsonOptions,
      timeoutContext,
      readPreference: this.readPreference,
      session: this.session
    };
  }`,
  `  override buildOptions(timeoutContext: TimeoutContext): ServerCommandOptions {
    return Object.assign({}, this.options as any, this.bsonOptions as any, {
      timeoutContext,
      readPreference: this.readPreference,
      session: this.session
    }) as any;
  }`
);
edit(
  'mongodb/src/operations/command.ts',
  `    const cmdOpts: any = this.options;
    if (
      cmdOpts.collation &&
      typeof cmdOpts.collation === 'object' &&
      !this.hasAspect(Aspect.SKIP_COLLATION)
    ) {
      Object.assign(command, { collation: cmdOpts.collation });
    }

    if (typeof cmdOpts.maxTimeMS === 'number') {
      command.maxTimeMS = cmdOpts.maxTimeMS;
    }

    if (
      cmdOpts.rawData != null &&
      this.hasAspect(Aspect.SUPPORTS_RAW_DATA) &&
      maxWireVersion(connection) >= MIN_SUPPORTED_RAW_DATA_WIRE_VERSION
    ) {
      command.rawData = cmdOpts.rawData;
    }`,
  `    const cmdCollation = (this.options as any)['collation'];
    if (
      cmdCollation &&
      typeof cmdCollation === 'object' &&
      !this.hasAspect(Aspect.SKIP_COLLATION)
    ) {
      Object.assign(command, { collation: cmdCollation });
    }

    const cmdMaxTimeMS = (this.options as any)['maxTimeMS'];
    if (typeof cmdMaxTimeMS === 'number') {
      command.maxTimeMS = cmdMaxTimeMS;
    }

    const cmdRawData = (this.options as any)['rawData'];
    if (
      cmdRawData != null &&
      this.hasAspect(Aspect.SUPPORTS_RAW_DATA) &&
      maxWireVersion(connection) >= MIN_SUPPORTED_RAW_DATA_WIRE_VERSION
    ) {
      command.rawData = cmdRawData;
    }`
);
edit(
  'mongodb/src/operations/command.ts',
  `    if (
      this.options.collation &&
      typeof this.options.collation === 'object' &&
      !this.hasAspect(Aspect.SKIP_COLLATION)
    ) {
      Object.assign(command, { collation: this.options.collation });
    }

    if (typeof this.options.maxTimeMS === 'number') {
      command.maxTimeMS = this.options.maxTimeMS;
    }

    if (
      this.options.rawData != null &&
      this.hasAspect(Aspect.SUPPORTS_RAW_DATA) &&
      maxWireVersion(connection) >= MIN_SUPPORTED_RAW_DATA_WIRE_VERSION
    ) {
      command.rawData = this.options.rawData;
    }`,
  `    const cmdCollation = (this.options as any)['collation'];
    if (
      cmdCollation &&
      typeof cmdCollation === 'object' &&
      !this.hasAspect(Aspect.SKIP_COLLATION)
    ) {
      Object.assign(command, { collation: cmdCollation });
    }

    const cmdMaxTimeMS = (this.options as any)['maxTimeMS'];
    if (typeof cmdMaxTimeMS === 'number') {
      command.maxTimeMS = cmdMaxTimeMS;
    }

    const cmdRawData = (this.options as any)['rawData'];
    if (
      cmdRawData != null &&
      this.hasAspect(Aspect.SUPPORTS_RAW_DATA) &&
      maxWireVersion(connection) >= MIN_SUPPORTED_RAW_DATA_WIRE_VERSION
    ) {
      command.rawData = cmdRawData;
    }`
);
edit(
  'mongodb/src/operations/find_and_modify.ts',
  'Document & FindAndModifyCmdBase',
  'Document',
  true
);
edit(
  'mongodb/src/operations/find_and_modify.ts',
  'function configureFindAndModifyCmdBaseUpdateOpts(\n  cmdBase: FindAndModifyCmdBase,',
  'function configureFindAndModifyCmdBaseUpdateOpts(\n  cmdBase: Document,'
);
edit(
  'mongodb/src/operations/find_and_modify.ts',
  `  override handleOk(response: InstanceType<typeof this.SERVER_COMMAND_RESPONSE_TYPE>): Document {
    const result = super.handleOk(response);
    return this.options.includeResultMetadata ? result : (result.value ?? null);
  }`,
  `  override handleOk(response: InstanceType<typeof this.SERVER_COMMAND_RESPONSE_TYPE>): any {
    const result: any = super.handleOk(response);
    return this.options.includeResultMetadata ? result : (result.value ?? null);
  }`
);
edit(
  'mongodb/src/operations/find_and_modify.ts',
  '      cmdBase.arrayFilters = options.arrayFilters;',
  '      (cmdBase as any).arrayFilters = options.arrayFilters;'
);
edit(
  'mongodb/src/operations/find.ts',
  `    let projection: any = options.projection;
    if (projection && Array.isArray(projection)) {
      projection = projection.length
        ? projection.reduce((result, field) => {
            result[field] = 1;
            return result;
          }, {})
        : { _id: 1 };
    }`,
  `    let projection: any = options.projection;
    if (projection && Array.isArray(projection)) {
      const projArr: any[] = projection;
      if (projArr.length) {
        const projDoc: Document = {};
        for (const field of projArr) {
          projDoc[field] = 1;
        }
        projection = projDoc;
      } else {
        projection = { _id: 1 };
      }
    }`
);
edit(
  'mongodb/src/operations/find.ts',
  `    let projection = options.projection;
    if (projection && Array.isArray(projection)) {
      projection = projection.length
        ? projection.reduce((result, field) => {
            result[field] = 1;
            return result;
          }, {})
        : { _id: 1 };
    }`,
  `    let projection: any = options.projection;
    if (projection && Array.isArray(projection)) {
      const projArr: any[] = projection;
      if (projArr.length) {
        const projDoc: Document = {};
        for (const field of projArr) {
          projDoc[field] = 1;
        }
        projection = projDoc;
      } else {
        projection = { _id: 1 };
      }
    }`
);
edit(
  'mongodb/src/cmap/connection.ts',
  '    const result = await autoEncrypter.decrypt(encryptedResponse.toBytes(), options);',
  '    const result = await autoEncrypter.decrypt((encryptedResponse as any).toBytes(), options);'
);
edit(
  'mongodb/src/cmap/connection.ts',
  '        decorateDecryptionResult(decryptedResponse, encryptedResponse.toObject(), true);',
  '        decorateDecryptionResult(decryptedResponse, (encryptedResponse as any).toObject(), true);'
);
edit(
  'mongodb/src/cmap/connection_pool.ts',
  '      connectionType: Connection,',
  '      connectionType: Connection as any,'
);
edit(
  'mongodb/src/bulk/common.ts',
  `      return (await this.collection.client.withSession({ explicit: false }, async (session): Promise<any> => {
        return await executeCommands(this, { ...finalOptions, session });
      })) as any;`,
  `      return (await this.collection.client.withSession({ explicit: false }, (session) =>
        executeCommands(this, { ...finalOptions, session })
      )) as any;`
);
edit(
  'mongodb/src/connection_string.ts',
  `  const hostAddresses = addresses.map(({ name, port }) => {`,
  `  const hostAddresses: HostAddress[] = (addresses as any[]).map((addr: any) => {
    const { name, port } = addr;`
);
edit(
  'mongodb/src/connection_string.ts',
  `  const keyValuePairs = value.split(',');
  for (const keyValue of keyValuePairs) {
    const [key, value] = keyValue.split(/:(.*)/);
    if (value == null) {
      throw new MongoParseError('Cannot have undefined values in key value pairs');
    }

    yield [key, value];
  }`,
  `  const keyValuePairs = (value ?? '').split(',');
  for (const keyValue of keyValuePairs) {
    const [key, pairValue] = keyValue.split(/:(.*)/);
    if (pairValue == null) {
      throw new MongoParseError('Cannot have undefined values in key value pairs');
    }

    yield [key, pairValue];
  }`
);
edit(
  'mongodb/src/connection_string.ts',
  '  forEach(fn: any): void {\n    this.map.forEach(fn);\n  }',
  '  forEach(fn: (v: any, k: any) => void): void {\n    this.map.forEach(fn);\n  }'
);
edit(
  'mongodb/src/connection_string.ts',
  `    const tlsAndSslOpts = (allProvidedOptions.get('tls') || [])
      .concat(allProvidedOptions.get('ssl') || [])`,
  `    const tlsList: any[] = allProvidedOptions.get('tls') ?? [];
    const sslList: any[] = allProvidedOptions.get('ssl') ?? [];
    const tlsAndSslOpts = tlsList
      .concat(sslList)`
);
edit(
  'mongodb/src/connection_string.ts',
  '      let mechanismProperties: AuthMechanismProperties = {};',
  '      let mechanismProperties: any = {};'
);
edit(
  'mongodb/src/connection_string.ts',
  `  readPreferenceTags: {
    target: 'readPreference',
    transform({
      values,
      options
    }: {
      values: TagSet[];
      options: MongoClientOptions;
    }): ReadPreference {`,
  `  readPreferenceTags: {
    target: 'readPreference',
    transform({
      values,
      options
    }: {
      values: any;
      options: MongoOptions;
    }): ReadPreference {`
);
edit(
  'mongodb/src/operations/search_indexes/create.ts',
  '    return super.handleOk(response).indexesCreated.map((val: { name: string }) => val.name);',
  '    return ((super.handleOk(response) as any).indexesCreated as any[]).map((val: any) => String(val.name));'
);
edit(
  'mongodb/src/operations/create_collection.ts',
  `    const isOptionValid = ([k, v]: [k: string, v: unknown]) =>
      v != null && typeof v !== 'function' && !ILLEGAL_COMMAND_FIELDS.has(k);`,
  `    const isOptionValid = (entry: any) =>
      entry[1] != null && typeof entry[1] !== 'function' && !ILLEGAL_COMMAND_FIELDS.has(entry[0]);`
);
edit(
  'mongodb/src/operations/create_collection.ts',
  `      { session: options.session }`,
  `      { session: options.session } as any`
);
edit(
  'bson/src/decimal128.ts',
  '    value.parts[i] = _rem.div(DIVISOR).low;',
  '    value.parts[i] = Number((_rem.div(DIVISOR) as any).low);'
);
edit(
  'mongodb/src/operations/delete.ts',
  "        ? makeDocumentSequence('deletes', this.statements, this.serializedOperations)",
  "        ? makeDocumentSequence('deletes', this.statements as any, this.serializedOperations)"
);
edit(
  'mongodb/src/operations/update.ts',
  "        ? makeDocumentSequence('updates', this.statements, this.serializedOperations)",
  "        ? makeDocumentSequence('updates', this.statements as any, this.serializedOperations)"
);
edit(
  'mongodb/src/deps.ts',
  '  return value;\n}',
  '  return value as any;\n}'
);
edit(
  'bson/src/parser/deserializer.ts',
  '          let result: Document = completedFrame.holdingDocument;',
  '          let result: any = completedFrame.holdingDocument;'
);
edit(
  'mongodb/src/cmap/wire_protocol/on_demand/document.ts',
  '          this.cache[name] = cachedElement;',
  '          this.cache[String(name)] = cachedElement;'
);
edit(
  'mongodb/src/error.ts',
  "        : e.errors.map(({ message }) => message).join(', ');",
  "        : (e.errors as any[]).map((err: any) => String(err.message)).join(', ');"
);
edit(
  'mongodb/src/operations/execute_operation.ts',
  "import { setTimeout } from 'timers/promises';",
  "import { setTimeout as delayTimeout } from 'timers/promises';"
);
edit(
  'mongodb/src/operations/execute_operation.ts',
  '        await setTimeout(backoffMS);',
  '        await delayTimeout(backoffMS);'
);
edit(
  'mongodb/src/operations/execute_operation.ts',
  `        throw new MongoServerError({
          message: MMAPv1_RETRY_WRITES_ERROR_MESSAGE,
          errmsg: MMAPv1_RETRY_WRITES_ERROR_MESSAGE,
          originalError: operationError
        });`,
  `        throw new MongoServerError({
          message: MMAPv1_RETRY_WRITES_ERROR_MESSAGE,
          errmsg: MMAPv1_RETRY_WRITES_ERROR_MESSAGE,
          originalError: operationError
        } as any);`
);
edit(
  'mongodb/src/sessions.ts',
  "import { setTimeout } from 'timers/promises';",
  "import { setTimeout as delayTimeout } from 'timers/promises';"
);
edit(
  'mongodb/src/sessions.ts',
  '            await setTimeout(backoffMS);',
  '            await delayTimeout(backoffMS);'
);
edit(
  'bson/src/extended_json.ts',
  '    if (c) return c.fromExtendedJSON(value, options);',
  '    if (c) return (c as any).fromExtendedJSON(value, options);'
);
edit(
  'bson/src/extended_json.ts',
  '      else if (Long.isLong(d)) date.setTime(d.toNumber());',
  '      else if (Long.isLong(d)) date.setTime(Number(d.toNumber()));'
);
edit(
  'bson/src/extended_json.ts',
  '  Timestamp: (o: Timestamp) => Timestamp.fromBits(o.low, o.high)',
  '  Timestamp: (o: Timestamp) => new Timestamp({ t: o.high >>> 0, i: o.low >>> 0 })'
);
edit(
  'mongodb/src/mongo_client.ts',
  '  tlsCertificateKeyFile?: string;\n  ca?: any;\n  crl?: any;\n  key?: any;\n  cert?: any;',
  '  tlsCertificateKeyFile?: string;'
);
edit(
  'mongodb/src/mongo_client.ts',
  '  tlsCertificateKeyFile?: string;\n  /**\n   * # NOTE ABOUT TLS Options',
  '  tlsCertificateKeyFile?: string;\n  ca?: any;\n  crl?: any;\n  key?: any;\n  cert?: any;\n  /**\n   * # NOTE ABOUT TLS Options'
);
edit(
  'mongodb/src/mongo_client.ts',
  '  userSpecifiedReplicaSet: boolean;',
  '  userSpecifiedReplicaSet: boolean;\n  ca?: any;\n  crl?: any;\n  key?: any;\n  cert?: any;'
);
edit(
  'mongodb/src/mongo_client.ts',
  `    this.options.metadata = makeClientMetadata(this.driverInfoList, this.options)
      .then(undefined, squashError)
      .then(result => result ?? ({} as ClientMetadata)); // ensure Promise<Document>`,
  `    this.options.metadata = (async (): Promise<ClientMetadata> => {
      try {
        const meta = await makeClientMetadata(this.driverInfoList, this.options);
        if (meta) return meta;
        return {} as ClientMetadata;
      } catch {
        return {} as ClientMetadata;
      }
    })();`
);
edit(
  'mongodb/src/mongo_client.ts',
  `    return await new ClientBulkWriteExecutor(
      this,
      models as any,
      resolveOptions(this, options)
    ).execute();`,
  `    return (await new ClientBulkWriteExecutor(
      this,
      models as any,
      resolveOptions(this, options)
    ).execute()) as any;`
);
edit(
  'mongodb/src/mongo_client.ts',
  `      for (const [index, host] of hosts.entries()) {
        options.hosts[index] = host;
      }`,
  `      for (let index = 0; index < hosts.length; index++) {
        options.hosts[index] = hosts[index];
      }`
);
edit(
  'mongodb/src/mongo_client.ts',
  `    const activeCursorCloses = Array.from(this.s.activeCursors, cursor => cursor.close());`,
  `    const activeCursorCloses: any[] = Array.from(this.s.activeCursors, cursor => cursor.close());`
);
edit(
  'mongodb/src/mongo_client.ts',
  `    const activeSessionEnds = Array.from(this.s.activeSessions, session => session.endSession());`,
  `    const activeSessionEnds: any[] = Array.from(this.s.activeSessions, session => session.endSession());`
);
edit(
  'mongodb/src/mongo_logger.ts',
  `export function createStdioLogger(stream: {
  write: NodeJS.WriteStream['write'];
}): MongoDBLogWritable {`,
  `export function createStdioLogger(stream: any): MongoDBLogWritable {`
);
edit(
  'mongodb/src/mongo_logger.ts',
  `      log.previousDescription = log.reply = stringifyWithMaxLen(
        logObject.previousDescription,
        maxDocumentLength
      );
      log.newDescription = log.reply = stringifyWithMaxLen(
        logObject.newDescription,
        maxDocumentLength
      );`,
  `      const prevDesc = stringifyWithMaxLen(logObject.previousDescription, maxDocumentLength);
      log.previousDescription = prevDesc;
      log.reply = prevDesc;
      const newDesc = stringifyWithMaxLen(logObject.newDescription, maxDocumentLength);
      log.newDescription = newDesc;
      log.reply = newDesc;`
);
edit(
  'mongodb/src/mongo_logger.ts',
  `  createLoggingSeverities(): Record<MongoLoggableComponent, Record<SeverityLevel, boolean>> {
    const severities = Object();
    for (const component of Object.values(MongoLoggableComponent)) {
      severities[component] = {};
      for (const severityLevel of Object.values(SeverityLevel)) {
        severities[component][severityLevel] =
          compareSeverity(severityLevel, this.componentSeverities[component]) <= 0;
      }
    }
    return severities;
  }`,
  `  createLoggingSeverities(): Record<MongoLoggableComponent, Record<SeverityLevel, boolean>> {
    const severities: Record<string, Record<string, boolean>> = {};
    for (const component of Object.values(MongoLoggableComponent)) {
      const compMap: Record<string, boolean> = {};
      for (const severityLevel of Object.values(SeverityLevel)) {
        compMap[severityLevel] =
          compareSeverity(severityLevel, this.componentSeverities[component]) <= 0;
      }
      severities[component] = compMap;
    }
    return severities as any;
  }`
);
edit(
  'bson/src/parser/on_demand/parse_to_elements.ts',
  `export function parseToElements(
  bytes: Uint8Array,
  startOffset: number | null = 0
): Iterable<BSONElement> {
  startOffset ??= 0;`,
  `export function parseToElements(
  bytes: Uint8Array,
  startOffsetArg: number | null = 0
): Iterable<BSONElement> {
  const startOffset: number = startOffsetArg ?? 0;`
);
edit(
  'mongodb/src/read_preference.ts',
  '      options = tags;',
  '      options = tags as any;'
);
edit(
  'mongodb/src/operations/rename.ts',
  '  override handleOk(_response: InstanceType<typeof this.SERVER_COMMAND_RESPONSE_TYPE>): Document {',
  '  override handleOk(_response: InstanceType<typeof this.SERVER_COMMAND_RESPONSE_TYPE>): any {'
);
edit(
  'mongodb/src/cmap/wire_protocol/responses.ts',
  '    const isError = isErrorResponse(bson, elements);',
  '    const isError = isErrorResponse(bson, elements as any);'
);
edit(
  'mongodb/src/operations/client_bulk_write/results_merger.ts',
  '        this.incrementCounts(response);',
  '        this.incrementCounts(response as any);'
);
edit(
  'bson/src/parser/serializer.ts',
  '  mapIterator: IterableIterator<[unknown, unknown]> | null;',
  '  mapIterator: any[] | null;'
);
edit(
  'bson/src/parser/serializer.ts',
  '      mapIterator: (sourceObject as Map<unknown, unknown>).entries(),',
  '      mapIterator: Array.from((sourceObject as Map<unknown, unknown>).entries()),'
);
edit(
  'bson/src/parser/serializer.ts',
  `    if (frame.mapIterator !== null) {
      const next = frame.mapIterator.next();
      if (next.done) {
        buffer[index++] = 0x00;
        NumberUtils.setInt32LE(buffer, frame.objectSizeIndex, index - frame.objectSizeIndex);
        if (frame.codeSizeIndex !== null) {
          NumberUtils.setInt32LE(buffer, frame.codeSizeIndex, index - frame.codeSizeIndex);
        }
        path.delete(frame.sourceObject);
        currentFrame = frame.prev;
        continue;
      }
      key = next.value[0] as string;
      value = next.value[1];`,
  `    if (frame.mapIterator !== null) {
      if (frame.keyIndex >= frame.mapIterator.length) {
        buffer[index++] = 0x00;
        NumberUtils.setInt32LE(buffer, frame.objectSizeIndex, index - frame.objectSizeIndex);
        if (frame.codeSizeIndex !== null) {
          NumberUtils.setInt32LE(buffer, frame.codeSizeIndex, index - frame.codeSizeIndex);
        }
        path.delete(frame.sourceObject);
        currentFrame = frame.prev;
        continue;
      }
      const pair = frame.mapIterator[frame.keyIndex++];
      key = pair[0] as string;
      value = pair[1];`
);
edit(
  'bson/src/parser/serializer.ts',
  '      const arr = frame.iterTarget as unknown[];',
  '      const arr: any = frame.iterTarget;'
);
edit(
  'mongodb/src/sdam/server.ts',
  '          void reauthPromise.then(checkBackIn, checkBackIn);',
  '          void reauthPromise.then(() => checkBackIn(), () => checkBackIn());'
);
edit(
  'bson/src/timestamp.ts',
  '      ? doc.$timestamp.i.getLowBitsUnsigned()',
  '      ? (doc.$timestamp.i as any).getLowBitsUnsigned()'
);
edit(
  'bson/src/timestamp.ts',
  '      ? doc.$timestamp.t.getLowBitsUnsigned()',
  '      ? (doc.$timestamp.t as any).getLowBitsUnsigned()'
);
edit(
  'mongodb/src/sdam/topology.ts',
  '  srvHost?: string;',
  '  srvHost?: string;\n  credentials?: MongoCredentials;'
);
edit(
  'mongodb/src/sdam/topology.ts',
  '    const listeningToSrvPolling = !!srvListeners?.includes(this.s.detectSrvRecords);',
  '    const listeningToSrvPolling = Array.isArray(srvListeners) && srvListeners.some((fn: any) => fn === this.s.detectSrvRecords);'
);
edit(
  'mongodb/src/sdam/topology.ts',
  "    if (typeof credentials === 'function') ((callback = credentials), (credentials = undefined));",
  "    if (typeof credentials === 'function') { callback = credentials as any; credentials = undefined; }"
);
edit(
  'mongodb/src/sdam/topology_description.ts',
  '  const responseAddresses = serverDescription.allHosts;',
  '  const responseAddresses: string[] = [...serverDescription.allHosts];'
);
edit(
  'mongodb/src/utils.ts',
  `export function mergeOptions<T, S>(target: T, source: S): T & S {
  return { ...target, ...source };
}`,
  `export function mergeOptions<T, S>(target: T, source: S): any {
  return Object.assign({}, target as any, source as any);
}`
);
edit(
  'mongodb/src/utils.ts',
  '    return super.fromString(namespace) as MongoDBCollectionNamespace;',
  '    return MongoDBNamespace.fromString(namespace) as MongoDBCollectionNamespace;'
);
edit(
  'mongodb/src/utils.ts',
  `    if (typeof port === 'number') {
      this.port = port;
    } else if (typeof port === 'string' && port !== '') {
      this.port = Number.parseInt(port, 10);
    } else {
      this.port = 27017;
    }`,
  `    const portVal: any = port;
    if (typeof portVal === 'number') {
      this.port = portVal;
    } else if (typeof portVal === 'string' && portVal !== '') {
      this.port = Number.parseInt(portVal, 10);
    } else {
      this.port = 27017;
    }`
);
edit(
  'mongodb/src/utils.ts',
  '  return process.emitWarning(message, { code: MONGODB_WARNING_CODE } as any);',
  '  return process.emitWarning(message, MONGODB_WARNING_CODE);'
);
edit(
  'mongodb/src/utils.ts',
  '          resolve({ status: response.statusCode, body });',
  '          resolve({ status: response.statusCode, body } as any);'
);
edit(
  'mongodb/src/utils.ts',
  `  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>(function withResolversExecutor(promiseResolve, promiseReject) {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject } as const;`,
  `  return Promise.withResolvers<T>() as any;`
);
edit(
  'mongodb/src/utils.ts',
  `export function decorateDecryptionResult(
  decrypted: Document,
  original: Document | Uint8Array,
  isTopLevelDecorateCall = true
): void {`,
  `export function decorateDecryptionResult(
  decrypted: any,
  original: any,
  isTopLevelDecorateCall = true
): void {`
);
edit(
  'mongodb/src/utils.ts',
  `      if (!decrypted[kDecoratedKeys]) {
        Object.defineProperty(decrypted, kDecoratedKeys, {
          value: [],
          configurable: true,
          enumerable: false,
          writable: false
        });
      }
      // this is defined in the preceding if-statement
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      decrypted[kDecoratedKeys]!.push(k);`,
  `      const decKey: any = kDecoratedKeys;
      if (!decrypted[decKey]) {
        Object.defineProperty(decrypted, decKey, {
          value: [],
          configurable: true,
          enumerable: false,
          writable: false
        });
      }
      decrypted[decKey].push(k);`
);
edit(
  'bson/src/parser/utils.ts',
  `const TypedArrayPrototypeGetSymbolToStringTag = (() => {
  // Type check system lovingly referenced from:
  // https://github.com/nodejs/node/blob/7450332339ed40481f470df2a3014e2ec355d8d8/lib/internal/util/types.js#L13-L15
  // eslint-disable-next-line @typescript-eslint/unbound-method -- the intention is to call this method with a bound value
  const g = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(Uint8Array.prototype),
    Symbol.toStringTag
  )!.get!;

  return (value: unknown) => g.call(value);
})();

export function isUint8Array(value: unknown): value is Uint8Array {
  return TypedArrayPrototypeGetSymbolToStringTag(value) === 'Uint8Array';
}`,
  `export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}`
);
edit(
  'mongodb/src/operations/aggregate.ts',
  '      this.pipeline = this.pipeline.concat({ $out: options.out });',
  '      this.pipeline = this.pipeline.concat({ $out: options.out } as Document);'
);

// Two binary.ts spots: a union return type picks the legacy shape for the
// whole function, and a Uint8Array bitwise write lowers to float64.
edit(
  'bson/src/binary.ts',
  '  toExtendedJSON(options?: EJSONOptions): BinaryExtendedLegacy | BinaryExtended {',
  '  toExtendedJSON(options?: EJSONOptions): any {'
);
edit(
  'bson/src/binary.ts',
  '      bytes[byteOffset + 2] |= bit << shift;',
  '      bytes[byteOffset + 2] = bytes[byteOffset + 2] + Math.pow(2, shift);'
);
edit(
  'bson/src/utils/node_byte_utils.ts',
  'function nodejsMathRandomBytes(byteLength: number): NodeJsBuffer {',
  'function nodejsMathRandomBytes(byteLength: number): Uint8Array {'
);
edit(
  'bson/src/utils/node_byte_utils.ts',
  'function nodejsSecureRandomBytes(byteLength: number): NodeJsBuffer {',
  'function nodejsSecureRandomBytes(byteLength: number): Uint8Array {'
);
edit(
  'bson/src/utils/node_byte_utils.ts',
  '  randomBytes: nodejsRandomBytes,',
  `  randomBytes(byteLength: number): Uint8Array {
    return nodejsRandomBytes(byteLength);
  },`
);
edit(
  'bson/src/bson_value.ts',
  '    return this.inspect(depth, options, inspect);',
  '    return this.inspect(0, options, inspect);'
);
edit(
  'bson/src/bson_value.ts',
  '    return this.inspect(depth ?? 0, options, inspect);',
  '    return this.inspect(0, options, inspect);'
);

// Remaining core-path shape fixes.
edit(
  'mongodb/src/bson.ts',
  "export function parseToElementsToArray(bytes: Uint8Array, offset?: number): BSONElement[] {\n  const res = BSON.onDemand.parseToElements(bytes, offset);",
  "export function parseToElementsToArray(bytes: Uint8Array, offset?: number): any[] {\n  const res: any = BSON.onDemand.parseToElements(bytes, offset);"
);
edit(
  'bson/src/parser/calculate_size.ts',
  '      const array = target as unknown[];',
  '      const array: any = target;'
);
edit(
  'mongodb/src/cmap/handshake/client_metadata.ts',
  `  toObject(): Document {
    return BSON.deserialize(BSON.serialize(this.document), {
      promoteLongs: false,
      promoteBuffers: false,
      promoteValues: false,
      useBigInt64: false
    });
  }`,
  `  toObject(): Document {
    const bytes = BSON.serialize(this.document);
    return BSON.deserialize(bytes, {
      promoteLongs: false,
      promoteBuffers: false,
      promoteValues: false,
      useBigInt64: false
    });
  }`
);
edit(
  'mongodb/src/collection.ts',
  '    const { ...opts } = options;',
  '    const opts: any = { ...options };'
);
edit(
  'mongodb/src/collection.ts',
  '    const { capped } = await this.options(options);\n    return Boolean(capped);',
  '    const { capped } = (await this.options(options)) as any;\n    return Boolean(capped);'
);
edit(
  'mongodb/src/bulk/common.ts',
  '      this.message = error.message;\n      this.code = error.code;',
  '      this.message = String(error.message);\n      this.code = Number(error.code);'
);
edit(
  'mongodb/src/cmap/connect.ts',
  'result.servername == null && result.host && !net.isIP(result.host)',
  'result.servername == null && result.host && !net.isIP(String(result.host))'
);
edit(
  'mongodb/src/cmap/connect.ts',
  '    if (typeof tlsSocket.disableRenegotiation === \'function\') {\n      tlsSocket.disableRenegotiation();\n    }',
  `    const disableRenegotiation = (tlsSocket as any).disableRenegotiation;
    if (typeof disableRenegotiation === 'function') {
      disableRenegotiation.call(tlsSocket);
    }`
);

// Final 18 type-boundary patches to complete a clean Go build.
edit(
  'mongodb/src/bulk/common.ts',
  `      return (await this.collection.client.withSession({ explicit: false }, (session) =>
        executeCommands(this, { ...finalOptions, session })
      )) as any;`,
  `      return (await this.collection.client.withSession({ explicit: false }, (session): Promise<any> =>
        executeCommands(this, { ...finalOptions, session }).then((r): any => r)
      )) as any;`
);
edit(
  'mongodb/src/connection_string.ts',
  '      let mechanismProperties = Object.create(null);',
  '      let mechanismProperties: any = undefined;\n      mechanismProperties = Object.create(null);'
);
edit(
  'mongodb/src/connection_string.ts',
  `  readPreferenceTags: {
    target: 'readPreference',
    transform({
      values,
      options
    }: {
      values: Array<string | Record<string, string>[]>;
      options: MongoClientOptions;
    }) {`,
  `  readPreferenceTags: {
    target: 'readPreference',
    transform({
      values,
      options
    }: {
      values: any;
      options: MongoOptions;
    }) {`
);
edit(
  'mongodb/src/cmap/commands.ts',
  `export function makeDocumentSequence(
  field: string,
  documents: Document[],
  serialized: Uint8Array[]
): DocumentSequence {`,
  `export function makeDocumentSequence(
  field: string,
  documents: any,
  serialized: Uint8Array[]
): DocumentSequence {`
);
edit(
  'mongodb/src/deps.ts',
  `    const value = require('socks');
    return value;`,
  `    const value = require('socks');
    return value as any;`
);
edit(
  'mongodb/src/deps.ts',
  'export function getSocks(): SocksLib | { kModuleError: MongoMissingDependencyError } {',
  'export function getSocks(): any {'
);
edit(
  'bson/src/parser/deserializer.ts',
  '          let result: any = completedFrame.holdingDocument;',
  '          let result: any = undefined;\n          result = completedFrame.holdingDocument;'
);
edit(
  'mongodb/src/operations/find.ts',
  `      const projArr: any[] = projection;`,
  `      const projArr: any = projection;`
);
edit(
  'mongodb/src/mongo_client.ts',
  `    let metaBase: any = undefined;
    metaBase = makeClientMetadata(this.driverInfoList, this.options).then(undefined, squashError);
    this.options.metadata = metaBase.then((result: any) => result ?? ({} as ClientMetadata)); // ensure Promise<Document>`,
  `    this.options.metadata = (async (): Promise<ClientMetadata> => {
      try {
        const meta = await makeClientMetadata(this.driverInfoList, this.options);
        if (meta) return meta;
        return {} as ClientMetadata;
      } catch {
        return {} as ClientMetadata;
      }
    })();`
);
edit(
  'mongodb/src/operations/client_bulk_write/executor.ts',
  `  constructor(
    client: MongoClient,
    operations: ReadonlyArray<AnyClientBulkWriteModel<Document>>,
    options?: ClientBulkWriteOptions
  ) {`,
  `  constructor(
    client: MongoClient,
    operations: any,
    options?: ClientBulkWriteOptions
  ) {`
);
edit(
  'mongodb/src/mongo_client.ts',
  `    const activeCursorCloses: any[] = Array.from(this.s.activeCursors, cursor => cursor.close());`,
  `    const activeCursorCloses = Array.from(this.s.activeCursors, (cursor): any => cursor.close());`
);
edit(
  'mongodb/src/mongo_client.ts',
  `    const activeSessionEnds: any[] = Array.from(this.s.activeSessions, session => session.endSession());`,
  `    const activeSessionEnds = Array.from(this.s.activeSessions, (session): any => session.endSession());`
);
edit(
  'bson/src/parser/on_demand/parse_to_elements.ts',
  `export function parseToElements(
  bytes: Uint8Array,
  startOffsetArg: number | null = 0
): Iterable<BSONElement> {`,
  `export function parseToElements(
  bytes: Uint8Array,
  startOffsetArg: number = 0
): Iterable<BSONElement> {`
);
edit(
  'bson/src/parser/serializer.ts',
  '  iterTarget: Document;',
  '  iterTarget: any;'
);
edit(
  'mongodb/src/sessions.ts',
  '          await setTimeout(backoffMS);',
  '          await delayTimeout(backoffMS);'
);
edit(
  'mongodb/src/sdam/topology.ts',
  '    const listeningToSrvPolling = Array.isArray(srvListeners) && srvListeners.some((fn: any) => fn === this.s.detectSrvRecords);',
  `    let listeningToSrvPolling = false;
    if (Array.isArray(srvListeners)) {
      const list: any[] = srvListeners as any[];
      for (let i = 0; i < list.length; i++) {
        if (list[i] === this.s.detectSrvRecords) {
          listeningToSrvPolling = true;
          break;
        }
      }
    }`
);
edit(
  'mongodb/src/utils.ts',
  '          resolve({ status: response.statusCode, body } as any);',
  '          const httpRes: { status?: number; body: string } = { status: response.statusCode, body };\n          resolve(httpRes);'
);
edit(
  'mongodb/src/utils.ts',
  `export function decorateDecryptionResult(
  decrypted: Document & { [kDecoratedKeys]?: Array<string> },
  original: Document,
  isTopLevelDecorateCall = true
): void {`,
  `export function decorateDecryptionResult(
  decrypted: any,
  original: any,
  isTopLevelDecorateCall = true
): void {`
);
edit(
  'mongodb/src/utils.ts',
  '      const decKey: any = kDecoratedKeys;',
  '      const decKey: string = String(kDecoratedKeys);'
);

edit(
  'mongodb/src/connection_string.ts',
  `  readPreferenceTags: {
    target: 'readPreference',
    transform({
      values,
      options
    }: {
      values: any;
      options: MongoOptions;
    }) {`,
  `  readPreferenceTags: {
    target: 'readPreference',
    transform({ values, options }) {`
);
edit(
  'mongodb/src/operations/find.ts',
  `    let projection: any = options.projection;
    if (projection && Array.isArray(projection)) {
      const projArr: any = projection;
      if (projArr.length) {
        const projDoc: Document = {};
        for (const field of projArr) {
          projDoc[field] = 1;
        }
        projection = projDoc;
      } else {
        projection = { _id: 1 };
      }
    }`,
  `    let projection: any = undefined;
    projection = options.projection;
    if (projection && Array.isArray(projection)) {
      const projLen: number = projection.length;
      if (projLen) {
        const projDoc: Document = {};
        for (let i = 0; i < projLen; i++) {
          projDoc[String(projection[i])] = 1;
        }
        projection = projDoc;
      } else {
        projection = { _id: 1 };
      }
    }`
);
edit(
  'mongodb/src/sdam/topology.ts',
  `    if (Array.isArray(srvListeners)) {
      const list: any[] = srvListeners as any[];
      for (let i = 0; i < list.length; i++) {
        if (list[i] === this.s.detectSrvRecords) {
          listeningToSrvPolling = true;
          break;
        }
      }
    }`,
  `    if (Array.isArray(srvListeners)) {
      const listLen: number = (srvListeners as any).length;
      for (let i = 0; i < listLen; i++) {
        if ((srvListeners as any)[i] === this.s.detectSrvRecords) {
          listeningToSrvPolling = true;
          break;
        }
      }
    }`
);
edit(
  'mongodb/src/utils.ts',
  '          const httpRes: { status?: number; body: string } = { status: response.statusCode, body };\n          resolve(httpRes);',
  '          const httpStatus: number | undefined = response.statusCode;\n          resolve({ body, status: httpStatus });'
);
edit(
  'mongodb/src/utils.ts',
  '): Promise<{ body: string; status: number | undefined }> {',
  '): Promise<{ body: string; status: number }> {'
);
edit(
  'mongodb/src/utils.ts',
  '          const httpStatus: number | undefined = response.statusCode;\n          resolve({ body, status: httpStatus });',
  '          resolve({ body, status: response.statusCode ?? 0 });'
);

edit(
  'mongodb/src/utils.ts',
  `  const ctor = (value as any).constructor;
  if (ctor && ctor.prototype) {
    if (!isObject(ctor.prototype)) {
      return false;
    }

    // Check to see if some method exists from the Object exists
    if (!HAS_OWN(ctor.prototype, 'isPrototypeOf')) {
      return false;
    }
  }`,
  `  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof Error ||
    Array.isArray(value) ||
    ArrayBuffer.isView(value)
  ) {
    return false;
  }`
);

edit(
  'mongodb/src/operations/drop.ts',
  "import { type Connection, type MongoError, MongoServerError } from '..';",
  "import { type Connection } from '../cmap/connection';\nimport { type MongoError, MongoServerError } from '../error';"
);

edit(
  'mongodb/src/operations/client_bulk_write/results_merger.ts',
  "import { MongoWriteConcernError } from '../..';",
  "import { MongoWriteConcernError } from '../../error';"
);

edit(
  'bson/src/parser/serializer.ts',
  '  sourceObject: Document;',
  '  sourceObject: any;'
);
edit(
  'bson/src/parser/serializer.ts',
  'function makeFrame(\n  sourceObject: Document,',
  'function makeFrame(\n  sourceObject: any,'
);
edit(
  'bson/src/parser/calculate_size.ts',
  '  object: Document;',
  '  object: any;'
);
edit(
  'bson/src/parser/calculate_size.ts',
  'export function internalCalculateObjectSize(\n  object: Document,',
  'export function internalCalculateObjectSize(\n  object: any,'
);
edit(
  'bson/src/parse_utf8.ts',
  `type TextDecoder = {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
  decode(input?: Uint8Array): string;
};
type TextDecoderConstructor = {
  new (label: 'utf8', options: { fatal: boolean; ignoreBOM?: boolean }): TextDecoder;
};

// parse utf8 globals
declare const TextDecoder: TextDecoderConstructor;`,
  `// (TypeNative: use the platform TextDecoder directly)`
);

// `defineAspects(OperationClass, …)` receives a class value. TypeNative models
// a class value as *TnClass, so keep the parameter dynamic.
edit(
  'mongodb/src/operations/operation.ts',
  `export function defineAspects(
  operation: { aspects?: Set<symbol> },`,
  `export function defineAspects(
  operation: any,`
);

// Optional modules that are only referenced through types: a minimal module
// keeps them out of the binary without changing the core paths.
function replaceFile(rel, content) {
  const full = path.join(vendor, rel);
  if (fs.readFileSync(full, 'utf8') !== content) {
    fs.writeFileSync(full, content);
    console.log(`replaced ${rel}`);
  }
}

replaceFile(
  'mongodb/src/client-side-encryption/auto_encrypter.ts',
  `// Type-only surface used by MongoClient's options. Client-side encryption is
// not part of this example; importing the real module pulls in optional native
// dependencies and a second KMS client.
export interface AutoEncryptionOptions {
  [key: string]: any;
}
export type AutoEncrypter = any;
export const AutoEncryptionLoggerLevel = Object.freeze({
  Fatal: 0,
  Error: 1,
  Warning: 2,
  Info: 3,
  Trace: 4
} as const);
`
);
replaceFile(
  'mongodb/src/encrypter.ts',
  `// Stub for MongoClient's optional client-side encryption (see auto_encrypter.ts).
export class Encrypter {
  autoEncrypter: any = undefined;
  constructor(_client?: any, _uri?: any, _options?: any) {
    throw new Error('Client-side encryption is not included in this example build');
  }
  static checkForMongoCrypt(): void {
    throw new Error('Client-side encryption is not included in this example build');
  }
  async connectInternalClient(): Promise<void> {}
  async close(_client?: any, _force?: boolean): Promise<void> {}
}
`
);
replaceFile(
  'mongodb/src/cmap/auth/mongodb_oidc.ts',
  `// OIDC authentication is not part of this example. Only the types that
// MongoClient's credentials reference remain.
export type OIDCCallbackFunction = (params: any) => Promise<any>;
export type OIDCCallbackParams = any;
export type IdPInfo = any;
export type Workflow = any;
export const OIDC_WORKFLOWS = new Map<string, () => any>();
export class MongoDBOIDC {
  [key: string]: any;
  constructor(..._args: any[]) {}
}
`
);
replaceFile(
  'mongodb/src/cmap/auth/aws_temporary_credentials.ts',
  `// AWS authentication is not part of this example.
export type AWSCredentialProvider = any;
export class AWSTemporaryCredentialProvider {
  [key: string]: any;
}
`
);
// Only DEFAULT/PLAIN/SCRAM authentication: GSSAPI, AWS, OIDC and X509 pull in
// optional modules this example does not ship.
const authProvidersFile = path.join(vendor, 'mongodb/src/mongo_client_auth_providers.ts');
const minimalAuthProviders = `import { type AuthProvider } from './cmap/auth/auth_provider';
import { type AuthMechanismProperties } from './cmap/auth/mongo_credentials';
import { Plain } from './cmap/auth/plain';
import { AuthMechanism } from './cmap/auth/providers';
import { ScramSHA1, ScramSHA256 } from './cmap/auth/scram';
import { MongoInvalidArgumentError } from './error';

/** @internal */
const AUTH_PROVIDERS = new Map<
  AuthMechanism | string,
  (authMechanismProperties: AuthMechanismProperties) => AuthProvider
>([
  [AuthMechanism.MONGODB_PLAIN, (_props: AuthMechanismProperties): AuthProvider => new Plain()],
  [AuthMechanism.MONGODB_SCRAM_SHA1, (_props: AuthMechanismProperties): AuthProvider => new ScramSHA1()],
  [AuthMechanism.MONGODB_SCRAM_SHA256, (_props: AuthMechanismProperties): AuthProvider => new ScramSHA256()]
]);

/**
 * Create a set of providers per client
 * to avoid sharing the provider's cache between different clients.
 * @internal
 */
export class MongoClientAuthProviders {
  private existingProviders: Map<AuthMechanism | string, AuthProvider> = new Map();

  getOrCreateProvider(
    name: AuthMechanism | string,
    authMechanismProperties: AuthMechanismProperties
  ): AuthProvider {
    const authProvider = this.existingProviders.get(name);
    if (authProvider) {
      return authProvider;
    }

    const providerFunction = AUTH_PROVIDERS.get(name);
    if (!providerFunction) {
      throw new MongoInvalidArgumentError(\`authMechanism \${name} not supported\`);
    }

    const provider = providerFunction(authMechanismProperties);
    this.existingProviders.set(name, provider);
    return provider;
  }
}
`;
if (fs.readFileSync(authProvidersFile, 'utf8') !== minimalAuthProviders) {
  fs.writeFileSync(authProvidersFile, minimalAuthProviders);
  console.log('patched mongodb/src/mongo_client_auth_providers.ts');
}

// Labeled loops with `continue label` inside a lowered catch block: Go cannot
// jump across the generated function boundary. Rewrite withretry flags that
// the catch sets and the loop acts on after the try/catch. Same control flow.
const sessionsFile = path.join(vendor, 'mongodb/src/sessions.ts');
let sessions = fs.readFileSync(sessionsFile, 'utf8');
if (sessions.includes('retryTransaction: for (')) {
  const replace = (from, to, all = false) => {
    if (!sessions.includes(from)) throw new Error(`sessions patch target not found: ${from.slice(0, 60)}`);
    sessions = all ? sessions.split(from).join(to) : sessions.replace(from, to);
  };
  replace('      retryTransaction: for (', '      for (');
  replace('        retryCommit: while (!committed) {', '        while (!committed) {');
  replace(
    '        this.startTransaction(options);\n\n        try {',
    '        this.startTransaction(options);\n\n        let retryTransaction = false;\n        let retryCommit = false;\n\n        try {'
  );
  replace(
    '            continue retryTransaction;\n          }\n\n          // 7.3',
    '            retryTransaction = true;\n          }\n\n          // 7.3'
  );
  replace(
    '          throw fnError;\n        }\n\n        while (!committed) {',
    '          if (!retryTransaction) {\n            throw fnError;\n          }\n        }\n\n        if (retryTransaction) {\n          continue;\n        }\n\n        while (!committed) {\n          retryCommit = false;'
  );
  replace('              continue retryCommit;\n            }', '              retryCommit = true;\n            }');
  replace(
    '              continue retryTransaction;\n            }',
    '              retryTransaction = true;\n            }'
  );
  replace(
    '            throw commitError;\n          }\n        }\n      }',
    '            if (!retryCommit && !retryTransaction) {\n              throw commitError;\n            }\n          }\n          if (retryCommit) {\n            continue;\n          }\n          if (retryTransaction) {\n            break;\n          }\n        }\n        if (retryTransaction) {\n          continue;\n        }\n      }'
  );
  fs.writeFileSync(sessionsFile, sessions);
  console.log('patched mongodb/src/sessions.ts');
} else {
  console.log('already applied mongodb/src/sessions.ts');
}

// Dynamic `await import('os')` inside an async function expression is not
// statically lowered by TypeNative; import `os` statically and expose the
// four OsAdapter methods directly.
edit(
  'mongodb/src/runtime_adapters.ts',
  `import type * as os from 'os';`,
  `import * as os from 'os';`
);
edit(
  'mongodb/src/runtime_adapters.ts',
  `export async function resolveRuntimeAdapters(options: MongoClientOptions): Promise<Runtime> {
  return {
    os: options.runtimeAdapters?.os ?? (await import('os'))
  };
}`,
  `export async function resolveRuntimeAdapters(options: MongoClientOptions): Promise<Runtime> {
  return {
    os: options.runtimeAdapters?.os ?? {
      release: () => os.release(),
      platform: () => os.platform(),
      arch: () => os.arch(),
      type: () => os.type()
    }
  };
}`
);

// `makeStateMachine` structurally accepts class instances (Topology, Server,
// Monitor) and mutates `target.s.state` while calling `target.emit(...)`.
// Using `any` avoids copying into an `ObjectWithState` value struct (which
// would detach `s` and drop class methods like `emit`).
edit(
  'mongodb/src/utils.ts',
  `interface StateTransitionFunction {
  (target: ObjectWithState, newState: string): void;
}`,
  `interface StateTransitionFunction {
  (target: any, newState: string): void;
}`
);
edit(
  'mongodb/src/utils.ts',
  `export function makeStateMachine(stateTable: StateTable): StateTransitionFunction {
  return function stateTransition(target, newState) {`,
  `export function makeStateMachine(stateTable: StateTable): StateTransitionFunction {
  return function stateTransition(target: any, newState: string) {`
);

// Object-literal getters inside a typed struct literal (`this.s: MongoClientPrivate`)
// are omitted from struct field initialization in TypeNative; assign the already-parsed
// option fields directly instead.
edit(
  'mongodb/src/mongo_client.ts',
  `      get options() {
        return client.options;
      },
      get readConcern() {
        return client.options.readConcern;
      },
      get writeConcern() {
        return client.options.writeConcern;
      },
      get readPreference() {
        return client.options.readPreference;
      },
      get isMongoClient(): true {
        return true;
      }`,
  `      options: client.options,
      readConcern: client.options.readConcern,
      writeConcern: client.options.writeConcern,
      readPreference: client.options.readPreference,
      isMongoClient: true`
);

// Cycle-tracking `path` sets store both plain objects and arrays (and Maps).
// Typing them as `Set<Document>` coerces elements through `TnRecordOf`, which
// yields `nil` for arrays and causes nested arrays to falsely collide.
edit(
  'bson/src/parser/calculate_size.ts',
  'const path = new Set<Document>();',
  'const path = new Set<any>();'
);
edit(
  'bson/src/parser/calculate_size.ts',
  '  path: Set<Document>',
  '  path: Set<any>'
);
edit(
  'bson/src/parser/serializer.ts',
  '  path: Set<Document> | null',
  '  path: Set<any> | null'
);

// BSON deserializer stores both plain objects (`{}`) and arrays (`[]`) in
// `holdingDocument`, `rootObject`, `currentDest`, and passes them to
// `assignValue`. Typing those slots as `Document` coerces arrays through
// `TnRecordOf`, dropping array elements; use `any` so arrays stay native slices.
edit(
  'bson/src/parser/deserializer.ts',
  '  holdingDocument: Document;',
  '  holdingDocument: any;'
);
edit(
  'bson/src/parser/deserializer.ts',
  'function assignValue(dest: Document, name: string | number, value: unknown): void {',
  'function assignValue(dest: any, name: string | number, value: unknown): void {'
);
edit(
  'bson/src/parser/deserializer.ts',
  '  const rootObject: Document = isArray ? [] : {};',
  '  const rootObject: any = isArray ? [] : {};'
);
edit(
  'bson/src/parser/deserializer.ts',
  '  let currentDest: Document = rootObject;',
  '  let currentDest: any = rootObject;'
);
edit(
  'bson/src/parser/deserializer.ts',
  '  const rootObject: any = isArray ? [] : {};',
  '  const rootArr: any[] = [];\n  if (false) rootArr.push(null);\n  const rootObject: any = isArray ? rootArr : {};'
);
edit(
  'bson/src/parser/deserializer.ts',
  `      const arrayFrame: NestedParsingFrame = {
        holdingDocument: [],`,
  `      const holdingArr: any[] = [];
      if (false) holdingArr.push(null);
      const arrayFrame: NestedParsingFrame = {
        holdingDocument: holdingArr,`
);

// EJSON constructs `new DBRef(collection, serializeValue(oid, options), ...)`
// where `oid` is already a plain EJSON `{ $oid: ... }` object rather than an
// `ObjectId` instance; typing `oid`/`$id` as `any` prevents coercing it to a
// zero `ObjectId`.
edit(
  'bson/src/db_ref.ts',
  `export interface DBRefLike {
  $ref: string;
  $id: ObjectId;
  $db?: string;
}`,
  `export interface DBRefLike {
  $ref: string;
  $id: any;
  $db?: string;
}`
);
edit(
  'bson/src/db_ref.ts',
  '  oid!: ObjectId;',
  '  oid!: any;'
);
edit(
  'bson/src/db_ref.ts',
  '  constructor(collection: string, oid: ObjectId, db?: string, fields?: Document) {',
  '  constructor(collection: string, oid: any, db?: string, fields?: Document) {'
);
edit(
  'bson/src/db_ref.ts',
  '    const copy = Object.assign({}, doc) as Partial<DBRefLike>;',
  '    const copy: Record<string, any> = Object.assign({}, doc as any);'
);

// `HandshakeDocument` extends `Document` and has `ismaster?: boolean` (lowercase)
// while `LEGACY_HELLO_COMMAND` is `'isMaster'` (camelCase). Typing the computed-key
// handshake document as `Document` keeps it as an open map so `isMaster: 1` is preserved.
edit(
  'mongodb/src/cmap/connect.ts',
  `export async function prepareHandshakeDocument(
  authContext: AuthContext
): Promise<HandshakeDocument> {`,
  `export async function prepareHandshakeDocument(
  authContext: AuthContext
): Promise<Document> {`
);
edit(
  'mongodb/src/cmap/connect.ts',
  '  const handshakeDoc: HandshakeDocument = {',
  '  const handshakeDoc: Document = {'
);

// TypeNative compiles `async function*` natively to Go `chan T` async generators,
// whereas a hand-rolled `{ next(), [Symbol.asyncIterator]() }` object literal cannot
// be coerced to `chan []byte` when stored in `Connection.dataEvents`. Rewriting
// `onData` as a genuine `async function*` keeps identical Node and native behavior.
const onDataFile = path.join(vendor, 'mongodb/src/cmap/wire_protocol/on_data.ts');
const asyncGenOnData = `import { type EventEmitter } from 'events';

import { type Abortable } from '../../mongo_types';
import { type TimeoutContext } from '../../timeout';
import { addAbortListener, kDispose, List, promiseWithResolvers } from '../../utils';

type PendingPromises = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
};

export function onData(
  emitter: EventEmitter,
  { timeoutContext, signal, onClose }: { timeoutContext?: TimeoutContext; onClose?: (fn: () => void) => void } & Abortable
): AsyncGenerator<Uint8Array> {
  signal?.throwIfAborted();

  const unconsumedEvents = new List<Uint8Array>();
  const unconsumedPromises = new List<PendingPromises>();
  let error: Error | null = null;
  let finished = false;

  function eventHandler(value: Uint8Array) {
    const promise = unconsumedPromises.shift();
    if (promise != null) promise.resolve({ value, done: false });
    else unconsumedEvents.push(value);
  }

  function errorHandler(err: Error) {
    const promise = unconsumedPromises.shift();
    if (promise != null) promise.reject(err);
    else error = err;
    closeHandler();
  }

  function closeHandler() {
    if (finished) return;
    finished = true;
    emitter.off('data', eventHandler);
    emitter.off('error', errorHandler);
    abortListener?.[kDispose]();
    timeoutForSocketRead?.clear();
    const doneResult = { value: undefined as any, done: true };
    while (unconsumedPromises.length > 0) {
      const promise = unconsumedPromises.shift();
      promise?.resolve(doneResult);
    }
  }

  emitter.on('data', eventHandler);
  emitter.on('error', errorHandler);
  const abortListener = addAbortListener(signal, function () {
    errorHandler(this.reason);
  });

  const timeoutForSocketRead = timeoutContext?.timeoutForSocketRead;
  timeoutForSocketRead?.throwIfExpired();
  timeoutForSocketRead?.then(undefined, errorHandler);
  onClose?.(closeHandler);

  async function* pump(): AsyncGenerator<Uint8Array> {
    try {
      while (true) {
        const value = unconsumedEvents.shift();
        if (value != null) {
          yield value;
          continue;
        }
        if (error != null) {
          const err = error;
          error = null;
          throw err;
        }
        if (finished) return;
        const { promise, resolve, reject } = promiseWithResolvers<any>();
        unconsumedPromises.push({ resolve, reject });
        const next: any = await promise;
        if (next.done) return;
        yield next.value;
      }
    } finally {
      closeHandler();
    }
  }
  return pump();
}
`;
if (fs.readFileSync(onDataFile, 'utf8') !== asyncGenOnData) {
  fs.writeFileSync(onDataFile, asyncGenOnData);
  console.log('patched mongodb/src/cmap/wire_protocol/on_data.ts');
} else {
  console.log('already applied mongodb/src/cmap/wire_protocol/on_data.ts');
}

// Guard `dataEvents?.throw(error)` during connection cleanup so closing an idle
// or already-drained generator never rethrows synchronously.
edit(
  'mongodb/src/cmap/connection.ts',
  '    this.dataEvents?.throw(error);',
  '    if (this.dataEvents) {\n      try {\n        this.dataEvents.throw(error);\n      } catch {\n        // ignore already-closed generator\n      }\n    }'
);

// Unify List's sentinel/element node types (ListNode / HeadNode / EmptyNode)
// into a single struct shape so `ptr !== this.head` and `node === this.head`
// compare pointer identity directly without struct-copy conversions.
edit(
  'mongodb/src/utils.ts',
  `type ListNode<T> = {
  value: T;
  next: ListNode<T> | HeadNode<T>;
  prev: ListNode<T> | HeadNode<T>;
};

type HeadNode<T> = {
  value: null;
  next: ListNode<T>;
  prev: ListNode<T>;
};

/**
 * When a list is empty the head is a reference with pointers to itself
 * So this type represents that self referential state
 */
type EmptyNode = {
  value: null;
  next: EmptyNode;
  prev: EmptyNode;
};`,
  `type ListNode<T> = {
  value: T | null;
  next: ListNode<T>;
  prev: ListNode<T>;
};`
);
edit(
  'mongodb/src/utils.ts',
  `export class List<T = unknown> {
  private readonly head: HeadNode<T> | EmptyNode;`,
  `export class List<T = unknown> {
  private readonly head: ListNode<T>;`
);
edit(
  'mongodb/src/utils.ts',
  `    this.head = {
      next: null,
      prev: null,
      value: null
    } as unknown as EmptyNode;`,
  `    this.head = {
      next: null as any,
      prev: null as any,
      value: null
    };`
);
edit(
  'mongodb/src/utils.ts',
  `  *[Symbol.iterator](): Generator<T, void, void> {
    for (const node of this.nodes()) {
      yield node.value;
    }
  }

  private *nodes(): Generator<ListNode<T>, void, void> {
    let ptr: HeadNode<T> | ListNode<T> | EmptyNode = this.head.next;
    while (ptr !== this.head) {
      // Save next before yielding so that we make removing within iteration safe
      const { next } = ptr as ListNode<T>;
      yield ptr as ListNode<T>;
      ptr = next;
    }
  }

  /** Insert at end of list */
  push(value: T) {
    this.count += 1;
    const newNode: ListNode<T> = {
      next: this.head as HeadNode<T>,
      prev: this.head.prev as ListNode<T>,
      value
    };
    this.head.prev.next = newNode;
    this.head.prev = newNode;
  }

  /** Inserts every item inside an iterable instead of the iterable itself */
  pushMany(iterable: Iterable<T>) {
    for (const value of iterable) {
      this.push(value);
    }
  }

  /** Insert at front of list */
  unshift(value: T) {
    this.count += 1;
    const newNode: ListNode<T> = {
      next: this.head.next as ListNode<T>,
      prev: this.head as HeadNode<T>,
      value
    };
    this.head.next.prev = newNode;
    this.head.next = newNode;
  }

  private remove(node: ListNode<T> | EmptyNode): T | null {`,
  `  *[Symbol.iterator](): Generator<T, void, void> {
    for (const node of this.nodes()) {
      yield node.value as T;
    }
  }

  private *nodes(): Generator<ListNode<T>, void, void> {
    let ptr: ListNode<T> = this.head.next;
    while (ptr !== this.head) {
      // Save next before yielding so that we make removing within iteration safe
      const { next } = ptr;
      yield ptr;
      ptr = next;
    }
  }

  /** Insert at end of list */
  push(value: T) {
    this.count += 1;
    const newNode: ListNode<T> = {
      next: this.head,
      prev: this.head.prev,
      value
    };
    this.head.prev.next = newNode;
    this.head.prev = newNode;
  }

  /** Inserts every item inside an iterable instead of the iterable itself */
  pushMany(iterable: Iterable<T>) {
    for (const value of iterable) {
      this.push(value);
    }
  }

  /** Insert at front of list */
  unshift(value: T) {
    this.count += 1;
    const newNode: ListNode<T> = {
      next: this.head.next,
      prev: this.head,
      value
    };
    this.head.next.prev = newNode;
    this.head.next = newNode;
  }

  private remove(node: ListNode<T>): T | null {`
);
edit(
  'mongodb/src/utils.ts',
  `  prune(filter: (value: T) => boolean) {
    for (const node of this.nodes()) {
      if (filter(node.value)) {
        this.remove(node);
      }
    }
  }

  clear() {
    this.count = 0;
    this.head.next = this.head as EmptyNode;
    this.head.prev = this.head as EmptyNode;
  }`,
  `  prune(filter: (value: T) => boolean) {
    for (const node of this.nodes()) {
      if (filter(node.value as T)) {
        this.remove(node);
      }
    }
  }

  clear() {
    this.count = 0;
    this.head.next = this.head;
    this.head.prev = this.head;
  }`
);

// `Connection.command` returns either a plain `Document` (when responseType is
// omitted) or a `MongoDBResponse` / `CursorResponse` instance (when provided).
// TypeScript allows `Promise<Document>` structurally, while Go maps `Document`
// to `*TnMap[string, interface{}]`; use `Promise<any>` so response instances
// pass through without being coerced to nil.
edit(
  'mongodb/src/cmap/connection.ts',
  `  public async command(
    ns: MongoDBNamespace,
    command: Document,
    options: CommandOptions & Abortable = {},
    responseType?: MongoDBResponseConstructor
  ): Promise<Document> {`,
  `  public async command(
    ns: MongoDBNamespace,
    command: Document,
    options: CommandOptions & Abortable = {},
    responseType?: MongoDBResponseConstructor
  ): Promise<any> {`
);

// Bind `this` lexically in `AbstractCursor.trackCursor` instead of relying on
// EventEmitter dynamic `this` binding on an embedded `TnEventEmitter`.
edit(
  'mongodb/src/cursor/abstract_cursor.ts',
  "    this.once('close', removeActiveCursor);",
  "    this.once('close', () => { this.cursorClient.s.activeCursors.delete(this); });"
);

// Detach `onData` listeners deterministically when `readMany` exits early
// (returning from `for await` in Go breaks the loop without running the
// producer generator's `finally` block until its next receive).
edit(
  'mongodb/src/cmap/connection.ts',
  `    try {
      this.dataEvents = onData(this.messageStream, options);
      this.messageStream.resume();

      for await (const message of this.dataEvents) {
        const response = await decompressResponse(message);
        yield response;

        if (!response.moreToCome) {
          return;
        }
      }
    } catch (readError) {
      if (TimeoutError.is(readError)) {
        const timeoutError = new MongoOperationTimeoutError(
          \`Timed out during socket read (\${readError.duration}ms)\`
        );
        this.dataEvents = null;
        this.onError(timeoutError);
        throw timeoutError;
      } else if (readError === options.signal?.reason) {
        this.onError(readError);
      }
      throw readError;
    } finally {
      this.dataEvents = null;
      this.messageStream.pause();
    }`,
  `    let closeDataEvents: (() => void) | null = null;
    try {
      this.dataEvents = onData(this.messageStream, {
        ...options,
        onClose: (fn: () => void) => {
          closeDataEvents = fn;
        }
      } as any);
      this.messageStream.resume();

      for await (const message of this.dataEvents) {
        const response = await decompressResponse(message);
        yield response;

        if (!response.moreToCome) {
          return;
        }
      }
    } catch (readError) {
      if (TimeoutError.is(readError)) {
        const timeoutError = new MongoOperationTimeoutError(
          \`Timed out during socket read (\${readError.duration}ms)\`
        );
        this.dataEvents = null;
        this.onError(timeoutError);
        throw timeoutError;
      } else if (readError === options.signal?.reason) {
        this.onError(readError);
      }
      throw readError;
    } finally {
      if (closeDataEvents != null) {
        closeDataEvents();
        closeDataEvents = null;
      }
      this.dataEvents = null;
      this.messageStream.pause();
    }`
);

// Pull documents sequentially in `AbstractCursor.toArray()` instead of mixing
// `for await (const document of this)` (eager channel producer goroutine in
// Go) with synchronous `this.readBufferedDocuments()` on the same batch.
edit(
  'mongodb/src/cursor/abstract_cursor.ts',
  `  async toArray(): Promise<TSchema[]> {
    this.signal?.throwIfAborted();

    const array: TSchema[] = [];
    // at the end of the loop (since readBufferedDocuments is called) the buffer will be empty
    // then, the 'await of' syntax will run a getMore call
    for await (const document of this) {
      array.push(document);
      const docs = this.readBufferedDocuments();
      if (this.transform != null) {
        for (const doc of docs) {
          array.push(await this.transformDocument(doc));
        }
      } else {
        // Note: previous versions of this logic used \`array.push(...)\`, which adds each item
        // to the callstack.  For large arrays, this can exceed the maximum call size.
        for (const doc of docs) {
          array.push(doc);
        }
      }
    }
    return array;
  }`,
  `  async toArray(): Promise<TSchema[]> {
    this.signal?.throwIfAborted();

    const array: TSchema[] = [];
    if (this.closed) {
      return array;
    }
    try {
      while (true) {
        if (this.isKilled || this.closed) break;
        if (this.cursorId != null && this.isDead && (this.documents?.length ?? 0) === 0) break;
        const document = await this.next();
        if (document === null) break;
        array.push(document);
        const docs = this.readBufferedDocuments();
        if (this.transform != null) {
          for (const doc of docs) {
            array.push(await this.transformDocument(doc));
          }
        } else {
          for (const doc of docs) {
            array.push(doc);
          }
        }
        this.signal?.throwIfAborted();
      }
    } finally {
      if (!this.isClosed) {
        try {
          await this.close();
        } catch (error) {
          squashError(error);
        }
      }
    }
    return array;
  }`
);
