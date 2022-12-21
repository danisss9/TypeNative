import {
  ArrayExpression,
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  ExpressionStatement,
  LogicalExpression,
  MemberExpression,
  UpdateExpression
} from 'estree';
import { GetBuilder, IBuilder } from './builder.js';

export class CallExpressionBuilder implements IBuilder {
  type: 'string' | 'number' | 'boolean' | undefined;

  private callee: IBuilder;
  private args: IBuilder[];

  constructor(member: CallExpression) {
    this.callee = GetBuilder(member.callee);
    this.args = member.arguments.map((a) => GetBuilder(a));
    this.type = this.callee.type;
  }

  build(): string {
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

  private getFormats(args: IBuilder[]): string {
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

export class MemberExpressionBuilder implements IBuilder {
  private obj: IBuilder;
  private property: IBuilder;

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(private member: MemberExpression) {
    this.obj = GetBuilder(member.object);
    this.property = GetBuilder(member.property);
    this.type = this.obj.type;
  }

  build(): string {
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

export class ParenthesizedExpressionBuilder implements IBuilder {
  private exp: IBuilder;

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(expression: ExpressionStatement) {
    this.exp = GetBuilder(expression.expression);
    this.type = this.exp.type;
  }

  build(): string {
    return `(${this.exp.build()})`;
  }
}

export class BinaryExpressionBuilder implements IBuilder {
  private left: IBuilder;
  private right: IBuilder;

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(private member: BinaryExpression) {
    this.left = GetBuilder(member.left);
    this.right = GetBuilder(member.right);
    this.type = this.left.type;
  }

  build(): string {
    switch (this.member.operator) {
      case '!=':
      case '==':
      case '<=':
      case '<':
      case '>=':
      case '>':
        this.type = 'boolean';
      case '+':
        if (this.type === 'string') return `strcat(${this.left.build()}, ${this.right.build()})`;
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

export class LogicalExpressionBuilder implements IBuilder {
  private left: IBuilder;
  private right: IBuilder;

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(private member: LogicalExpression) {
    this.left = GetBuilder(member.left);
    this.right = GetBuilder(member.right);
    this.type = this.left.type;
  }

  build(): string {
    switch (this.member.operator) {
      case '??':
        return `${this.left.build()} ? ${this.left.build()} : ${this.right.build()}`;
      case '&&':
      case '||':
        return `${this.left.build()} ${this.member.operator} ${this.right.build()}`;
    }
  }
}

export class UpdateExpressionBuilder implements IBuilder {
  private argument: IBuilder;

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(private member: UpdateExpression) {
    this.argument = GetBuilder(member.argument);
    this.type = this.argument.type;
  }

  build(): string {
    return `${this.member.prefix ? this.member.operator : ''}${this.argument.build()}${
      !this.member.prefix ? this.member.operator : ''
    }`;
  }
}

export class AssignmentExpressionBuilder implements IBuilder {
  private left: IBuilder;
  private right: IBuilder;

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(member: AssignmentExpression) {
    this.left = GetBuilder(member.left);
    this.right = GetBuilder(member.right);
    this.type = this.right.type;
  }

  build(): string {
    return `${this.left.build()} = ${this.right.build()}`;
  }
}

export class ArrayExpressionBuilder implements IBuilder {
  private elements: IBuilder[];

  type: 'string' | 'number' | 'boolean' | undefined;
  isArray = true;

  constructor(arr: ArrayExpression) {
    this.elements = arr.elements.map((e) => GetBuilder(e!));
    this.type = this.elements[0].type;
  }

  build(): string {
    return `{ ${this.elements.map((e) => e.build()).join(', ')} }`;
  }
}
