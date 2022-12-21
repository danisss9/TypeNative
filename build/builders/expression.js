import { GetBuilder } from './builder.js';
export class CallExpressionBuilder {
    constructor(member) {
        this.callee = GetBuilder(member.callee);
        this.args = member.arguments.map((a) => GetBuilder(a));
        this.type = this.callee.type;
    }
    build() {
        const functionName = this.callee.build();
        const args = this.args.map((a) => a.build()).join(',');
        switch (functionName) {
            case 'require':
                return '';
            case 'console.log':
                return `printf("${this.getFormats(this.args)}\\n", ${args})`;
            default:
                return `${functionName}(${args})`;
        }
    }
    getFormats(args) {
        let result = '';
        for (const arg of args) {
            switch (arg.type) {
                case 'boolean':
                    result += '%d';
                    break;
                case 'number':
                    result += '%f';
                    break;
                case 'string':
                    result += '%s';
                    break;
                default:
                    break;
            }
        }
        return result;
    }
}
export class MemberExpressionBuilder {
    constructor(member) {
        this.member = member;
        this.obj = GetBuilder(member.object);
        this.property = GetBuilder(member.property);
        this.type = this.obj.type;
    }
    build() {
        const obj = this.obj.build();
        const prop = this.property.build();
        switch (prop) {
            case 'length':
                return `(sizeof(${obj}) / sizeof(${obj}[0]))`;
            default:
                return this.member.computed ? `${obj}[${prop}]` : `${obj}.${prop}`;
        }
    }
}
export class ParenthesizedExpressionBuilder {
    constructor(expression) {
        this.exp = GetBuilder(expression.expression);
        this.type = this.exp.type;
    }
    build() {
        return `(${this.exp.build()})`;
    }
}
export class BinaryExpressionBuilder {
    constructor(member) {
        this.member = member;
        this.left = GetBuilder(member.left);
        this.right = GetBuilder(member.right);
        this.type = this.left.type;
    }
    build() {
        switch (this.member.operator) {
            case '!=':
            case '==':
            case '<=':
            case '<':
            case '>=':
            case '>':
                this.type = 'boolean';
            case '+':
                if (this.type === 'string')
                    return `strcat(${this.left.build()}, ${this.right.build()})`;
            case '-':
            case '*':
            case '/':
            case '%':
            case '&':
            case '|':
                return `${this.left.build()} ${this.member.operator} ${this.right.build()}`;
            case '===':
                this.type = 'boolean';
                return `${this.left.build()} == ${this.right.build()}`;
            case '!==':
                this.type = 'boolean';
                return `${this.left.build()} != ${this.right.build()}`;
            default:
                console.log(this.member.operator);
                throw new Error('Method not implemented.');
        }
    }
}
export class LogicalExpressionBuilder {
    constructor(member) {
        this.member = member;
        this.left = GetBuilder(member.left);
        this.right = GetBuilder(member.right);
        this.type = this.left.type;
    }
    build() {
        switch (this.member.operator) {
            case '??':
                return `${this.left.build()} ? ${this.left.build()} : ${this.right.build()}`;
            case '&&':
            case '||':
                return `${this.left.build()} ${this.member.operator} ${this.right.build()}`;
        }
    }
}
export class UpdateExpressionBuilder {
    constructor(member) {
        this.member = member;
        this.argument = GetBuilder(member.argument);
        this.type = this.argument.type;
    }
    build() {
        return `${this.member.prefix ? this.member.operator : ''}${this.argument.build()}${!this.member.prefix ? this.member.operator : ''}`;
    }
}
export class AssignmentExpressionBuilder {
    constructor(member) {
        this.left = GetBuilder(member.left);
        this.right = GetBuilder(member.right);
        this.type = this.right.type;
    }
    build() {
        return `${this.left.build()} = ${this.right.build()}`;
    }
}
export class ArrayExpressionBuilder {
    constructor(arr) {
        this.isArray = true;
        this.elements = arr.elements.map((e) => GetBuilder(e));
        this.type = this.elements[0].type;
    }
    build() {
        return `{ ${this.elements.map((e) => e.build()).join(', ')} }`;
    }
}
