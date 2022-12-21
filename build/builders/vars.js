import { GetBuilder, varTypes } from './builder.js';
export class VariableDeclarationBuilder {
    constructor(v) {
        this.declarations = v.declarations.map((d) => GetBuilder(d));
        this.type = this.declarations[0].type;
    }
    build() {
        return this.declarations.map((d) => d.build()).join(';\n\t');
    }
}
export class VariableDeclaratorBuilder {
    constructor(v) {
        this.isArray = false;
        this.id = GetBuilder(v.id);
        this.value = GetBuilder(v.init);
        this.type = this.id.type = this.value.type;
        this.isArray = this.id.isArray = this.value.isArray;
        varTypes[this.id.build()] = this.id;
    }
    build() {
        return `${this.getCType()} ${this.id.build()}${this.isArray ? '[]' : ''} = ${this.value.build()}`;
    }
    getCType() {
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
