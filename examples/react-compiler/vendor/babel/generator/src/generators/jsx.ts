import type Printer from "../printer.ts";
import type * as t from "../../../types/src/index.ts";

export function JSXAttribute(this: Printer, node: t.JSXAttribute) {
  this.print(node.name);
  if (node.value) {
    this.tokenChar(61);
    this.print(node.value);
  }
}

export function JSXIdentifier(this: Printer, node: t.JSXIdentifier) {
  this.word(node.name);
}

export function JSXNamespacedName(this: Printer, node: t.JSXNamespacedName) {
  this.print(node.namespace);
  this.tokenChar(58);
  this.print(node.name);
}

export function JSXMemberExpression(
  this: Printer,
  node: t.JSXMemberExpression,
) {
  this.print(node.object);
  this.tokenChar(46);
  this.print(node.property);
}

export function JSXSpreadAttribute(this: Printer, node: t.JSXSpreadAttribute) {
  this.tokenChar(123);
  this.token("...");
  this.print(node.argument);
  this.rightBrace(node);
}

export function JSXExpressionContainer(
  this: Printer,
  node: t.JSXExpressionContainer,
) {
  this.tokenChar(123);
  this.print(node.expression);
  this.rightBrace(node);
}

export function JSXSpreadChild(this: Printer, node: t.JSXSpreadChild) {
  this.tokenChar(123);
  this.token("...");
  this.print(node.expression);
  this.rightBrace(node);
}

export function JSXText(this: Printer, node: t.JSXText) {
  const raw = this.getPossibleRaw(node);

  if (raw !== undefined) {
    this.token(raw, true);
  } else {
    this.token(node.value, true);
  }
}

export function JSXElement(this: Printer, node: t.JSXElement) {
  const open = node.openingElement;
  this.print(open);
  if (open.selfClosing) return;

  this.indent();
  for (const child of node.children) {
    this.print(child);
  }
  this.dedent();

  this.print(node.closingElement);
}

function spaceSeparator(this: Printer) {
  this.space();
}

export function JSXOpeningElement(this: Printer, node: t.JSXOpeningElement) {
  this.tokenChar(60);
  this.print(node.name);
  
    if (node.typeArguments) {
      this.print(node.typeArguments); // Flow AST
    }
    // @ts-ignore(Babel 7 vs Babel 8) Removed in Babel 8
    this.print(node.typeParameters); // Legacy TS AST
  

  if (node.attributes.length > 0) {
    this.space();
    this.printJoin(node.attributes, undefined, undefined, spaceSeparator);
  }
  if (node.selfClosing) {
    this.space();
    this.tokenChar(47);
  }
  this.tokenChar(62);
}

export function JSXClosingElement(this: Printer, node: t.JSXClosingElement) {
  this.tokenChar(60);
  this.tokenChar(47);
  this.print(node.name);
  this.tokenChar(62);
}

export function JSXEmptyExpression(this: Printer) {
  // This node is empty, so forcefully print its inner comments.
  this.printInnerComments();
}

export function JSXFragment(this: Printer, node: t.JSXFragment) {
  this.print(node.openingFragment);

  this.indent();
  for (const child of node.children) {
    this.print(child);
  }
  this.dedent();

  this.print(node.closingFragment);
}

export function JSXOpeningFragment(this: Printer) {
  this.tokenChar(60);
  this.tokenChar(62);
}

export function JSXClosingFragment(this: Printer) {
  this.token("</");
  this.tokenChar(62);
}
