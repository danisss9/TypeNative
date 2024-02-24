import ts from 'typescript';

export function transpileToC(code: string): string {
  const sourceFile = ts.createSourceFile(
    'main.ts',
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );

  return `
#define console.log(message) printf(message)

#include <stdio.h>
#include <string.h>


int main() {
    ${visit(sourceFile)}
    return 0;
}
    `;
}

export function visit(node: ts.Node): string {
  let code: string = '';

  if (ts.isIdentifier(node)) {
    return node.text;
  } else if (ts.isStringLiteral(node)) {
    return `"${node.text}"`;
  } else if (ts.isPropertyAccessExpression(node)) {
    return `${visit(node.expression)}.${visit(node.name)}`;
  } else if (ts.isCallExpression(node)) {
    const expr = visit(node.expression);
    const leftSide = expr === 'console.log' ? 'printf' : expr;
    return `${leftSide}(${node.arguments.map((a) => visit(a)).join(',')})`;
  } else if (ts.isExpressionStatement(node)) {
    return visit(node.expression) + ';\n';
  }

  // console.log(ts.SyntaxKind[node.kind], node.getText());
  ts.forEachChild(node, (subNode) => (code = code + visit(subNode)));

  return code;
}
