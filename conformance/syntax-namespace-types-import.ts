// Ns.T of a namespace declared in another module: the namespace's type
import type { Tokens, Token } from './namespace-types-helper.ts';
function heading(text: string): Tokens.Heading {
  return { type: 'heading', depth: 2, text };
}
const tokens: Token[] = [heading('h'), { type: 'text', text: 't' }];
const h = tokens[0] as Tokens.Heading;
assert(h.depth === 2 && h.text === 'h' && tokens.length === 2, 'namespace types across modules');
