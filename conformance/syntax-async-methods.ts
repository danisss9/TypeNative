// Async class methods (instance, static, inherited, unannotated) and
// returning another promise from an async function
async function other(): Promise<number> { return 7; }
async function viaOther(): Promise<number> { return other(); }
async function unannotated() { const v = await other(); return v * 2; }
class Service {
  base = 10;
  async get(): Promise<number> { return this.base + 1; }
  async viaOther(): Promise<number> { return other(); }
  async doubled() { const v = await this.get(); return v * 2; }
  static async make(): Promise<string> { return 'made'; }
}
class Sub extends Service {}
async function main(): Promise<void> {
  const s = new Service();
  assert((await s.get()) === 11 && (await s.viaOther()) === 7, 'async methods');
  assert((await s.doubled()) === 22, 'unannotated async method');
  assert((await Service.make()) === 'made', 'static async method');
  assert((await new Sub().get()) === 11, 'inherited async method');
  assert((await viaOther()) === 7 && (await unannotated()) === 14, 'async functions');
}
main();
