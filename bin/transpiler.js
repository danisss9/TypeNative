import ts from 'typescript';
let TypeCheker;
const importedPackages = new Set();
let outsideNodes = [];
const classNames = new Set();
let promiseResolveName = '';
export function transpileToNative(code) {
    const sourceFile = ts.createSourceFile('main.ts', code, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
    TypeCheker = ts.createProgram(['main.ts'], {}).getTypeChecker();
    importedPackages.clear();
    outsideNodes = [];
    classNames.clear();
    promiseResolveName = '';
    const transpiledCode = visit(sourceFile, { addFunctionOutside: true });
    const transpiledCodeOutside = outsideNodes.map((n) => visit(n, { isOutside: true })).join('\n');
    return `package main

${[...importedPackages].map((pkg) => `import "${pkg}"`).join('\n')}

func main() {
    ${transpiledCode.trim()}
}
 
${transpiledCodeOutside.trim()}`;
}
export function visit(node, options = {}) {
    let code = '';
    if (ts.isSourceFile(node)) {
        return node.statements
            .map((n) => visit(n, { addFunctionOutside: true }))
            .filter((n) => !!n)
            .join(options.inline ? '' : '\n\t');
    }
    else if (ts.isIdentifier(node)) {
        return node.text;
    }
    else if (ts.isStringLiteral(node)) {
        return `"${node.text}"`;
    }
    else if (ts.isNumericLiteral(node)) {
        return `float64(${node.text})`;
    }
    else if (ts.isToken(node) && node.kind === ts.SyntaxKind.TrueKeyword) {
        return `true`;
    }
    else if (ts.isToken(node) && node.kind === ts.SyntaxKind.FalseKeyword) {
        return `false`;
    }
    else if (ts.isArrayLiteralExpression(node)) {
        const type = ts.isVariableDeclaration(node.parent) ? getType(node.parent.type, true) : '';
        return `[]${type} {${node.elements.map((e) => visit(e)).join(', ')}}`;
    }
    else if (ts.isBlock(node)) {
        return `{\n\t\t${node.statements.map((n) => visit(n)).join('\t')}${options.extraBlockContent ?? ''}}${options.inline ? '' : '\n\t'}`;
    }
    else if (ts.isElementAccessExpression(node)) {
        return `${visit(node.expression)}[int(${visit(node.argumentExpression)})]`;
    }
    else if (ts.isPropertyAccessExpression(node)) {
        const leftSide = visit(node.expression);
        const rightSide = visit(node.name);
        return getAcessString(leftSide, rightSide);
    }
    else if (ts.isVariableDeclaration(node)) {
        const type = getType(node.type);
        const initializer = node.initializer ? `= ${visit(node.initializer)}` : '';
        return `${type === ':' ? '' : 'var '}${visit(node.name)} ${type}${type === ':' ? '' : ' '}${initializer}`;
    }
    else if (ts.isCallExpression(node)) {
        // Handle setTimeout specially to get raw delay value
        if (ts.isIdentifier(node.expression) && node.expression.text === 'setTimeout') {
            importedPackages.add('time');
            const callback = visit(node.arguments[0]);
            const delayNode = node.arguments[1];
            const delay = ts.isNumericLiteral(delayNode) ? delayNode.text : visit(delayNode);
            return `time.AfterFunc(${delay} * time.Millisecond, ${callback.trimEnd()})`;
        }
        const caller = visit(node.expression);
        const typeArgs = getTypeArguments(node.typeArguments);
        const args = node.arguments.map((a) => visit(a));
        return getCallString(caller, args, typeArgs);
    }
    else if (ts.isPrefixUnaryExpression(node)) {
        return `${getOperatorText(node.operator)}${visit(node.operand)}`;
    }
    else if (ts.isPostfixUnaryExpression(node)) {
        return `${visit(node.operand, { inline: true })}${getOperatorText(node.operator)}`;
    }
    else if (ts.isBinaryExpression(node)) {
        let op = node.operatorToken.getText();
        if (op === '===')
            op = '==';
        if (op === '!==')
            op = '!=';
        return `${visit(node.left)} ${op} ${visit(node.right)}`;
    }
    else if (ts.isParenthesizedExpression(node)) {
        return `(${visit(node.expression)})`;
    }
    else if (ts.isAwaitExpression(node)) {
        return `<-${visit(node.expression)}`;
    }
    else if (ts.isVariableDeclarationList(node)) {
        return (node.declarations.map((n) => visit(n)).join(options.inline ? ';' : ';\n\t') +
            (options.inline ? '' : ';\n\t'));
    }
    else if (ts.isExpressionStatement(node)) {
        return visit(node.expression) + (options.inline ? '' : ';\n\t');
    }
    else if (ts.isForStatement(node)) {
        return `for ${visit(node.initializer, { inline: true })}; ${visit(node.condition, {
            inline: true
        })}; ${visit(node.incrementor, { inline: true })}${visit(node.statement)}`;
    }
    else if (ts.isForOfStatement(node)) {
        return `for _,${visit(node.initializer, { inline: true })}= range ${visit(node.expression, {
            inline: true
        })}${visit(node.statement)}`;
    }
    else if (ts.isWhileStatement(node)) {
        return `for ${visit(node.expression, { inline: true })}${visit(node.statement)}`;
    }
    else if (ts.isDoStatement(node)) {
        const condition = `\tif !(${visit(node.expression, {
            inline: true
        })}) {\n\t\t\tbreak \n\t\t}\n\t`;
        return `for ${visit(node.statement, { inline: true, extraBlockContent: condition })}`;
    }
    else if (ts.isIfStatement(node)) {
        const condition = `if ${visit(node.expression, { inline: true })} ${visit(node.thenStatement, {
            inline: !!node.elseStatement
        })}`;
        if (node.elseStatement) {
            return `${condition} else ${visit(node.elseStatement)}`;
        }
        return condition;
    }
    else if (ts.isSwitchStatement(node)) {
        return `switch ${visit(node.expression)} ${visit(node.caseBlock)}`;
    }
    else if (ts.isCaseBlock(node)) {
        return `{\n\t\t${node.clauses.map((c) => visit(c)).join('\n\t\t')}\n\t}`;
    }
    else if (ts.isCaseClause(node)) {
        const isFallThrough = !node.statements.some((c) => ts.isBreakStatement(c));
        return `case ${visit(node.expression, { inline: true })}: \n\t\t\t${node.statements
            .filter((n) => !ts.isBreakStatement(n))
            .map((s) => visit(s))
            .join('')}${isFallThrough ? 'fallthrough\n\t' : ''}`;
    }
    else if (ts.isDefaultClause(node)) {
        return `default: \n\t\t\t${node.statements
            .filter((n) => !ts.isBreakStatement(n))
            .map((s) => visit(s))
            .join('')}`;
    }
    else if (ts.isBreakStatement(node)) {
        return 'break';
    }
    else if (ts.isReturnStatement(node)) {
        // Handle return new Promise(...)
        if (node.expression &&
            ts.isNewExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === 'Promise') {
            return visitPromiseReturn(node.expression, options);
        }
        return (`return ${node.expression ? visit(node.expression) : ''}` + (options.inline ? '' : ';\n\t'));
    }
    else if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            return '';
        }
        const name = visit(node.name, { inline: true });
        const typeParams = getTypeParameters(node.typeParameters);
        const parameters = node.parameters
            .map((p) => `${visit(p.name)} ${getType(p.type)}`)
            .join(', ');
        const returnType = node.type ? ` ${getType(node.type)}` : '';
        if (options.isOutside) {
            return `func ${name}${typeParams}(${parameters})${returnType} ${visit(node.body)}`;
        }
        return `${name} := func${typeParams}(${parameters})${returnType} ${visit(node.body)}`;
    }
    else if (ts.isArrowFunction(node)) {
        const parameters = node.parameters
            .map((p) => `${visit(p.name)} ${getType(p.type)}`)
            .join(', ');
        const returnType = node.type ? ` ${getType(node.type)}` : '';
        return `func(${parameters})${returnType} ${visit(node.body)}`;
    }
    else if (node.kind === ts.SyntaxKind.ThisKeyword) {
        return 'self';
    }
    else if (ts.isInterfaceDeclaration(node)) {
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            return '';
        }
        const name = visit(node.name);
        const typeParams = getTypeParameters(node.typeParameters);
        const extendedInterfaces = [];
        if (node.heritageClauses) {
            for (const clause of node.heritageClauses) {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    for (const type of clause.types) {
                        extendedInterfaces.push(visit(type.expression));
                    }
                }
            }
        }
        const methods = [];
        for (const member of node.members) {
            if (ts.isMethodSignature(member)) {
                const methodName = visit(member.name);
                const params = member.parameters
                    .map((p) => `${visit(p.name)} ${getType(p.type)}`)
                    .join(', ');
                const returnType = member.type ? ` ${getType(member.type)}` : '';
                methods.push(`\t${methodName}(${params})${returnType}`);
            }
        }
        const members = [...extendedInterfaces.map((e) => `\t${e}`), ...methods];
        return `type ${name}${typeParams} interface {\n${members.join('\n')}\n}`;
    }
    else if (ts.isClassDeclaration(node)) {
        if (options.addFunctionOutside) {
            outsideNodes.push(node);
            classNames.add(visit(node.name));
            return '';
        }
        const name = visit(node.name);
        const typeParams = getTypeParameters(node.typeParameters);
        const typeParamNames = getTypeParameterNames(node.typeParameters);
        let parentClass = null;
        if (node.heritageClauses) {
            for (const clause of node.heritageClauses) {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    parentClass = visit(clause.types[0].expression);
                }
            }
        }
        const fields = [];
        if (parentClass) {
            fields.push(`\t${parentClass}`);
        }
        for (const member of node.members) {
            if (ts.isPropertyDeclaration(member)) {
                const fieldName = visit(member.name);
                const fieldType = member.type ? getType(member.type) : 'interface{}';
                fields.push(`\t${fieldName} ${fieldType}`);
            }
        }
        let result = `type ${name}${typeParams} struct {\n${fields.join('\n')}\n}\n\n`;
        const ctor = node.members.find((m) => ts.isConstructorDeclaration(m));
        if (ctor) {
            const params = ctor.parameters.map((p) => `${visit(p.name)} ${getType(p.type)}`).join(', ');
            const bodyStatements = ctor.body?.statements
                .filter((s) => {
                if (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression)) {
                    return s.expression.expression.kind !== ts.SyntaxKind.SuperKeyword;
                }
                return true;
            })
                .map((s) => visit(s))
                .join('\t') ?? '';
            result += `func New${name}${typeParams}(${params}) *${name}${typeParamNames} {\n\t\tself := &${name}${typeParamNames}{}\n\t\t${bodyStatements}return self;\n\t}\n\n`;
        }
        else {
            result += `func New${name}${typeParams}() *${name}${typeParamNames} {\n\t\treturn &${name}${typeParamNames}{}\n\t}\n\n`;
        }
        for (const member of node.members) {
            if (ts.isMethodDeclaration(member)) {
                const methodName = visit(member.name);
                const params = member.parameters
                    .map((p) => `${visit(p.name)} ${getType(p.type)}`)
                    .join(', ');
                const returnType = member.type ? ` ${getType(member.type)}` : '';
                result += `func (self *${name}${typeParamNames}) ${methodName}(${params})${returnType} ${visit(member.body)}\n\n`;
            }
        }
        return result.trim();
    }
    else if (ts.isNewExpression(node)) {
        const className = visit(node.expression);
        if (className === 'Promise') {
            return visitNewPromise(node);
        }
        const typeArgs = getTypeArguments(node.typeArguments);
        const args = node.arguments ? node.arguments.map((a) => visit(a)) : [];
        return `New${className}${typeArgs}(${args.join(', ')})`;
    }
    else if (ts.isObjectLiteralExpression(node)) {
        let typeName = '';
        if (ts.isVariableDeclaration(node.parent) && node.parent.type) {
            typeName = getTypeText(node.parent.type);
        }
        const properties = node.properties
            .map((p) => {
            if (ts.isPropertyAssignment(p)) {
                return `${visit(p.name)}: ${visit(p.initializer)}`;
            }
            return '';
        })
            .filter((p) => p)
            .join(', ');
        return `${typeName}{${properties}}`;
    }
    else if (ts.isPropertyAssignment(node)) {
        return `${visit(node.name)}: ${visit(node.initializer)}`;
    }
    const syntaxKind = ts.SyntaxKind[node.kind];
    if (!['FirstStatement', 'EndOfFileToken'].includes(syntaxKind)) {
        console.log(ts.SyntaxKind[node.kind], node.getText());
    }
    ts.forEachChild(node, (subNode) => {
        code += visit(subNode);
    });
    return code;
}
function getTypeText(typeNode) {
    if (!typeNode)
        return ':';
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        return typeNode.typeName.text;
    }
    return getType(typeNode);
}
function getType(typeNode, getArrayType = false) {
    if (!typeNode)
        return ':';
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const name = typeNode.typeName.text;
        if (name === 'Promise' && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
            return `chan ${getType(typeNode.typeArguments[0])}`;
        }
        const typeArgs = getTypeArguments(typeNode.typeArguments);
        if (classNames.has(name)) {
            return `*${name}${typeArgs}`;
        }
        return `${name}${typeArgs}`;
    }
    const type = TypeCheker.getTypeFromTypeNode(typeNode);
    let typeName = TypeCheker.typeToString(type);
    const isArray = typeName.includes('[]');
    if (isArray) {
        if (getArrayType) {
            typeName = typeName.replace('[]', '');
        }
        else {
            return ':';
        }
    }
    switch (typeName) {
        case 'number':
            return 'float64';
        case 'boolean':
            return 'bool';
        case 'any':
            return ':';
        case 'void':
            return '';
        default:
            return typeName;
    }
}
function getAcessString(leftSide, rightSide) {
    if (rightSide === 'length') {
        return 'float64(len(arr))';
    }
    return `${leftSide}.${rightSide}`;
}
function getCallString(caller, args, typeArgs = '') {
    if (promiseResolveName && caller === promiseResolveName) {
        return `ch <- ${args[0]}`;
    }
    if (caller === 'assert') {
        const message = args.length > 1 ? args[1] : '"Assertion failed"';
        return `if !(${args[0]}) {\n\t\tpanic(${message})\n\t}`;
    }
    if (caller === 'console.log') {
        importedPackages.add('fmt');
        return `fmt.Println(${args.join(', ')})`;
    }
    else if (caller === 'console.time') {
        importedPackages.add('time');
        return `${getTimerName(args[0])} := time.Now()`;
    }
    else if (caller === 'console.timeEnd') {
        importedPackages.add('time');
        importedPackages.add('fmt');
        return `fmt.Println("Elapsed time:", time.Since(${getTimerName(args[0])}))`;
    }
    else if (caller === 'Math.random') {
        importedPackages.add('math/rand');
        return 'rand.Float64()';
    }
    else if (caller === 'Math.floor') {
        importedPackages.add('math');
        return `math.Floor(${args.join(', ')})`;
    }
    else if (caller.endsWith('.push')) {
        const arrayName = caller.substring(0, caller.length - '.push'.length);
        return `${arrayName} = append(${arrayName},${args.join(', ')})`;
    }
    return `${caller}${typeArgs}(${args.join(', ')})`;
}
function getOperatorText(operator) {
    switch (operator) {
        case ts.SyntaxKind.PlusToken:
            return '+';
        case ts.SyntaxKind.MinusToken:
            return '-';
        case ts.SyntaxKind.TildeToken:
            return '~';
        case ts.SyntaxKind.ExclamationToken:
            return '!';
        case ts.SyntaxKind.PlusPlusToken:
            return '++';
        case ts.SyntaxKind.MinusMinusToken:
            return '--';
        default:
            console.error('Did not find operator', operator);
            return '';
    }
}
function getTimerName(name) {
    return `__timer_${name.replaceAll(' ', '_').replaceAll('"', '')}__`;
}
function getTypeParameters(typeParameters) {
    if (!typeParameters || typeParameters.length === 0)
        return '';
    const params = typeParameters.map((tp) => {
        const name = visit(tp.name);
        const constraint = tp.constraint ? getType(tp.constraint) : 'any';
        return `${name} ${constraint}`;
    });
    return `[${params.join(', ')}]`;
}
function getTypeParameterNames(typeParameters) {
    if (!typeParameters || typeParameters.length === 0)
        return '';
    const names = typeParameters.map((tp) => visit(tp.name));
    return `[${names.join(', ')}]`;
}
function getTypeArguments(typeArguments) {
    if (!typeArguments || typeArguments.length === 0)
        return '';
    const args = typeArguments.map((ta) => getType(ta));
    return `[${args.join(', ')}]`;
}
function getPromiseChannelType(node) {
    let parent = node.parent;
    while (parent) {
        if (ts.isFunctionDeclaration(parent) ||
            ts.isMethodDeclaration(parent) ||
            ts.isFunctionExpression(parent)) {
            if (parent.type &&
                ts.isTypeReferenceNode(parent.type) &&
                ts.isIdentifier(parent.type.typeName)) {
                if (parent.type.typeName.text === 'Promise' &&
                    parent.type.typeArguments &&
                    parent.type.typeArguments.length > 0) {
                    return getType(parent.type.typeArguments[0]);
                }
            }
            break;
        }
        parent = parent.parent;
    }
    return 'interface{}';
}
function visitPromiseReturn(node, options) {
    const callback = node.arguments?.[0];
    if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
        return `return ${visit(node)}` + (options.inline ? '' : ';\n\t');
    }
    const channelType = getPromiseChannelType(node);
    const resolveParam = callback.parameters[0];
    const resolveName = resolveParam ? visit(resolveParam.name) : '';
    const prevResolveName = promiseResolveName;
    promiseResolveName = resolveName;
    const body = ts.isBlock(callback.body) ? visit(callback.body) : `{ ${visit(callback.body)} }`;
    promiseResolveName = prevResolveName;
    return (`ch := make(chan ${channelType})\n\t\tgo func() ${body.trimEnd()}()\n\t\treturn ch` +
        (options.inline ? '' : ';\n\t'));
}
function visitNewPromise(node) {
    const callback = node.arguments?.[0];
    if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
        return 'NewPromise()';
    }
    const channelType = getPromiseChannelType(node);
    const resolveParam = callback.parameters[0];
    const resolveName = resolveParam ? visit(resolveParam.name) : '';
    const prevResolveName = promiseResolveName;
    promiseResolveName = resolveName;
    const body = ts.isBlock(callback.body) ? visit(callback.body) : `{ ${visit(callback.body)} }`;
    promiseResolveName = prevResolveName;
    return `func() chan ${channelType} {\n\t\tch := make(chan ${channelType})\n\t\tgo func() ${body.trimEnd()}()\n\t\treturn ch;\n\t}()`;
}
