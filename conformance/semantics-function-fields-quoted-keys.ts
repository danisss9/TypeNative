// Quoted keys in a typed object literal; a function-valued field read as a value; push on a getter's array
interface SourceMap { file?: string; version: number; sources: string[]; }
class Gen {
  private lines: { col: number }[][] = [[]];
  file: string | null = null;
  get currentLine(): { col: number }[] | null { return this.lines.slice(-1)[0]; }
  add(col: number): this { this.currentLine!.push({ col }); return this; }
  toJSON(): SourceMap { return { 'file': this.file || '', 'version': 3, 'sources': ['a'] }; }
}
interface Ctx { msg: string; mapper: (name: string) => string; }
class Bundle {
  private _stack: Ctx[] = [];
  private _mapper: (name: string) => string = (n) => n;
  run(): string {
    this._stack.push({ msg: 'm', mapper: this._mapper });
    this._mapper = (name: string) => name.toUpperCase();
    const out = this._mapper('x');
    const context = this._stack.pop()!;
    this._mapper = context.mapper;
    return out + this._mapper('y');
  }
}
const g = new Gen(); g.add(1).add(2);
const text = JSON.stringify(g.toJSON()) + ' ' + new Bundle().run();
console.log(text);
assert(text === '{"file":"","version":3,"sources":["a"]} Xy', 'fields');
