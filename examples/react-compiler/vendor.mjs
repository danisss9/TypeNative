// Re-creates vendor/ from the pinned upstream sources.
//
// Fetches the React Compiler (facebook/react
// compiler/packages/babel-plugin-react-compiler/src), the Babel packages it
// runs on (@babel/parser, types, traverse, generator, template, code-frame and
// their helpers, from babel/babel at the v7.29.13 tag), zod 4 and
// zod-validation-error 4, and the small packages those import, into
// .cache/upstream/. It then copies every file reachable from main.ts's entry
// modules into vendor/ with mechanical edits only:
//
//   * relative import specifiers carry their file extension
//     (`'../HIR'` -> `'../HIR/index.ts'`), and package specifiers point at
//     the vendored copy (`'@babel/types'` -> `'../../types/src/index.ts'`);
//   * Babel's build-time constants are folded the way Babel's own build
//     folds them for its Babel 7 CommonJS release: `process.env.BABEL_8_BREAKING`,
//     `USE_ESM` and `IS_STANDALONE` become `false`, `PACKAGE_JSON.version`
//     becomes the package's version, and conditional imports
//     (`import x from "..." with { if: "..." }`, whose condition is true in
//     that build) lose their `with` clause;
//   * Babel's `@bit` class-field decorators become the getters and setters
//     over one flags field that Babel's build plugin
//     (scripts/babel-plugin-bit-decorator) turns them into, and
//     @babel/generator's `__node("Type")` macro becomes the generator's
//     index and `this.token("x")` of one character `this.tokenChar(120)`, as
//     its build (`pluginGeneratorOptimization`) does: the printer tracks the
//     last character it wrote only on the tokenChar() path.
//
// No other line of upstream code changes. Three packages are replaced by
// hand-written stubs in vendor/stubs/ (kept as they are; see the comments
// there): `debug` and `pretty-format`, which the compiler and Babel only reach
// on debug-logging paths, and `@babel/core`, of which the compiler uses the
// `NodePath` class, plugin types and a test helper's `transformFromAstSync`. js-tokens@4 ships no declarations, so
// vendor/stubs/js-tokens.d.ts declares the parts Babel uses.
//
// Usage:  node vendor.mjs

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const ts = createRequire(path.join(repoRoot, 'package.json'))('typescript');
const upstream = path.join(here, '.cache', 'upstream');
const vendor = path.join(here, 'vendor');

const REACT_COMMIT = '76baa3b5434fad315ece9cfd4d20d7a8d6c34a25';
const BABEL_TAG = 'v7.29.13';
const BABEL_VERSION = '7.29.13';
const ZOD_VALIDATION_ERROR_TAG = 'v4.0.2';
const RESOLVE_URI_TAG = 'v3.1.2';
const NPM = [
  'zod@4.1.12',
  'charcodes@0.2.1',
  'jsesc@3.1.0',
  '@types/jsesc@3.0.3',
  'picocolors@1.1.1',
  'js-tokens@4.0.0',
  'invariant@2.2.4',
  '@types/invariant@2.2.37',
  '@jridgewell/gen-mapping@0.3.13',
  '@jridgewell/trace-mapping@0.3.31',
  '@jridgewell/sourcemap-codec@1.6.0',
];
const BABEL_PACKAGES = [
  'parser',
  'types',
  'traverse',
  'generator',
  'template',
  'code-frame',
  'helper-string-parser',
  'helper-validator-identifier',
  'helper-globals',
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed`);
    process.exit(1);
  }
}

// A sparse, blobless checkout of `paths` of a repository at `ref`
function fetchGit(name, url, ref, paths) {
  const dir = path.join(upstream, name);
  if (fs.existsSync(path.join(dir, '.done'))) return dir;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Fetching ${url} ${ref} ...`);
  const git = (...args) => run('git', ['-C', dir, ...args]);
  git('init', '--quiet');
  git('remote', 'add', 'origin', url);
  git('sparse-checkout', 'set', '--no-cone', ...paths);
  git('fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', ref);
  git('checkout', '--quiet', 'FETCH_HEAD');
  fs.writeFileSync(path.join(dir, '.done'), '');
  return dir;
}

