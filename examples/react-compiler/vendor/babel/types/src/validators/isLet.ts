import { isVariableDeclaration } from "./generated/index.ts";
import type * as t from "../index.ts";


  // eslint-disable-next-line no-var
  var BLOCK_SCOPED_SYMBOL = Symbol.for("var used to be block scoped");


/**
 * Check if the input `node` is a `let` variable declaration.
 */
export default function isLet(node: t.Node): boolean {
  
    return (
      isVariableDeclaration(node) &&
      (node.kind !== "var" ||
        // @ts-expect-error Fixme: document private properties
        node[BLOCK_SCOPED_SYMBOL])
    );
  
}
