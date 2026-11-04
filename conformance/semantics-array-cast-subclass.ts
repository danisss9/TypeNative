// `items as Pipe[]` of an array holding a base class's other kinds: the cast
// is taken on trust, so every element must survive it (and dispatch by kind)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

abstract class Ast {
  abstract describe(): string;
}

class Read extends Ast {
  constructor(public name: string) {
    super();
  }
  describe(): string {
    return `read ${this.name}`;
  }
}

class Pipe extends Ast {
  constructor(public exp: Ast, public pipe: string) {
    super();
  }
  describe(): string {
    return `${this.exp.describe()} | ${this.pipe}`;
  }
}

function parseArgs(names: string[]): Pipe[] {
  const positionals: Ast[] = [];
  for (const name of names) {
    positionals.push(name.startsWith('|') ? new Pipe(new Read('x'), name.slice(1)) : new Read(name));
  }
  return positionals as Pipe[];
}

const args = parseArgs(['a', '|upper', 'b']);
assert(args.length === 3, 'three arguments');
const described = args.map((arg) => arg.describe());
assert(described.join(', ') === 'read a, read x | upper, read b', `described: ${described.join(', ')}`);
assert(args[0] instanceof Read && !(args[0] instanceof Pipe), 'first is a read');
assert(args[1] instanceof Pipe, 'second is a pipe');
console.log(described.join(', '));
