// Type-only surface used by MongoClient's options. Client-side encryption is
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
