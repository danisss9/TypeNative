import ts from 'typescript';
import { customAlphabet } from 'nanoid';
const goSafeId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
let TypeCheker;
const importedPackages = new Set();
let outsideNodes = [];
const classNames = new Set();
let promiseResolveName = '';
const dangerousNames = new Set(['main']);
const renamedFunctions = new Map();
const variableTypes = new Map();
export function transpileToNative(code) {
    const sourceFile = ts.createSourceFile('main.ts', code, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
    TypeCheker = ts.createProgram(['main.ts'], {}).getTypeChecker();
    importedPackages.clear();
    outsideNodes = [];
    classNames.clear();
    promiseResolveName = '';
    renamedFunctions.clear();
    variableTypes.clear();
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
        if (node.text === 'undefined')
            return 'nil';
        return getSafeName(node.text);
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
    else if (ts.isToken(node) && node.kind === ts.SyntaxKind.NullKeyword) {
        return `nil`;
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
        const objectType = resolveExpressionType(node.expression);
        return getAcessString(leftSide, rightSide, objectType);
    }
    else if (ts.isVariableDeclaration(node)) {
        const type = getType(node.type);
        // Track variable type for type-aware method dispatch
        if (ts.isIdentifier(node.name)) {
            const cat = node.type ? getTypeCategory(node.type) : undefined;
            if (cat) {
                variableTypes.set(node.name.text, cat);
            }
            else if (node.initializer &&
                ts.isNewExpression(node.initializer) &&
                ts.isIdentifier(node.initializer.expression)) {
                if (classNames.has(node.initializer.expression.text)) {
                    variableTypes.set(node.name.text, 'class');
                }
            }
        }
        let initializer = node.initializer ? `= ${visit(node.initializer)}` : '';
        // Wrap non-nil values assigned to nullable primitive pointer types
        // Only wrap for primitive pointers (*string, *float64, *bool), not class pointers
        if (node.initializer &&
            type.startsWith('*') &&
            !isNilLiteral(node.initializer) &&
            ['*string', '*float64', '*bool'].includes(type)) {
            const value = visit(node.initializer);
            initializer = `= func() ${type} { v := ${value}; return &v }()`;
        }
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
        const safeCaller = getSafeName(caller);
        const typeArgs = getTypeArguments(node.typeArguments);
        const args = node.arguments.map((a) => visit(a));
        // Resolve object type for type-aware method dispatch
        let objectType;
        if (ts.isPropertyAccessExpression(node.expression)) {
            objectType = resolveExpressionType(node.expression.expression);
        }
        return getCallString(safeCaller, args, typeArgs, objectType);
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
        const safeName = getSafeName(name);
        const typeParams = getTypeParameters(node.typeParameters);
        const parameters = node.parameters
            .map((p) => `${visit(p.name)} ${getType(p.type)}`)
            .join(', ');
        const returnType = node.type ? ` ${getType(node.type)}` : '';
        if (options.isOutside) {
            return `func ${safeName}${typeParams}(${parameters})${returnType} ${visit(node.body)}`;
        }
        return `${safeName} := func${typeParams}(${parameters})${returnType} ${visit(node.body)}`;
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
                let fieldType;
                if (member.type && ts.isArrayTypeNode(member.type)) {
                    fieldType = `[]${getType(member.type, true)}`;
                }
                else {
                    fieldType = member.type ? getType(member.type) : 'interface{}';
                }
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
    else if (ts.isNonNullExpression(node)) {
        return visit(node.expression);
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
    // Handle union types (e.g. string | null, number | undefined)
    if (ts.isUnionTypeNode(typeNode)) {
        const nonNullTypes = typeNode.types.filter((t) => t.kind !== ts.SyntaxKind.NullKeyword &&
            t.kind !== ts.SyntaxKind.UndefinedKeyword &&
            !(ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword));
        if (nonNullTypes.length === 1 && nonNullTypes.length < typeNode.types.length) {
            // This is a nullable type T | null or T | undefined
            const innerType = getType(nonNullTypes[0]);
            if (['float64', 'string', 'bool'].includes(innerType)) {
                return `*${innerType}`;
            }
            // Pointer/interface types already support nil
            return innerType;
        }
        // Non-nullable union or multi-type union → interface{}
        return 'interface{}';
    }
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
function getTypeCategory(typeNode) {
    if (!typeNode)
        return undefined;
    if (ts.isArrayTypeNode(typeNode))
        return 'array';
    if (typeNode.kind === ts.SyntaxKind.StringKeyword)
        return 'string';
    if (typeNode.kind === ts.SyntaxKind.NumberKeyword)
        return 'number';
    if (typeNode.kind === ts.SyntaxKind.BooleanKeyword)
        return 'boolean';
    if (ts.isUnionTypeNode(typeNode)) {
        const nonNullTypes = typeNode.types.filter((t) => t.kind !== ts.SyntaxKind.NullKeyword &&
            t.kind !== ts.SyntaxKind.UndefinedKeyword &&
            !(ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword));
        if (nonNullTypes.length === 1)
            return getTypeCategory(nonNullTypes[0]);
    }
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const name = typeNode.typeName.text;
        if (classNames.has(name))
            return 'class';
        return name;
    }
    return undefined;
}
function resolveExpressionType(expr) {
    if (ts.isIdentifier(expr)) {
        return variableTypes.get(expr.text);
    }
    if (expr.kind === ts.SyntaxKind.ThisKeyword) {
        return 'class';
    }
    return undefined;
}
function isNilLiteral(node) {
    if (node.kind === ts.SyntaxKind.NullKeyword)
        return true;
    if (ts.isIdentifier(node) && node.text === 'undefined')
        return true;
    return false;
}
function getAcessString(leftSide, rightSide, objectType) {
    if (rightSide === 'length' && objectType !== 'class') {
        return `float64(len(${leftSide}))`;
    }
    return `${leftSide}.${rightSide}`;
}
const callHandlers = {
    assert: (_caller, args) => {
        const message = args.length > 1 ? args[1] : '"Assertion failed"';
        return `if !(${args[0]}) {\n\t\tpanic(${message})\n\t}`;
    },
    'console.log': (_caller, args) => {
        importedPackages.add('fmt');
        return `fmt.Println(${args.join(', ')})`;
    },
    'console.time': (_caller, args) => {
        importedPackages.add('time');
        return `${getTimerName(args[0])} := time.Now()`;
    },
    'console.timeEnd': (_caller, args) => {
        importedPackages.add('time');
        importedPackages.add('fmt');
        return `fmt.Println("Elapsed time:", time.Since(${getTimerName(args[0])}))`;
    },
    'Math.random': () => {
        importedPackages.add('math/rand');
        return 'rand.Float64()';
    },
    'Math.floor': (_caller, args) => {
        importedPackages.add('math');
        return `math.Floor(${args[0]})`;
    },
    'Math.ceil': (_caller, args) => {
        importedPackages.add('math');
        return `math.Ceil(${args[0]})`;
    },
    'Math.round': (_caller, args) => {
        importedPackages.add('math');
        return `math.Round(${args[0]})`;
    },
    'Math.abs': (_caller, args) => {
        importedPackages.add('math');
        return `math.Abs(${args[0]})`;
    },
    'Math.max': (_caller, args) => {
        importedPackages.add('math');
        return `math.Max(${args[0]}, ${args[1]})`;
    },
    'Math.min': (_caller, args) => {
        importedPackages.add('math');
        return `math.Min(${args[0]}, ${args[1]})`;
    },
    'Math.sqrt': (_caller, args) => {
        importedPackages.add('math');
        return `math.Sqrt(${args[0]})`;
    },
    'Math.pow': (_caller, args) => {
        importedPackages.add('math');
        return `math.Pow(${args[0]}, ${args[1]})`;
    },
    parseInt: (_caller, args) => {
        importedPackages.add('strconv');
        return `func() float64 { v, _ := strconv.Atoi(${args[0]}); return float64(v) }()`;
    },
    parseFloat: (_caller, args) => {
        importedPackages.add('strconv');
        return `func() float64 { v, _ := strconv.ParseFloat(${args[0]}, 64); return v }()`;
    }
};
const stringMethodHandlers = {
    split: (obj, args) => {
        importedPackages.add('strings');
        return `strings.Split(${obj}, ${args[0]})`;
    },
    trim: (obj) => {
        importedPackages.add('strings');
        return `strings.TrimSpace(${obj})`;
    },
    trimStart: (obj) => {
        importedPackages.add('strings');
        return `strings.TrimLeft(${obj}, " \\t\\n\\r")`;
    },
    trimEnd: (obj) => {
        importedPackages.add('strings');
        return `strings.TrimRight(${obj}, " \\t\\n\\r")`;
    },
    toUpperCase: (obj) => {
        importedPackages.add('strings');
        return `strings.ToUpper(${obj})`;
    },
    toLowerCase: (obj) => {
        importedPackages.add('strings');
        return `strings.ToLower(${obj})`;
    },
    indexOf: (obj, args) => {
        importedPackages.add('strings');
        return `float64(strings.Index(${obj}, ${args[0]}))`;
    },
    includes: (obj, args) => {
        importedPackages.add('strings');
        return `strings.Contains(${obj}, ${args[0]})`;
    },
    startsWith: (obj, args) => {
        importedPackages.add('strings');
        return `strings.HasPrefix(${obj}, ${args[0]})`;
    },
    endsWith: (obj, args) => {
        importedPackages.add('strings');
        return `strings.HasSuffix(${obj}, ${args[0]})`;
    },
    replace: (obj, args) => {
        importedPackages.add('strings');
        return `strings.Replace(${obj}, ${args[0]}, ${args[1]}, 1)`;
    },
    replaceAll: (obj, args) => {
        importedPackages.add('strings');
        return `strings.ReplaceAll(${obj}, ${args[0]}, ${args[1]})`;
    },
    repeat: (obj, args) => {
        importedPackages.add('strings');
        return `strings.Repeat(${obj}, int(${args[0]}))`;
    },
    charAt: (obj, args) => `string(${obj}[int(${args[0]})])`,
    substring: (obj, args) => {
        if (args.length >= 2)
            return `${obj}[int(${args[0]}):int(${args[1]})]`;
        return `${obj}[int(${args[0]}):]`;
    },
    slice: (obj, args) => {
        if (args.length >= 2)
            return `${obj}[int(${args[0]}):int(${args[1]})]`;
        return `${obj}[int(${args[0]}):]`;
    },
    concat: (obj, args) => `${obj} + ${args.join(' + ')}`,
    toString: (obj) => {
        importedPackages.add('fmt');
        return `fmt.Sprintf("%v", ${obj})`;
    }
};
const arrayMethodHandlers = {
    push: (obj, args) => `${obj} = append(${obj}, ${args.join(', ')})`,
    join: (obj, args) => {
        importedPackages.add('strings');
        return `strings.Join(${obj}, ${args[0] ?? '""'})`;
    },
    slice: (obj, args) => {
        if (args.length >= 2)
            return `${obj}[int(${args[0]}):int(${args[1]})]`;
        return `${obj}[int(${args[0]}):]`;
    },
    toString: (obj) => {
        importedPackages.add('fmt');
        return `fmt.Sprintf("%v", ${obj})`;
    }
};
function getDynamicCallHandler(caller, objectType) {
    if (promiseResolveName && caller === promiseResolveName) {
        return (_caller, args) => `ch <- ${args[0]}`;
    }
    const dotIndex = caller.lastIndexOf('.');
    if (dotIndex !== -1) {
        const methodName = caller.substring(dotIndex + 1);
        // Class instances use their own methods — never intercept
        if (objectType === 'class')
            return null;
        let handler;
        if (objectType === 'string') {
            handler = stringMethodHandlers[methodName];
        }
        else if (objectType === 'array') {
            handler = arrayMethodHandlers[methodName];
        }
        else {
            // Unknown type: try both maps for backward compatibility
            handler = stringMethodHandlers[methodName] ?? arrayMethodHandlers[methodName];
        }
        if (handler) {
            return (c, args) => {
                const obj = c.substring(0, dotIndex);
                return handler(obj, args);
            };
        }
    }
    return null;
}
function getCallString(caller, args, typeArgs = '', objectType) {
    const handler = callHandlers[caller] ?? getDynamicCallHandler(caller, objectType);
    if (handler) {
        return handler(caller, args, typeArgs);
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
function getSafeName(name) {
    if (!dangerousNames.has(name)) {
        return name;
    }
    if (!renamedFunctions.has(name)) {
        renamedFunctions.set(name, `${name}_${goSafeId()}`);
    }
    return renamedFunctions.get(name);
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
