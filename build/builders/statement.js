import { GetBuilder } from './builder.js';
export class ExpressionStatementBuilder {
    constructor(expression) {
        this.builder = GetBuilder(expression.expression);
        this.type = this.builder.type;
    }
    build() {
        return this.builder.build();
    }
}
export class BlockStatementBuilder {
    constructor(block) {
        this.subBuilders = block.body.map((e) => GetBuilder(e));
    }
    build() {
        return this.subBuilders.map((b) => b.build()).join(';\n\t\t') + ';';
    }
}
export class ForStatementBuilder {
    constructor(expression) {
        this.init = GetBuilder(expression.init);
        this.test = GetBuilder(expression.test);
        this.update = GetBuilder(expression.update);
        this.body = GetBuilder(expression.body);
    }
    build() {
        return `for (${this.init
            .build()
            .replace('double', 'int')}; ${this.test.build()}; ${this.update.build()}) {
        ${this.body.build()}
    }`;
    }
}
