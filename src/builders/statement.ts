import { BlockStatement, ExpressionStatement, ForStatement } from 'estree';
import { GetBuilder, IBuilder } from './builder.js';

export class ExpressionStatementBuilder implements IBuilder {
  type: 'string' | 'number' | 'boolean' | undefined;

  private builder: IBuilder;

  constructor(expression: ExpressionStatement) {
    this.builder = GetBuilder(expression.expression);
    this.type = this.builder.type;
  }

  build(): string {
    return this.builder.build();
  }
}

export class BlockStatementBuilder implements IBuilder {
  private subBuilders: IBuilder[];

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(block: BlockStatement) {
    this.subBuilders = block.body.map((e) => GetBuilder(e));
  }

  build(): string {
    return this.subBuilders.map((b) => b.build()).join(';\n\t\t') + ';';
  }
}

export class ForStatementBuilder implements IBuilder {
  type: 'string' | 'number' | 'boolean' | undefined;

  private init: IBuilder;
  private test: IBuilder;
  private update: IBuilder;
  private body: IBuilder;

  constructor(expression: ForStatement) {
    this.init = GetBuilder(expression.init!);
    this.test = GetBuilder(expression.test!);
    this.update = GetBuilder(expression.update!);
    this.body = GetBuilder(expression.body);
  }

  build(): string {
    return `for (${this.init
      .build()
      .replace('double', 'int')}; ${this.test.build()}; ${this.update.build()}) {
        ${this.body.build()}
    }`;
  }
}
