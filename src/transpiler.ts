import ts from 'typescript';

let TypeCheker: ts.TypeChecker;
const importedPackages = new Set<string>();
let outsideNodes: ts.Node[] = [];
const classNames = new Set<string>();

export function transpileToNative(code: string): string {
  const sourceFile = ts.createSourceFile(
    'main.ts',
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );

  TypeCheker = ts.createProgram(['main.ts'], {}).getTypeChecker();
  importedPackages.clear();
  outsideNodes = [];
  classNames.clear();
  const transpiledCode = visit(sourceFile, { addFunctionOutside: true });
  const transpiledCodeOutside = outsideNodes.map((n) => visit(n, { isOutside: true })).join('\n');

  return `package main

${[...importedPackages].map((pkg) => `import "${pkg}"`).join('\n')}

func main() {
    ${transpiledCode.trim()}
}
 
${transpiledCodeOutside.trim()}`;
}

export function visit(node: ts.Node, options: VisitNodeOptions = {}): string {
  let code: string = '';

  if (ts.isSourceFile(node)) {
    return node.statements
      .map((n) => visit(n, { addFunctionOutside: true }))
      .filter((n) => !!n)
      .join(options.inline ? '' : '\n\t');
  } else if (ts.isIdentifier(node)) {
    return node.text;
  } else if (ts.isStringLiteral(node)) {
    return `"${node.text}"`;
  } else if (ts.isNumericLiteral(node)) {
    return `float64(${node.text})`;
  } else if (ts.isToken(node) && node.kind === ts.SyntaxKind.TrueKeyword) {
    return `true`;
  } else if (ts.isToken(node) && node.kind === ts.SyntaxKind.FalseKeyword) {
    return `false`;
  } else if (ts.isArrayLiteralExpression(node)) {
    const type = ts.isVariableDeclaration(node.parent) ? getType(node.parent.type!, true) : '';
    return `[]${type} {${node.elements.map((e) => visit(e)).join(', ')}}`;
  } else if (ts.isBlock(node)) {
    return `{\n\t\t${node.statements.map((n) => visit(n)).join('\t')}${
      options.extraBlockContent ?? ''
    }}${options.inline ? '' : '\n\t'}`;
  } else if (ts.isElementAccessExpression(node)) {
    return `${visit(node.expression)}[int(${visit(node.argumentExpression)})]`;
  } else if (ts.isPropertyAccessExpression(node)) {
    const leftSide = visit(node.expression);
    const rightSide = visit(node.name);
    return getAcessString(leftSide, rightSide);
  } else if (ts.isVariableDeclaration(node)) {
    const type = getType(node.type!);
    const initializer = node.initializer ? `= ${visit(node.initializer)}` : '';
    return `${type === ':' ? '' : 'var '}${visit(node.name)} ${type}${
      type === ':' ? '' : ' '
    }${initializer}`;
  } else if (ts.isCallExpression(node)) {
    const caller = visit(node.expression);
    const args = node.arguments.map((a) => visit(a));
    return getCallString(caller, args);
  } else if (ts.isPrefixUnaryExpression(node)) {
    return `${getOperatorText(node.operator)}${visit(node.operand)}`;
  } else if (ts.isPostfixUnaryExpression(node)) {
    return `${visit(node.operand, { inline: true })}${getOperatorText(node.operator)}`;
  } else if (ts.isBinaryExpression(node)) {
    let op = node.operatorToken.getText();
    if (op === '===') op = '==';
    if (op === '!==') op = '!=';
    return `${visit(node.left)} ${op} ${visit(node.right)}`;
  } else if (ts.isParenthesizedExpression(node)) {
    return `(${visit(node.expression)})`;
  } else if (ts.isVariableDeclarationList(node)) {
    return (
      node.declarations.map((n) => visit(n)).join(options.inline ? ';' : ';\n\t') +
      (options.inline ? '' : ';\n\t')
    );
  } else if (ts.isExpressionStatement(node)) {
    return visit(node.expression) + (options.inline ? '' : ';\n\t');
  } else if (ts.isForStatement(node)) {
    return `for ${visit(node.initializer!, { inline: true })}; ${visit(node.condition!, {
      inline: true
    })}; ${visit(node.incrementor!, { inline: true })}${visit(node.statement)}`;
  } else if (ts.isForOfStatement(node)) {
    return `for _,${visit(node.initializer, { inline: true })}= range ${visit(node.expression, {
      inline: true
    })}${visit(node.statement)}`;
  } else if (ts.isWhileStatement(node)) {
    return `for ${visit(node.expression, { inline: true })}${visit(node.statement)}`;
  } else if (ts.isDoStatement(node)) {
    const condition = `\tif !(${visit(node.expression, {
      inline: true
    })}) {\n\t\t\tbreak \n\t\t}\n\t`;
    return `for ${visit(node.statement, { inline: true, extraBlockContent: condition })}`;
  } else if (ts.isIfStatement(node)) {
    const condition = `if ${visit(node.expression, { inline: true })} ${visit(node.thenStatement, {
      inline: !!node.elseStatement
    })}`;
    if (node.elseStatement) {
      return `${condition} else ${visit(node.elseStatement)}`;
    }
    return condition;
  } else if (ts.isSwitchStatement(node)) {
    return `switch ${visit(node.expression)} ${visit(node.caseBlock)}`;
  } else if (ts.isCaseBlock(node)) {
    return `{\n\t\t${node.clauses.map((c) => visit(c)).join('\n\t\t')}\n\t}`;
  } else if (ts.isCaseClause(node)) {
    const isFallThrough = !node.statements.some((c) => ts.isBreakStatement(c));
    return `case ${visit(node.expression, { inline: true })}: \n\t\t\t${node.statements
      .filter((n) => !ts.isBreakStatement(n))
      .map((s) => visit(s))
      .join('')}${isFallThrough ? 'fallthrough\n\t' : ''}`;
  } else if (ts.isDefaultClause(node)) {
    return `default: \n\t\t\t${node.statements
      .filter((n) => !ts.isBreakStatement(n))
      .map((s) => visit(s))
      .join('')}`;
  } else if (ts.isBreakStatement(node)) {
    return 'break';
  } else if (ts.isReturnStatement(node)) {
    return (
      `return ${node.expression ? visit(node.expression) : ''}` + (options.inline ? '' : ';\n\t')
    );
  } else if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      return '';
    }

    const name = visit(node.name!, { inline: true });
    const parameters = node.parameters
      .map((p) => `${visit(p.name)} ${getType(p.type!)}`)
      .join(', ');
    const returnType = node.type ? ` ${getType(node.type)}` : '';

    if (options.isOutside) {
      return `func ${name}(${parameters})${returnType} ${visit(node.body!)}`;
    }

    return `${name} := func(${parameters})${returnType} ${visit(node.body!)}`;
  } else if (ts.isArrowFunction(node)) {
    const parameters = node.parameters
      .map((p) => `${visit(p.name)} ${getType(p.type!)}`)
      .join(', ');
    const returnType = node.type ? ` ${getType(node.type)}` : '';
    return `func(${parameters})${returnType} ${visit(node.body!)}`;
  } else if (node.kind === ts.SyntaxKind.ThisKeyword) {
    return 'self';
  } else if (ts.isInterfaceDeclaration(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      return '';
    }

    const name = visit(node.name);

    const extendedInterfaces: string[] = [];
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          for (const type of clause.types) {
            extendedInterfaces.push(visit(type.expression));
          }
        }
      }
    }

    const methods: string[] = [];
    for (const member of node.members) {
      if (ts.isMethodSignature(member)) {
        const methodName = visit(member.name);
        const params = member.parameters
          .map((p) => `${visit(p.name)} ${getType(p.type!)}`)
          .join(', ');
        const returnType = member.type ? ` ${getType(member.type)}` : '';
        methods.push(`\t${methodName}(${params})${returnType}`);
      }
    }

    const members = [...extendedInterfaces.map((e) => `\t${e}`), ...methods];

    return `type ${name} interface {\n${members.join('\n')}\n}`;
  } else if (ts.isClassDeclaration(node)) {
    if (options.addFunctionOutside) {
      outsideNodes.push(node);
      classNames.add(visit(node.name!));
      return '';
    }

    const name = visit(node.name!);

    let parentClass: string | null = null;
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          parentClass = visit(clause.types[0].expression);
        }
      }
    }

    const fields: string[] = [];
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

    let result = `type ${name} struct {\n${fields.join('\n')}\n}\n\n`;

    const ctor = node.members.find((m) => ts.isConstructorDeclaration(m)) as
      | ts.ConstructorDeclaration
      | undefined;
    if (ctor) {
      const params = ctor.parameters.map((p) => `${visit(p.name)} ${getType(p.type!)}`).join(', ');

      const bodyStatements =
        ctor.body?.statements
          .filter((s) => {
            if (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression)) {
              return s.expression.expression.kind !== ts.SyntaxKind.SuperKeyword;
            }
            return true;
          })
          .map((s) => visit(s))
          .join('\t') ?? '';

      result += `func New${name}(${params}) *${name} {\n\t\tself := &${name}{}\n\t\t${bodyStatements}return self;\n\t}\n\n`;
    } else {
      result += `func New${name}() *${name} {\n\t\treturn &${name}{}\n\t}\n\n`;
    }

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member)) {
        const methodName = visit(member.name);
        const params = member.parameters
          .map((p) => `${visit(p.name)} ${getType(p.type!)}`)
          .join(', ');
        const returnType = member.type ? ` ${getType(member.type)}` : '';
        result += `func (self *${name}) ${methodName}(${params})${returnType} ${visit(member.body!)}\n\n`;
      }
    }

    return result.trim();
  } else if (ts.isNewExpression(node)) {
    const className = visit(node.expression);
    const args = node.arguments ? node.arguments.map((a) => visit(a)) : [];
    return `New${className}(${args.join(', ')})`;
  } else if (ts.isObjectLiteralExpression(node)) {
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
  } else if (ts.isPropertyAssignment(node)) {
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

export type VisitNodeOptions = {
  inline?: boolean;
  extraBlockContent?: string;
  addFunctionOutside?: boolean;
  isOutside?: boolean;
};

function getTypeText(typeNode: ts.TypeNode): string {
  if (!typeNode) return ':';
  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    return typeNode.typeName.text;
  }
  return getType(typeNode);
}

