import { VariableDeclaration, VariableDeclarator } from 'estree';
import { GetBuilder, IBuilder, varTypes } from './builder.js';

export class VariableDeclarationBuilder implements IBuilder {
  private declarations: IBuilder[];
  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(v: VariableDeclaration) {
    this.declarations = v.declarations.map((d) => GetBuilder(d));
    this.type = this.declarations[0].type;
  }

  build(): string {
    return this.declarations.map((d) => d.build()).join(';\n\t');
  }
}

export class VariableDeclaratorBuilder implements IBuilder {
  private id: IBuilder;
  private value: IBuilder;

  type: 'string' | 'number' | 'boolean' | undefined;
  isArray?: boolean = false;

  constructor(v: VariableDeclarator) {
    this.id = GetBuilder(v.id);
    this.value = GetBuilder(v.init!);
    this.type = this.id.type = this.value.type;
    this.isArray = this.id.isArray = this.value.isArray;
    varTypes[this.id.build()] = this.id;
  }

  build(): string {
    return `${this.getCType()} ${this.id.build()}${
      this.isArray ? '[]' : ''
    } = ${this.value.build()}`;
  }

  private getCType(): string {
    switch (this.type) {
      case 'boolean':
        return 'int';
      case 'number':
        return 'double';
      case 'string':
        this.isArray = true;
        return 'char';
      default:
        return '';
    }
  }
}
