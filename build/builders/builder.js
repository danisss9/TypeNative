import { IdentifierBuilder, LiteralBuilder } from './basic.js';
import { ArrayExpressionBuilder, AssignmentExpressionBuilder, BinaryExpressionBuilder, CallExpressionBuilder, LogicalExpressionBuilder, MemberExpressionBuilder, ParenthesizedExpressionBuilder, UpdateExpressionBuilder } from './expression.js';
import { ForStatementBuilder, ExpressionStatementBuilder, BlockStatementBuilder } from './statement.js';
import { VariableDeclarationBuilder, VariableDeclaratorBuilder } from './vars.js';
export const varTypes = {};
export function GetBuilder(node) {
    switch (node.type) {
        case 'Literal':
            return new LiteralBuilder(node);
        case 'Identifier':
            return new IdentifierBuilder(node);
        case 'VariableDeclaration':
            return new VariableDeclarationBuilder(node);
        case 'VariableDeclarator':
            return new VariableDeclaratorBuilder(node);
        case 'ArrayExpression':
            return new ArrayExpressionBuilder(node);
        case 'AssignmentExpression':
            return new AssignmentExpressionBuilder(node);
        case 'MemberExpression':
            return new MemberExpressionBuilder(node);
        case 'CallExpression':
            return new CallExpressionBuilder(node);
        case 'ParenthesizedExpression':
            return new ParenthesizedExpressionBuilder(node);
        case 'UpdateExpression':
            return new UpdateExpressionBuilder(node);
        case 'LogicalExpression':
            return new LogicalExpressionBuilder(node);
        case 'BinaryExpression':
            return new BinaryExpressionBuilder(node);
        case 'ForStatement':
            return new ForStatementBuilder(node);
        case 'ExpressionStatement':
            return new ExpressionStatementBuilder(node);
        case 'BlockStatement':
            return new BlockStatementBuilder(node);
        default:
            console.log(node.type);
            throw new Error('Method not implemented.');
    }
}
