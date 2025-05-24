import ts from 'typescript';

let TypeCheker: ts.TypeChecker;
let importedPackages = new Set<string>();

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
  const transpiledCode = visit(sourceFile);

  return `package main

${[...importedPackages].map((pkg) => `import "${pkg}"`).join('\n')}

func main() {
    ${transpiledCode.trim()}
}`;
}

export function visit(node: ts.Node, inline = false, extraBlockContent: string = ''): string {
  let code: string = '';

  if (ts.isIdentifier(node)) {
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
    return `{\n\t\t${node.statements.map((n) => visit(n)).join('\t')}${extraBlockContent}}${
      inline ? '' : '\n\t'
    }`;
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
    return `${visit(node.operand, true)}${getOperatorText(node.operator)}`;
  } else if (ts.isBinaryExpression(node)) {
    return `${visit(node.left)} ${node.operatorToken.getText()} ${visit(node.right)}`;
  } else if (ts.isParenthesizedExpression(node)) {
    return `(${visit(node.expression)})`;
  } else if (ts.isVariableDeclarationList(node)) {
    return (
      node.declarations.map((n) => visit(n)).join(inline ? ';' : ';\n\t') + (inline ? '' : ';\n\t')
    );
  } else if (ts.isExpressionStatement(node)) {
    return visit(node.expression) + (inline ? '' : ';\n\t');
  } else if (ts.isForStatement(node)) {
    return `for ${visit(node.initializer!, true)}; ${visit(node.condition!, true)}; ${visit(
      node.incrementor!,
      true
    )}${visit(node.statement)}`;
  } else if (ts.isForOfStatement(node)) {
    return `for _,${visit(node.initializer, true)}= range ${visit(node.expression, true)}${visit(
      node.statement
    )}`;
  } else if (ts.isWhileStatement(node)) {
    return `for ${visit(node.expression, true)}${visit(node.statement)}`;
  } else if (ts.isDoStatement(node)) {
    const condition = `\tif !(${visit(node.expression, true)}) {\n\t\t\tbreak \n\t\t}\n\t`;
    return `for ${visit(node.statement, false, condition)}`;
  } else if (ts.isIfStatement(node)) {
    const condition = `if ${visit(node.expression, true)} ${visit(
      node.thenStatement,
      !!node.elseStatement
    )}`;
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
    return `case ${visit(node.expression, true)}: \n\t\t\t${node.statements
      .map((s) => visit(s))
      .join('')}${isFallThrough ? 'fallthrough\n\t' : ''}`;
  } else if (ts.isDefaultClause(node)) {
    return `default: \n\t\t\t${node.statements.map((s) => visit(s)).join('')}`;
  } else if (ts.isBreakStatement(node)) {
    return '';
  }

  const syntaxKind = ts.SyntaxKind[node.kind];
  if (!['SourceFile', 'FirstStatement', 'EndOfFileToken'].includes(syntaxKind)) {
    console.log(ts.SyntaxKind[node.kind], node.getText());
  }

  ts.forEachChild(node, (subNode) => {
    code += visit(subNode);
    return null;
  });

  return code;
}

function getType(typeNode: ts.TypeNode, getArrayType = false): string {
  const type = TypeCheker.getTypeFromTypeNode(typeNode);
  let typeName = TypeCheker.typeToString(type);
  const isArray = typeNode?.kind & ts.SyntaxKind.ArrayType;

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
