// Declarations for js-tokens@4 (which ships none), as Babel 7's
// @babel/code-frame uses it: the default export is the tokenizing RegExp and
// `matchToToken` turns one of its matches into a token. Babel's highlighter
// also names the token types of js-tokens@8 in its Babel 8 branch, so those
// are declared too (type-only).

declare const jsTokens: RegExp & { default: RegExp };
declare namespace jsTokens {
  function matchToToken(match: RegExpExecArray): { type: string; value: string; closed?: boolean };
  type Token = { type: string; value: string; closed?: boolean };
  type JSXToken = { type: string; value: string; closed?: boolean };
}
export = jsTokens;
