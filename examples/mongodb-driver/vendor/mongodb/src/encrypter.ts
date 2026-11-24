// Stub for MongoClient's optional client-side encryption (see auto_encrypter.ts).
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