function getType(typeNode: ts.TypeNode, getArrayType = false): string {
  if (!typeNode) return ':';
  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text;
    if (classNames.has(name)) {
      return `*${name}`;
    }
    return name;
  }

  const type = TypeCheker.getTypeFromTypeNode(typeNode);
  let typeName = TypeCheker.typeToString(type);
  const isArray = typeName.includes('[]');

  if (isArray) {
    if (getArrayType) {
      typeName = typeName.replace('[]', '');
    } else {
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

function getAcessString(leftSide: string, rightSide: string): string {
  if (rightSide === 'length') {
    return 'float64(len(arr))';
  }

  return `${leftSide}.${rightSide}`;
}

function getCallString(caller: string, args: string[]): string {
  if (caller === 'console.log') {
    importedPackages.add('fmt');
    return `fmt.Println(${args.join(', ')})`;
  } else if (caller === 'console.time') {
    importedPackages.add('time');
    return `${getTimerName(args[0])} := time.Now()`;
  } else if (caller === 'console.timeEnd') {
    importedPackages.add('time');
    importedPackages.add('fmt');
    return `fmt.Println("Elapsed time:", time.Since(${getTimerName(args[0])}))`;
  } else if (caller === 'Math.random') {
    importedPackages.add('math/rand');
    return 'rand.Float64()';
  } else if (caller === 'Math.floor') {
    importedPackages.add('math');
    return `math.Floor(${args.join(', ')})`;
  } else if (caller.endsWith('.push')) {
    const arrayName = caller.substring(0, caller.length - '.push'.length);
    return `${arrayName} = append(${arrayName},${args.join(', ')})`;
  }

  return `${caller}(${args.join(', ')})`;
}

function getOperatorText(operator: ts.PrefixUnaryOperator | ts.PostfixUnaryExpression): string {
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

function getTimerName(name: string): string {
  return `__timer_${name.replaceAll(' ', '_').replaceAll('"', '')}__`;
}
