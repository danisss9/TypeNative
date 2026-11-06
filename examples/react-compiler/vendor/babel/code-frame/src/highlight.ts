import type { Token as JSToken, JSXToken } from "../../../js-tokens/index.cjs";
import jsTokens from "../../../js-tokens/index.cjs";
// We inline this package
// eslint-disable-next-line import/no-extraneous-dependencies
import * as charCodes from "../../../charcodes/src/index.ts";

import {
  isStrictReservedWord,
  isKeyword,
} from "../../helper-validator-identifier/src/index.ts";

import { getDefs, type InternalTokenType } from "./defs.ts";

/**
 * Names that are always allowed as identifiers, but also appear as keywords
 * within certain syntactic productions.
 *
 * https://tc39.es/ecma262/#sec-keywords-and-reserved-words
 *
 * `target` has been omitted since it is very likely going to be a false
 * positive.
 */
const sometimesKeywords = new Set(["as", "async", "from", "get", "of", "set"]);

type Token = {
  type: InternalTokenType | "uncolored";
  value: string;
};

/**
 * RegExp to test for newlines in terminal.
 */
const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;

/**
 * RegExp to test for the three types of brackets.
 */
const BRACKET = /^[()[\]{}]$/;

let tokenize: (
  text: string,
) => Generator<{ type: InternalTokenType | "uncolored"; value: string }>;


  /**
   * RegExp to test for what seems to be a JSX tag name.
   */
  const JSX_TAG = /^[a-z][\w-]*$/i;

  // The token here is defined in js-tokens@4. However we don't bother
  // typing it since the whole block will be removed in Babel 8
  const getTokenType = function (token: any, offset: number, text: string) {
    if (token.type === "name") {
      const tokenValue = token.value;
      if (
        isKeyword(tokenValue) ||
        isStrictReservedWord(tokenValue, true) ||
        sometimesKeywords.has(tokenValue)
      ) {
        return "keyword";
      }

      if (
        JSX_TAG.test(tokenValue) &&
        (text[offset - 1] === "<" || text.slice(offset - 2, offset) === "</")
      ) {
        return "jsxIdentifier";
      }

      const firstChar = String.fromCodePoint(tokenValue.codePointAt(0));
      if (firstChar !== firstChar.toLowerCase()) {
        return "capitalized";
      }
    }

    if (token.type === "punctuator" && BRACKET.test(token.value)) {
      return "bracket";
    }

    if (
      token.type === "invalid" &&
      (token.value === "@" || token.value === "#")
    ) {
      return "punctuator";
    }

    return token.type;
  };

  tokenize = function* (text: string) {
    let match;
    while ((match = (jsTokens as any).default.exec(text))) {
      const token = (jsTokens as any).matchToToken(match);

      yield {
        type: getTokenType(token, match.index, text),
        value: token.value,
      };
    }
  };


export function highlight(text: string) {
  if (text === "") return "";

  const defs = getDefs(true);

  let highlighted = "";

  for (const { type, value } of tokenize(text)) {
    if (type in defs) {
      highlighted += value
        .split(NEWLINE)
        .map(str => defs[type as InternalTokenType](str))
        .join("\n");
    } else {
      highlighted += value;
    }
  }

  return highlighted;
}
