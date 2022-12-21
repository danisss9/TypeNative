import { varTypes } from './builder.js';
export class IdentifierBuilder {
    constructor(id) {
        this.id = id;
        this.type = varTypes[this.id.name]?.type;
    }
    build() {
        return this.id.name;
    }
}
export class LiteralBuilder {
    constructor(lit) {
        const value = lit.value;
        if (typeof value === 'string') {
            this.value = `"${value}"`;
            this.type = 'string';
        }
        else if (typeof value === 'number') {
            this.value = `${value}`;
            this.type = 'number';
        }
        else if (typeof value === 'boolean') {
            this.value = `${value ? 1 : 0}`;
            this.type = 'boolean';
        }
    }
    build() {
        return this.value ?? '';
    }
}
