import {
  isMemberExpression,
  isOptionalMemberExpression,
  isYieldExpression,
  isStatement,
} from "../../../types/src/index.ts";
import type * as t from "../../../types/src/index.ts";

import { TokenContext } from "./index.ts";

const PRECEDENCE = new Map([
  ["||", 0],
  ["??", 1],
  ["&&", 2],
  ["|", 3],
  ["^", 4],
  ["&", 5],
  ["==", 6],
  ["===", 6],
  ["!=", 6],
  ["!==", 6],
  ["<", 7],
  [">", 7],
  ["<=", 7],
  [">=", 7],
  ["in", 7],
  ["instanceof", 7],
  [">>", 8],
  ["<<", 8],
  [">>>", 8],
  ["+", 9],
  ["-", 9],
  ["*", 10],
  ["/", 10],
  ["%", 10],
  ["**", 11],
]);

function isTSTypeExpression(nodeId: number) {
  return (
    nodeId === 156 ||
    nodeId === 201 ||
    nodeId === 209
  );
}

const isClassExtendsClause = (
  node: t.Node,
  parent: any,
  parentId: number,
): parent is t.Class => {
  return (
    (parentId === 21 ||
      parentId === 22) &&
    parent.superClass === node
  );
};

export const hasPostfixPart = (node: t.Node, parent: any, parentId: number) => {
  switch (parentId) {
    case 108:
    case 132:
      return parent.object === node;
    case 17:
    case 130:
    case 112:
      return parent.callee === node;
    case 222:
      return parent.tag === node;
    case 191:
      return true;
    case 177:
      return parent.expression === node;
  }

  return false;
};

export function NullableTypeAnnotation(
  node: t.NullableTypeAnnotation,
  parent: any,
  parentId: number,
): boolean {
  return parentId === 4;
}

export function FunctionTypeAnnotation(
  node: t.FunctionTypeAnnotation,
  parent: any,
  parentId: number,
  tokenContext: number,
): boolean {
  return (
    // (() => A) | (() => B)
    parentId === 239 ||
    // (() => A) & (() => B)
    parentId === 90 ||
    // (() => A)[]
    parentId === 4 ||
    (tokenContext & TokenContext.arrowFlowReturnType) > 0
  );
}

export function UpdateExpression(
  node: t.UpdateExpression,
  parent: any,
  parentId: number,
): boolean {
  return (
    hasPostfixPart(node, parent, parentId) ||
    isClassExtendsClause(node, parent, parentId)
  );
}

function needsParenBeforeExpressionBrace(tokenContext: number) {
  return (
    (tokenContext &
      (TokenContext.expressionStatement | TokenContext.arrowBody)) >
    0
  );
}

export function ObjectExpression(
  node: t.ObjectExpression,
  parent: any,
  parentId: number,
  tokenContext: number,
): boolean {
  return needsParenBeforeExpressionBrace(tokenContext);
}

export function DoExpression(
  node: t.DoExpression,
  parent: any,
  parentId: number,
  tokenContext: number,
): boolean {
  // `async do` can start an expression statement
  return (tokenContext & TokenContext.expressionStatement) > 0 && !node.async;
}

const enum BinaryLikeType {
  Binary = 0,
  Logical = 1,
  TypeScript = 2,
}

function BinaryLike(
  node: t.Binary | t.TSAsExpression | t.TSSatisfiesExpression,
  parent: any,
  parentId: number,
  nodeType: BinaryLikeType,
): boolean {
  if (isClassExtendsClause(node, parent, parentId)) {
    return true;
  }

  if (
    hasPostfixPart(node, parent, parentId) ||
    parentId === 238 ||
    parentId === 145 ||
    parentId === 8
  ) {
    return true;
  }
  let parentPos: number | undefined;
  switch (parentId) {
    case 10:
    case 107:
      parentPos = PRECEDENCE.get(parent.operator);
      break;
    case 156:
    case 201:
      parentPos = 7; /* in */
  }
  if (parentPos !== undefined) {
    const nodePos =
      nodeType === BinaryLikeType.TypeScript
        ? 7 /* in */
        : PRECEDENCE.get((node as t.Binary).operator)!;
    if (parentPos > nodePos) return true;
    if (
      parentPos === nodePos &&
      parentId === 10 &&
      (nodePos === 11 /* ** */ ? parent.left === node : parent.right === node)
    ) {
      return true;
    }
    if (
      nodeType === BinaryLikeType.Logical &&
      parentId === 107 &&
      // 1: ??
      ((nodePos === 1 && parentPos !== 1) || (parentPos === 1 && nodePos !== 1))
    ) {
      return true;
    }
  }
  return false;
}

export function UnionTypeAnnotation(
  node: t.UnionTypeAnnotation | t.IntersectionTypeAnnotation,
  parent: any,
  parentId: number,
): boolean {
  switch (parentId) {
    case 4:
    case 115:
    case 90:
    case 239:
      return true;
  }
  return false;
}

