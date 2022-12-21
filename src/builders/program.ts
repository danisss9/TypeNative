import { Program, Statement } from 'estree';
import { GetBuilder, IBuilder } from './builder.js';

export class ProgramBuilder implements IBuilder {
  private imports: string[];
  private subBuilders: IBuilder[];

  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(program: Program) {
    this.imports = program.body.map((e) => this.getImports(e as Statement)).filter((e) => !!e);
    this.subBuilders = program.body.map((e) => GetBuilder(e));
  }

  build(): string {
    return `
#include <stdio.h>
#include <string.h>
${this.imports.length > 0 ? this.imports.map((i) => i + '\n') : ''}
int main() {
    ${this.subBuilders
      .map((b) => b.build())
      .filter((s) => !!s)
      .join(';\n\t')};
    return 0;
}
    `;
  }

  private getImports(statement: Statement): string {
    if (
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'CallExpression' &&
      statement.expression.callee.type === 'Identifier' &&
      statement.expression.callee.name === 'require' &&
      statement.expression.arguments[0].type === 'Literal'
    ) {
      return `#include <${statement.expression.arguments[0].value}.h>`;
    }
    return '';
  }
}
