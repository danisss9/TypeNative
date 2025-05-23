import ts from 'typescript';
let TypeCheker;
export function transpileToNative(code) {
    const sourceFile = ts.createSourceFile('main.ts', code, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
    TypeCheker = ts.createProgram(['main.ts'], {}).getTypeChecker();
    return `package main

import "fmt"

func main() {
    ${visit(sourceFile)}
}`;
}
export function visit(node, inline = false) {
    let code = '';
    if (ts.isIdentifier(node)) {
        return node.text;
    }
    else if (ts.isStringLiteral(node)) {
        return `"${node.text}"`;
    }
    else if (ts.isNumericLiteral(node)) {
        return `float64(${node.text})`;
    }
    else if (ts.isToken(node) && node.kind === ts.SyntaxKind.TrueKeyword) {
        return `true`;
    }
    else if (ts.isToken(node) && node.kind === ts.SyntaxKind.FalseKeyword) {
        return `false`;
    }
    else if (ts.isBlock(node)) {
        return `{\n\t\t${node.statements.map((n) => visit(n)).join('\t')}}\n\t`;
    }
    else if (ts.isPropertyAccessExpression(node)) {
        return `${visit(node.expression)}.${visit(node.name)}`;
    }
    else if (ts.isVariableDeclaration(node)) {
        const type = getType(node.type);
        const initializer = node.initializer ? `= ${visit(node.initializer)}` : '';
        return `${type === ':' ? '' : 'var'} ${visit(node.name)} ${type}${type === ':' ? '' : ' '}${initializer}`;
    }
    else if (ts.isCallExpression(node)) {
        const expr = visit(node.expression);
        return `${getFunction(expr)}(${node.arguments.map((a) => visit(a)).join(',')})`;
    }
    else if (ts.isPrefixUnaryExpression(node)) {
        return `${getOperatorText(node.operator)}${visit(node.operand)}`;
    }
    else if (ts.isPostfixUnaryExpression(node)) {
        return `${visit(node.operand, true)}${getOperatorText(node.operator)}`;
    }
    else if (ts.isBinaryExpression(node)) {
        return `${visit(node.left)} ${node.operatorToken.getText()} ${visit(node.right)}`;
    }
    else if (ts.isParenthesizedExpression(node)) {
        return `(${visit(node.expression)})`;
    }
    else if (ts.isVariableDeclarationList(node)) {
        return (node.declarations.map((n) => visit(n)).join(inline ? ';' : ';\n\t') + (inline ? ';' : ';\n\t'));
    }
    else if (ts.isExpressionStatement(node)) {
        return visit(node.expression) + (inline ? ';' : ';\n\t');
    }
    else if (ts.isForStatement(node)) {
        return `for${visit(node.initializer, true)} ${visit(node.condition, true)}; ${visit(node.incrementor, true)}${visit(node.statement)}`;
    }
    console.log(ts.SyntaxKind[node.kind], node.getText());
    ts.forEachChild(node, (subNode) => {
        code += visit(subNode);
        return null;
    });
    return code;
}
function getType(typeNode) {
    const type = TypeCheker.getTypeFromTypeNode(typeNode);
    const typeName = TypeCheker.typeToString(type);
    switch (typeName) {
        case 'number':
            return 'float64';
        case 'boolean':
            return 'bool';
        case 'any':
            return ':';
        default:
            return typeName;
    }
}
function getFunction(expr) {
    switch (expr) {
        case 'console.log':
            return 'fmt.Println';
        default:
            return expr;
    }
}
function getOperatorText(operator) {
    switch (operator) {
        case ts.SyntaxKind.PlusToken:
            return '+';
        case ts.SyntaxKind.MinusToken:
            return '-';
        case ts.SyntaxKind.TildeToken:
            return '~';
        case ts.SyntaxKind.ExclamationToken:
            return '!';
        case ts.SyntaxKind.PlusPlusToken:
            return '++';
        case ts.SyntaxKind.MinusMinusToken:
            return '--';
    }
}
