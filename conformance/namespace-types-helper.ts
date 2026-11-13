// Helper module for syntax-namespace-types-import.ts: a namespace of types
export namespace Tokens {
  export interface Heading { type: 'heading'; depth: number; text: string }
  export interface Text { type: 'text'; text: string }
  export interface Def { type: 'def'; href: string; title: string }
}
export type Token = Tokens.Heading | Tokens.Text;