export { UnionTypeAnnotation as IntersectionTypeAnnotation };

export function OptionalIndexedAccessType(
  node: t.OptionalIndexedAccessType,
  parent: any,
  parentId: number,
): boolean {
  return parentId === 84 && parent.objectType === node;
}

export function TSAsExpression(
  node: t.TSAsExpression | t.TSSatisfiesExpression,
  parent: any,
  parentId: number,
): boolean {
  if (
    (parentId === 6 ||
      parentId === 7) &&
    parent.left === node
  ) {
    return true;
  }
  if (
    parentId === 10 &&
    (parent.operator === "|" || parent.operator === "&") &&
    node === parent.left
  ) {
    return true;
  }
  return BinaryLike(node, parent, parentId, BinaryLikeType.TypeScript);
}

export { TSAsExpression as TSSatisfiesExpression };

export { UnaryLike as TSTypeAssertion };

export function TSConditionalType(
  node: t.TSConditionalType,
  parent: any,
  parentId: number,
): boolean {
  switch (parentId) {
    case 155:
    case 195:
    case 211:
    // for `infer K extends (L extends M ? M : ...)`
    // fallthrough
    case 212:
      return true;
    case 175:
      return parent.objectType === node;
    case 181:
    case 219:
      return parent.types[0] === node;
    case 161:
      return parent.checkType === node || parent.extendsType === node;
  }
  return false;
}

export function TSUnionType(
  node: t.TSUnionType | t.TSFunctionType,
  parent: any,
  parentId: number,
): boolean {
  switch (parentId) {
    case 181:
    case 211:
    case 155:
    case 195:
      return true;
    case 175:
      return parent.objectType === node;
  }
  return false;
}

export function TSIntersectionType(
  node: t.TSUnionType,
  parent: any,
  parentId: number,
): boolean {
  return (
    parentId === 211 ||
    TSTypeOperator(node, parent, parentId)
  );
}

export function TSInferType(
  node: t.TSInferType,
  parent: any,
  parentId: number,
): boolean {
  if (TSTypeOperator(node, parent, parentId)) {
    return true;
  }
  if (
    (parentId === 181 ||
      parentId === 219) &&
    node.typeParameter.constraint &&
    parent.types[0] === node
  ) {
    return true;
  }
  return false;
}

export function TSTypeOperator(
  node: t.TSTypeOperator | t.TSUnionType | t.TSInferType,
  parent: any,
  parentId: number,
): boolean {
  switch (parentId) {
    case 155:
    case 195:
      return true;
    case 175:
      if (parent.objectType === node) {
        return true;
      }
  }
  return false;
}

export function TSInstantiationExpression(
  node: t.TSInstantiationExpression,
  parent: any,
  parentId: number,
) {
  switch (parentId) {
    case 17:
    case 130:
    case 112:
    case 177:
      return (
        ((parent.typeParameters)) != null
      );
    case 108:
    case 132:
      // `a<b>.c` is invalid, and `a<b>[0]` is parsed as a comparison
      return parent.object === node;
    case 191:
      // `a<b>!` is invalid
      return true;
  }

  return false;
}

export function TSFunctionType(
  node: t.TSFunctionType,
  parent: any,
  parentId: number,
): boolean {
  if (TSUnionType(node, parent, parentId)) return true;

  return (
    parentId === 219 ||
    (parentId === 161 &&
      (parent.checkType === node || parent.extendsType === node))
  );
}

export { TSFunctionType as TSConstructorType };

export function BinaryExpression(
  node: t.BinaryExpression,
  parent: any,
  parentId: number,
  tokenContext: number,
): boolean {
  if (BinaryLike(node, parent, parentId, BinaryLikeType.Binary)) return true;

  // for ((1 in []);;);
  // for (var x = (1 in []) in 2);
  return (
    (tokenContext & TokenContext.forInOrInitHeadAccumulate) > 0 &&
    node.operator === "in"
  );
}

export function LogicalExpression(
  node: t.LogicalExpression,
  parent: any,
  parentId: number,
): boolean {
  return BinaryLike(node, parent, parentId, BinaryLikeType.Logical);
}

export function SequenceExpression(
  node: t.SequenceExpression,
  parent: any,
  parentId: number,
): boolean {
  if (
    parentId === 144 ||
    parentId === 133 ||
    (parentId === 108 && parent.property === node) ||
    (parentId === 132 &&
      parent.property === node) ||
    parentId === 224
  ) {
    return false;
  }
  if (parentId === 21) {
    return true;
  }
  if (parentId === 68) {
    return parent.right === node;
  }
  if (parentId === 60) {
    return true;
  }

  return !isStatement(parent);
}