// An npm package tarball, unpacked (no install scripts run)
function fetchNpm(spec) {
  const dir = path.join(upstream, 'npm', spec.replace('/', '__'));
  // (the tarball's single top-level directory: `package/`, or the package's
  // name for @types packages)
  const unpacked = () => path.join(dir, fs.readdirSync(dir).find((e) => !e.startsWith('.')));
  if (fs.existsSync(path.join(dir, '.done'))) return unpacked();
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Fetching ${spec} from npm ...`);
  const result = spawnSync('npm', ['pack', '--silent', '--ignore-scripts', spec], {
    cwd: dir,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(1);
  }
  const tarball = result.stdout.trim().split('\n').pop();
  run('tar', ['xzf', tarball], { cwd: dir });
  fs.rmSync(path.join(dir, tarball));
  fs.writeFileSync(path.join(dir, '.done'), '');
  return unpacked();
}

const react = fetchGit('react', 'https://github.com/facebook/react.git', REACT_COMMIT, [
  '/compiler/packages/babel-plugin-react-compiler/src/',
  '/LICENSE',
]);
const babel = fetchGit('babel', 'https://github.com/babel/babel.git', `refs/tags/${BABEL_TAG}`, [
  ...BABEL_PACKAGES.map((p) => `/packages/babel-${p}/`),
  '/LICENSE',
]);
const zve = fetchGit(
  'zod-validation-error',
  'https://github.com/causaly/zod-validation-error.git',
  `refs/tags/${ZOD_VALIDATION_ERROR_TAG}`,
  ['/lib/', '/LICENSE'],
);
const resolveUri = fetchGit('resolve-uri', 'https://github.com/jridgewell/resolve-uri.git', `refs/tags/${RESOLVE_URI_TAG}`, [
  '/src/',
  '/LICENSE',
]);
const npm = Object.fromEntries(NPM.map((spec) => [spec.slice(0, spec.lastIndexOf('@')), fetchNpm(spec)]));

// Upstream directory -> vendor directory. Every vendored file lives under one
// of these roots, at the same relative path.
const roots = [
  { from: path.join(react, 'compiler/packages/babel-plugin-react-compiler/src'), to: 'react-compiler/src' },
  ...BABEL_PACKAGES.map((p) => ({ from: path.join(babel, `packages/babel-${p}`), to: `babel/${p}`, babel: p })),
  { from: path.join(npm['zod'], 'src'), to: 'zod/src' },
  { from: path.join(zve, 'lib'), to: 'zod-validation-error/lib' },
  { from: path.join(resolveUri, 'src'), to: 'jridgewell/resolve-uri/src' },
  { from: path.join(npm['@jridgewell/gen-mapping'], 'src'), to: 'jridgewell/gen-mapping/src' },
  { from: path.join(npm['@jridgewell/trace-mapping'], 'src'), to: 'jridgewell/trace-mapping/src' },
  { from: path.join(npm['@jridgewell/sourcemap-codec'], 'src'), to: 'jridgewell/sourcemap-codec/src' },
  { from: path.join(npm['charcodes'], 'src'), to: 'charcodes/src' },
  { from: npm['jsesc'], to: 'jsesc' },
  { from: npm['@types/jsesc'], to: 'jsesc/types' },
  { from: npm['picocolors'], to: 'picocolors' },
  { from: npm['js-tokens'], to: 'js-tokens' },
  { from: npm['invariant'], to: 'invariant' },
  { from: npm['@types/invariant'], to: 'invariant/types' },
  { from: path.join(vendor, 'stubs'), to: 'stubs' },
];

// Package specifiers -> the upstream file that stands for them
const packages = {
  '@babel/parser': path.join(babel, 'packages/babel-parser/src/index.ts'),
  '@babel/types': path.join(babel, 'packages/babel-types/src/index.ts'),
  '@babel/traverse': path.join(babel, 'packages/babel-traverse/src/index.ts'),
  '@babel/generator': path.join(babel, 'packages/babel-generator/src/index.ts'),
  '@babel/template': path.join(babel, 'packages/babel-template/src/index.ts'),
  '@babel/code-frame': path.join(babel, 'packages/babel-code-frame/src/index.ts'),
  '@babel/helper-string-parser': path.join(babel, 'packages/babel-helper-string-parser/src/index.ts'),
  '@babel/helper-validator-identifier': path.join(babel, 'packages/babel-helper-validator-identifier/src/index.ts'),
  '@babel/helper-globals/data/builtin-lower.json': path.join(babel, 'packages/babel-helper-globals/data/builtin-lower.json'),
  '@babel/helper-globals/data/builtin-upper.json': path.join(babel, 'packages/babel-helper-globals/data/builtin-upper.json'),
  'zod/v4': path.join(npm['zod'], 'src/v4/classic/index.ts'),
  'zod/v4/core': path.join(npm['zod'], 'src/v4/core/index.ts'),
  'zod-validation-error/v4': path.join(zve, 'lib/v4/index.ts'),
  '@jridgewell/resolve-uri': path.join(resolveUri, 'src/resolve-uri.ts'),
  '@jridgewell/gen-mapping': path.join(npm['@jridgewell/gen-mapping'], 'src/gen-mapping.ts'),
  '@jridgewell/trace-mapping': path.join(npm['@jridgewell/trace-mapping'], 'src/trace-mapping.ts'),
  '@jridgewell/sourcemap-codec': path.join(npm['@jridgewell/sourcemap-codec'], 'src/sourcemap-codec.ts'),
  'charcodes': path.join(npm['charcodes'], 'src/index.js'),
  'jsesc': path.join(npm['jsesc'], 'jsesc.js'),
  'picocolors': path.join(npm['picocolors'], 'picocolors.js'),
  'picocolors/types': path.join(npm['picocolors'], 'types.d.ts'),
  'js-tokens': path.join(npm['js-tokens'], 'index.js'),
  'invariant': path.join(npm['invariant'], 'invariant.js'),
  '@babel/core': path.join(vendor, 'stubs', 'babel-core.ts'),
  'debug': path.join(vendor, 'stubs', 'debug.ts'),
  'pretty-format': path.join(vendor, 'stubs', 'pretty-format.ts'),
};

// CommonJS files are vendored as .cjs (Node then loads them as CommonJS
// whatever the nearest package.json says), each with its declarations
// beside it as .d.cts
const commonJs = new Map([
  [path.join(npm['jsesc'], 'jsesc.js'), path.join(npm['@types/jsesc'], 'index.d.ts')],
  [path.join(npm['picocolors'], 'picocolors.js'), path.join(npm['picocolors'], 'picocolors.d.ts')],
  [path.join(npm['js-tokens'], 'index.js'), path.join(vendor, 'stubs', 'js-tokens.d.ts')],
  [path.join(npm['invariant'], 'invariant.js'), path.join(npm['@types/invariant'], 'index.d.ts')],
]);

// The modules main.ts imports
const entries = [
  path.join(react, 'compiler/packages/babel-plugin-react-compiler/src/Entrypoint/index.ts'),
  path.join(react, 'compiler/packages/babel-plugin-react-compiler/src/CompilerError.ts'),
  path.join(react, 'compiler/packages/babel-plugin-react-compiler/src/Utils/TestUtils.ts'),
  packages['@babel/parser'],
  packages['@babel/traverse'],
  packages['@babel/generator'],
  packages['@babel/types'],
];

// Node built-ins keep their specifier
const builtins = new Set(['crypto', 'node:crypto', 'node:util', 'util', 'fs', 'path']);

function rootOf(file) {
  const root = roots.find((r) => file === r.from || file.startsWith(r.from + path.sep));
  if (!root) throw new Error(`not under a vendored root: ${file}`);
  return root;
}

// charcodes' source is Flow whose every line (`export const tab: 9 = 9;`) is
// also TypeScript: vendored as .ts
const flowAsTs = new Set([packages['charcodes']]);

function destination(file) {
  const root = rootOf(file);
  let rel = path.relative(root.from, file);
  if (commonJs.has(file)) rel = rel.replace(/\.js$/, '.cjs');
  if (flowAsTs.has(file)) rel = rel.replace(/\.js$/, '.ts');
  return path.join(vendor, root.to, rel);
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// The upstream file that becomes `vendored` (a path in vendor/)
function upstreamOf(vendored) {
  for (const root of roots) {
    const base = path.join(vendor, root.to);
    if (root.to === 'stubs' || !vendored.startsWith(base + path.sep)) continue;
    const rel = path.relative(base, vendored);
    for (const candidate of [rel, rel.replace(/\.cjs$/, '.js'), rel.replace(/\.ts$/, '.js')]) {
      const file = path.join(root.from, candidate);
      if (isFile(file)) return file;
    }
  }
  return null;
}

// The upstream file a specifier in `from` refers to
function resolve(specifier, from) {
  // The stubs import vendored files by their vendor/ paths
  if (specifier.startsWith('.') && rootOf(from).to === 'stubs') {
    const target = path.resolve(path.dirname(from), specifier);
    const found = target.startsWith(path.join(vendor, 'stubs') + path.sep) ? target : upstreamOf(target);
    if (!found) throw new Error(`cannot resolve ${specifier} from ${from}`);
    return found;
  }
  if (specifier.startsWith('.')) {
    const base = path.resolve(path.dirname(from), specifier);
    const candidates = [
      base,
      base + '.ts',
      base + '.tsx',
      base.replace(/\.js$/, '.ts'),
      base + '.d.ts',
      base.replace(/\.ts$/, '.d.ts'),
      base.replace(/\.d\.ts$/, '.ts'),
      path.join(base, 'index.ts'),
    ];
    const found = candidates.find(isFile);
    if (!found) throw new Error(`cannot resolve ${specifier} from ${from}`);
    return found;
  }
  if (packages[specifier]) return packages[specifier];
  return null;
}

function relativeSpecifier(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// The module specifiers of a source file, with their positions
function specifiers(source) {
  const found = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      found.push(node.moduleSpecifier);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      found.push(node.argument.literal);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      found.push(node.arguments[0]);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      found.push(node.moduleReference.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

// Babel's @bit decorators (scripts/babel-plugin-bit-decorator/plugin.cjs):
// `@bit.storage flags: number = 0` holds the bits, and each
// `@bit accessor name = false` (or `@bit(MASK)`, which must name the next
// bit) becomes a getter and setter of the next bit. The storage field starts
// with the bits of the accessors initialized to true. The `declare const bit`
// that types the decorator goes, like every other declaration after type
// stripping.
function bitDecorators(source, text) {
  const edits = [];
  const visit = (node) => {
    if (ts.isVariableStatement(node) && node.getText(source).startsWith('declare const bit:')) {
      edits.push({ start: node.getStart(source), end: node.getEnd(), text: '' });
      return;
    }
    if (ts.isClassLike(node)) {
      let storage = null;
      let initial = 0;
      let mask = 1;
      const accessors = [];
      for (const member of node.members) {
        const decorators = (ts.canHaveDecorators(member) && ts.getDecorators(member)) || [];
        for (const decorator of decorators) {
          const expr = decorator.expression.getText(source);
          if (expr === 'bit.storage') {
            storage = { member, decorator };
          } else if (expr === 'bit' || expr.startsWith('bit(')) {
            const value = member.initializer.getText(source);
            if (value !== 'true' && value !== 'false') throw new Error(`@bit field ${member.name.getText(source)} needs a boolean`);
            if (value === 'true') initial |= mask;
            accessors.push({ member, mask });
            mask <<= 1;
          }
        }
      }
      if (accessors.length > 0) {
        if (!storage) throw new Error('@bit without @bit.storage');
        const name = storage.member.name.getText(source);
        // drop `@bit.storage ` and set the initial bits
        let end = storage.decorator.getEnd();
        while (/\s/.test(text[end])) end++;
        edits.push({ start: storage.decorator.getStart(source), end, text: '' });
        const init = storage.member.initializer;
        edits.push({ start: init.getStart(source), end: init.getEnd(), text: String(initial) });
        let indent = '';
        for (let i = storage.member.getStart(source) - 1; i >= 0 && text[i] === ' '; i--) indent += ' ';
        for (const { member, mask } of accessors) {
          const key = member.name.getText(source);
          const replacement =
            `get ${key}() {\n${indent}  return (this.${name} & ${mask}) > 0;\n${indent}}\n` +
            `${indent}set ${key}(v) {\n${indent}  if (v) this.${name} |= ${mask};\n${indent}  else this.${name} &= ${~mask};\n${indent}}`;
          edits.push({ start: member.getStart(source), end: member.getEnd(), text: replacement });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return edits;
}

// Babel's build-time flags (scripts/babel-plugin-toggle-boolean-flag), with
// the values of its Babel 7 ES-module build. Like that plugin, the pass folds
// every `if`, `?:`, `&&` and `||` whose outcome the flags decide (an `if`
// becomes the statements of the branch taken, or goes), and a conditional
// import (`with { if: "..." }`) loses its condition when it holds and is
// removed when it doesn't. Flags left anywhere else are an error, as there.
const FLAGS = new Map([
  ['USE_ESM', true],
  ['IS_STANDALONE', false],
  ['process.env.BABEL_8_BREAKING', false],
]);

function unparen(node) {
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  return node;
}

function flagName(node, source) {
  if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
    const name = node.getText(source);
    if (FLAGS.has(name)) return name;
  }
  return null;
}

// The plugin's evaluate(): { value } when the flags decide the test,
// { text } when they simplify it to `text`, { unrelated } otherwise
function evaluate(node, source) {
  node = unparen(node);
  const unrelated = { unrelated: true, text: node.getText(source), compound: true };
  const name = flagName(node, source);
  if (name) return { value: FLAGS.get(name) };
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    const arg = evaluate(node.operand, source);
    if (arg.unrelated) return unrelated;
    if (arg.text !== undefined) return { text: arg.compound ? `!(${arg.text})` : `!${arg.text}` };
    return { value: !arg.value };
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.AmpersandAmpersandToken) {
      const or = op === ts.SyntaxKind.BarBarToken;
      const left = evaluate(node.left, source);
      const right = evaluate(node.right, source);
      if (or) {
        if (left.value === true || right.value === true) return { value: true };
        if (left.value === false && right.value === false) return { value: false };
        if (left.value === false) return right.unrelated ? { text: right.text, compound: true } : right;
        if (right.value === false) return left.unrelated ? { text: left.text, compound: true } : left;
      } else {
        if (left.value === true && right.value === true) return { value: true };
        if (left.value === false || right.value === false) return { value: false };
        if (left.value === true) return right.unrelated ? { text: right.text, compound: true } : right;
        if (right.value === true) return left.unrelated ? { text: left.text, compound: true } : left;
      }
      if (left.unrelated && right.unrelated) return unrelated;
      const wrap = (r) => (r.compound ? `(${r.text})` : r.text);
      return { text: `${wrap(left)} ${or ? '||' : '&&'} ${wrap(right)}`, compound: true };
    }
  }
  return unrelated;
}

// One pass of folding, outermost tests first; null when nothing changed
function foldFlags(text) {
  const source = ts.createSourceFile('x.ts', text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const edits = [];
  const visit = (node) => {
    if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
      const test = ts.isIfStatement(node) ? node.expression : node.condition;
      const res = evaluate(test, source);
      if (!res.unrelated) {
        if (res.text !== undefined) {
          // (the branches are folded, the test isn't visited again)
          edits.push({ start: test.getStart(source), end: test.getEnd(), text: res.text });
          for (const branch of ts.isIfStatement(node)
            ? [node.thenStatement, node.elseStatement]
            : [node.whenTrue, node.whenFalse]) {
            if (branch) visit(branch);
          }
          return;
        } else if (ts.isIfStatement(node)) {
          const branch = res.value ? node.thenStatement : node.elseStatement;
          let replacement = '';
          if (branch && ts.isBlock(branch)) {
            replacement = text.slice(branch.getStart(source) + 1, branch.getEnd() - 1);
            // (an `else if` taking several statements keeps its braces)
            if (ts.isIfStatement(node.parent) && node.parent.elseStatement === node) replacement = `{${replacement}}`;
          } else if (branch) {
            replacement = branch.getText(source);
          }
          edits.push({ start: node.getStart(source), end: node.getEnd(), text: replacement });
          return;
        } else {
          const branch = res.value ? node.whenTrue : node.whenFalse;
          edits.push({ start: node.getStart(source), end: node.getEnd(), text: `(${branch.getText(source)})` });
          return;
        }
      }
    } else if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
    ) {
      const res = evaluate(node, source);
      if (!res.unrelated) {
        const replacement = res.text !== undefined ? (res.compound ? `(${res.text})` : res.text) : String(res.value);
        edits.push({ start: node.getStart(source), end: node.getEnd(), text: replacement });
        return;
      }
    } else if (ts.isImportDeclaration(node) && node.attributes) {
      const attr = node.attributes.elements.find((e) => e.name.text === 'if');
      if (attr) {
        const condition = ts.createSourceFile('c.ts', `(${attr.value.text})`, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
        const res = evaluate(condition.statements[0].expression, condition);
        if (res.value === true) {
          if (node.attributes.elements.length !== 1) throw new Error('unexpected import attributes');
          let start = node.attributes.getStart(source);
          while (start > 0 && /\s/.test(text[start - 1])) start--;
          edits.push({ start, end: node.attributes.getEnd(), text: '' });
        } else if (res.value === false) {
          edits.push({ start: node.getStart(source), end: node.getEnd(), text: '' });
        } else {
          throw new Error(`cannot evaluate import condition ${attr.value.text}`);
        }
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return edits.length > 0 ? applyEdits(text, edits) : null;
}

function applyEdits(text, edits) {
  edits.sort((a, b) => b.start - a.start);
  let out = text;
  for (const edit of edits) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  return out;
}

// @babel/generator's `__node("Type")`: the index of the node type among the
// sorted names that the generators/*.ts files (but deprecated.ts) export, as
// pluginGeneratorOptimization in Babel's babel.config.js computes it
let generatorNames = null;
function nodeIndex(type) {
  if (!generatorNames) {
    generatorNames = [];
    const dir = path.join(babel, 'packages/babel-generator/src/generators');
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'deprecated.ts')) {
      const file = path.join(dir, name);
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf-8'), ts.ScriptTarget.ESNext, true);
      const visit = (node) => {
        let exported;
        if (ts.isExportSpecifier(node)) exported = node.name.text;
        else if (
          ts.isFunctionDeclaration(node) &&
          node.name &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          exported = node.name.text;
        }
        if (exported && !exported.startsWith('_')) generatorNames.push(exported);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    generatorNames.sort();
  }
  const index = generatorNames.indexOf(type);
  if (index === -1) throw new Error(`Unknown generator type: ${type}`);
  return index;
}

// Babel's build of one source file: @bit decorators, flags, PACKAGE_JSON,
// __node()
function babelBuild(file, text) {
  const generator = file.startsWith(path.join(babel, 'packages/babel-generator/src') + path.sep);
  let source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  text = applyEdits(text, bitDecorators(source, text));
  for (let folded; (folded = foldFlags(text)) !== null; ) text = folded;
  source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const edits = [];
  const visit = (node) => {
    const name = flagName(node, source);
    if (name) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      throw new Error(`${file}:${line + 1}: ${name} could not be stripped`);
    }
    if (ts.isPropertyAccessExpression(node) && node.getText(source) === 'PACKAGE_JSON.version') {
      edits.push({ start: node.getStart(source), end: node.getEnd(), text: JSON.stringify(BABEL_VERSION) });
      return;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === '__node' &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      edits.push({ start: node.getStart(source), end: node.getEnd(), text: String(nodeIndex(node.arguments[0].text)) });
      return;
    }
    if (
      generator &&
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      node.expression.name.text === 'token' &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.length === 1
    ) {
      const name = node.expression.name;
      const arg = node.arguments[0];
      edits.push({ start: name.getStart(source), end: name.getEnd(), text: 'tokenChar' });
      edits.push({ start: arg.getStart(source), end: arg.getEnd(), text: String(arg.text.charCodeAt(0)) });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return applyEdits(text, edits);
}

const done = new Map();
const missing = new Set();
const queue = [...entries];

function vendorFile(file) {
  if (done.has(file)) return;
  const dest = destination(file);
  done.set(file, dest);
  let text = fs.readFileSync(file, 'utf-8');
  if (file.endsWith('.json')) {
    write(dest, text);
    return;
  }
  if (file.endsWith('.js') && !flowAsTs.has(file)) {
    // CommonJS: vendored as is; its declarations sit beside it
    write(dest, text);
    const declarations = commonJs.get(file);
    if (declarations) {
      write(dest.replace(/\.cjs$/, '.d.cts'), fs.readFileSync(declarations, 'utf-8'));
    }
    return;
  }
  if (rootOf(file).babel !== undefined) text = babelBuild(file, text);
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const edits = [];
  const found = specifiers(source);
  for (const literal of found) {
    const target = resolve(literal.text, file);
    if (target === null) {
      if (!builtins.has(literal.text)) missing.add(`${literal.text} (${path.relative(upstream, file)})`);
      continue;
    }
    queue.push(target);
    const quote = text[literal.getStart(source)];
    edits.push({
      start: literal.getStart(source),
      end: literal.getEnd(),
      text: quote + relativeSpecifier(dest, destination(target)) + quote,
    });
  }
  write(dest, applyEdits(text, edits));
}

function write(dest, content) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

// Package files that come along whatever is imported: licenses, and the
// declaration files that the CommonJS declarations import
const extras = [
  [path.join(react, 'LICENSE'), 'react-compiler/LICENSE'],
  [path.join(babel, 'LICENSE'), 'babel/LICENSE'],
  [path.join(npm['zod'], 'LICENSE'), 'zod/LICENSE'],
  [path.join(zve, 'LICENSE'), 'zod-validation-error/LICENSE'],
  [path.join(resolveUri, 'LICENSE'), 'jridgewell/resolve-uri/LICENSE'],
  [path.join(npm['@jridgewell/gen-mapping'], 'LICENSE'), 'jridgewell/gen-mapping/LICENSE'],
  [path.join(npm['@jridgewell/trace-mapping'], 'LICENSE'), 'jridgewell/trace-mapping/LICENSE'],
  [path.join(npm['@jridgewell/sourcemap-codec'], 'LICENSE'), 'jridgewell/sourcemap-codec/LICENSE'],
  [path.join(npm['jsesc'], 'LICENSE-MIT.txt'), 'jsesc/LICENSE-MIT.txt'],
  [path.join(npm['@types/jsesc'], 'LICENSE'), 'jsesc/types/LICENSE'],
  [path.join(npm['picocolors'], 'LICENSE'), 'picocolors/LICENSE'],
  [path.join(npm['picocolors'], 'types.d.ts'), 'picocolors/types.d.ts'],
  [path.join(npm['js-tokens'], 'LICENSE'), 'js-tokens/LICENSE'],
  // (charcodes ships no LICENSE file; its package.json declares MIT)
  [path.join(npm['charcodes'], 'package.json'), 'charcodes/package.json'],
  [path.join(npm['invariant'], 'LICENSE'), 'invariant/LICENSE'],
  [path.join(npm['@types/invariant'], 'LICENSE'), 'invariant/types/LICENSE'],
];

for (const entry of fs.existsSync(vendor) ? fs.readdirSync(vendor) : []) {
  if (entry !== 'stubs') fs.rmSync(path.join(vendor, entry), { recursive: true, force: true });
}
while (queue.length > 0) vendorFile(queue.shift());
for (const [from, to] of extras) write(path.join(vendor, to), fs.readFileSync(from, 'utf-8'));

if (missing.size > 0) {
  console.error('Unresolved package imports:\n  ' + [...missing].sort().join('\n  '));
  process.exit(1);
}
console.log(`Vendored ${done.size} files into vendor/`);
