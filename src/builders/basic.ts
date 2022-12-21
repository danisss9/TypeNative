import { Identifier, Literal } from 'estree';
import { IBuilder, varTypes } from './builder.js';

export class IdentifierBuilder implements IBuilder {
  type: 'string' | 'number' | 'boolean' | undefined;

  constructor(private id: Identifier) {
    this.type = varTypes[this.id.name]?.type;
  }

  build(): string {
    return this.id.name;
  }
}

export class LiteralBuilder implements IBuilder {
  type: 'string' | 'number' | 'boolean' | undefined;

  private value?: string;

  constructor(lit: Literal) {
    const value = lit.value;
    if (typeof value === 'string') {
      this.value = `"${value}"`;
      this.type = 'string';
    } else if (typeof value === 'number') {
      this.value = `${value}`;
      this.type = 'number';
    } else if (typeof value === 'boolean') {
      this.value = `${value ? 1 : 0}`;
      this.type = 'boolean';
    }
  }

  build(): string {
    return this.value ?? '';
  }
}
