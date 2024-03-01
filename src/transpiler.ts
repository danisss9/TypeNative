import ts from 'typescript';

let TypeCheker: ts.TypeChecker;

export function transpileToC(code: string): string {
  const sourceFile = ts.createSourceFile(
    'main.ts',
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );

  TypeCheker = ts.createProgram(['main.ts'], {}).getTypeChecker();

  return `#include <stdio.h>
#include <string.h>

int main() {
    ${visit(sourceFile)}return 0;
}
    `;
}

export function visit(node: ts.Node): string {
  let code: string = '';

  if (ts.isIdentifier(node)) {
    return node.text;
  } else if (ts.isStringLiteral(node)) {
    return `"${node.text}"`;
  } else if (ts.isNumericLiteral(node)) {
    return `${node.text}`;
  } else if (ts.isToken(node) && node.kind === ts.SyntaxKind.TrueKeyword) {
    return `1`;
  } else if (ts.isToken(node) && node.kind === ts.SyntaxKind.FalseKeyword) {
    return `0`;
  } else if (ts.isPropertyAccessExpression(node)) {
    return `${visit(node.expression)}.${visit(node.name)}`;
  } else if (ts.isVariableDeclaration(node)) {
    const type = getCType(node.type!);
    const initializer = node.initializer ? ` = ${visit(node.initializer)}` : '';
    return `${type.typeStr} ${visit(node.name)}${type.arrayStr}${initializer}`;
  } else if (ts.isCallExpression(node)) {
    const expr = visit(node.expression);
    const leftSide = expr === 'console.log' ? 'printf' : expr;
    return `${leftSide}(${node.arguments.map((a) => visit(a)).join(',')})`;
  } else if (ts.isBinaryExpression(node)) {
    return `${visit(node.left)} ${node.operatorToken.getText()} ${visit(node.right)}`;
  } else if (ts.isParenthesizedExpression(node)) {
    return `(${visit(node.expression)})`;
  } else if (ts.isVariableDeclarationList(node)) {
    return node.declarations.map((n) => visit(n)).join(';\n\t') + ';\n\t';
  } else if (ts.isExpressionStatement(node)) {
    return visit(node.expression) + ';\n\t';
  }

  console.log(ts.SyntaxKind[node.kind], node.getText());
  ts.forEachChild(node, (subNode) => {
    code += visit(subNode);
    return null;
  });

  return code;
}

function getCType(typeNode: ts.TypeNode): { typeStr: string; arrayStr: string } {
  const type = TypeCheker.getTypeFromTypeNode(typeNode);
  const typeName = TypeCheker.typeToString(type);
  switch (typeName) {
    case 'string':
      return { typeStr: 'char', arrayStr: '[]' };
    case 'number':
      return { typeStr: 'double', arrayStr: '' };
    case 'boolean':
      return { typeStr: 'int', arrayStr: '' };
    default:
      return { typeStr: typeName, arrayStr: '' };
  }
}