export function YieldExpression(
  node: t.YieldExpression,
  parent: any,
  parentId: number,
): boolean {
  return (
    parentId === 10 ||
    parentId === 107 ||
    parentId === 238 ||
    parentId === 145 ||
    hasPostfixPart(node, parent, parentId) ||
    (parentId === 8 && isYieldExpression(node)) ||
    (parentId === 28 && node === parent.test) ||
    isClassExtendsClause(node, parent, parentId) ||
    isTSTypeExpression(parentId)
  );
}

export { YieldExpression as AwaitExpression };

export function ClassExpression(
  node: t.ClassExpression,
  parent: any,
  parentId: number,
  tokenContext: number,
): boolean {
  return (
    (tokenContext &
      (TokenContext.expressionStatement | TokenContext.exportDefault)) >
    0
  );
}

function UnaryLike(
  node:
    | t.UnaryLike
    | t.TSTypeAssertion
    | t.ArrowFunctionExpression
    | t.ConditionalExpression
    | t.AssignmentExpression,
  parent: any,
  parentId: number,
): boolean {
  return (
    hasPostfixPart(node, parent, parentId) ||
    (parentId === 10 &&
      parent.operator === "**" &&
      parent.left === node) ||
    isClassExtendsClause(node, parent, parentId)
  );
}

export { UnaryLike as UnaryExpression, UnaryLike as SpreadElement };

export function FunctionExpression(
  node: t.FunctionExpression,
  parent: any,
  parentId: number,
  tokenContext: number,
): boolean {
  return (
    (tokenContext &
      (TokenContext.expressionStatement | TokenContext.exportDefault)) >
    0
  );
}

export function ConditionalExpression(
  node:
    | t.ConditionalExpression
    | t.ArrowFunctionExpression
    | t.AssignmentExpression,
  parent: any,
  parentId: number,
): boolean {
  switch (parentId) {
    case 238:
    case 145:
    case 10:
    case 107:
    case 8:
      return true;
    case 28:
      if (parent.test === node) {
        return true;
      }
  }

  if (isTSTypeExpression(parentId)) {
    return true;
  }

  return UnaryLike(node, parent, parentId);
}

export { ConditionalExpression as ArrowFunctionExpression };

export function OptionalMemberExpression(
  node: t.OptionalMemberExpression,
  parent: any,
  parentId: number,
): boolean {
  switch (parentId) {
    case 17:
      return parent.callee === node;
    case 108:
      return parent.object === node;
  }
  return false;
}

export { OptionalMemberExpression as OptionalCallExpression };

export function AssignmentExpression(
  node: t.AssignmentExpression,
  parent: any,
  parentId: number,
  tokenContext: number,
): boolean {
  if (
    needsParenBeforeExpressionBrace(tokenContext) &&
    node.left.type === "ObjectPattern"
  ) {
    return true;
  }
  return ConditionalExpression(node, parent, parentId);
}

export function Identifier(
  node: t.Identifier,
  parent: any,
  parentId: number,
  tokenContext: number,
  getRawIdentifier: (node: t.Identifier) => string,
): boolean {
  if (getRawIdentifier && getRawIdentifier(node) !== node.name) {
    return false;
  }

  // 13.15.2 AssignmentExpression RS: Evaluation
  // (fn) = function () {};
  if (
    parentId === 6 &&
    node.extra?.parenthesized &&
    parent.left === node
  ) {
    const rightType = parent.right.type;
    if (
      (rightType === "FunctionExpression" || rightType === "ClassExpression") &&
      parent.right.id == null
    ) {
      return true;
    }
  }

  // fast path
  if (
    tokenContext & TokenContext.forOfHead ||
    ((parentId === 108 ||
      parentId === 132) &&
      tokenContext &
        (TokenContext.expressionStatement |
          TokenContext.forInitHead |
          TokenContext.forInHead))
  ) {
    // Non-strict code allows the identifier `let`, but it cannot occur as-is in
    // certain contexts to avoid ambiguity with contextual keyword `let`.
    if (node.name === "let") {
      // Some contexts only forbid `let [`, so check if the next token would
      // be the left bracket of a computed member expression.
      const isFollowedByBracket =
        isMemberExpression(parent, {
          object: node,
          computed: true,
        }) ||
        isOptionalMemberExpression(parent, {
          object: node,
          computed: true,
          optional: false,
        });
      if (
        isFollowedByBracket &&
        tokenContext &
          (TokenContext.expressionStatement |
            TokenContext.forInitHead |
            TokenContext.forInHead)
      ) {
        return true;
      }
      return (tokenContext & TokenContext.forOfHead) > 0;
    }
  }

  // ECMAScript specifically forbids a for-of loop from starting with the
  // token sequence `for (async of`, because it would be ambiguous with
  // `for (async of => {};;)`, so we need to add extra parentheses.
  return (
    parentId === 68 &&
    parent.left === node &&
    node.name === "async" &&
    !parent.await
  );
}
