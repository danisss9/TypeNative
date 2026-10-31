// Arrays are shared, not copied: an array held in an object's field, in a
// variable and passed to a function (any[] and typed alike) is one array;
// a method returning its array argument returns that same array
interface Text { type: 'text'; raw: string }
interface Heading { type: 'heading'; raw: string; tokens: Token[] }
type Token = Text | Heading;
class Lexer {
  queue: { src: string; tokens: Token[] }[] = [];
  inline(src: string, tokens: Token[] = []) {
    this.queue.push({ src, tokens });
    return tokens;
  }
  inlineTokens(src: string, tokens: Token[] = []) {
    for (const w of src.split(' ')) tokens.push({ type: 'text', raw: w });
    return tokens;
  }
  lex(src: string): Token[] {
    const out: Token[] = [];
    for (const line of src.split('\n')) out.push({ type: 'heading', raw: line, tokens: this.inline(line) });
    for (const next of this.queue) this.inlineTokens(next.src, next.tokens);
    return out;
  }
}
const out = new Lexer().lex('a b\nc');
const first = out[0] as Heading;
assert(first.tokens.length === 2 && first.tokens[1].raw === 'b', 'filled through the queue entry holding the same array');
assert(JSON.stringify(out[1]) === '{"type":"heading","raw":"c","tokens":[{"type":"text","raw":"c"}]}', 'JSON of the filled tokens');
const holder: { items: number[] } = { items: [] };
const alias = holder.items;
alias.push(1);
holder.items.push(2);
assert(alias.length === 2 && holder.items.length === 2, 'a field and its alias');
function fill(xs: unknown[]) {
  xs.push('x');
}
const anyList: unknown[] = [];
fill(anyList);
assert(anyList.length === 1, 'an any[] argument is shared');
const { items } = holder;
items.push(3);
assert(holder.items.length === 3, 'a destructured array field');
