// Core compiler logic — kept free of Node-only dependencies (inquirer, execa,
// fs-extra) so this module transpiles with TypeNative itself.
// Node-only interactive prompting lives in src/cli.ts; the self-hosted entry
// point is src/main.ts.

import path from 'node:path';
import * as fs from 'node:fs';
import { platform } from 'node:os';
// TypeNative maps node:child_process to a synchronous Go API whose shape differs
// from Node's; under Node these functions are never called (the CLI wrapper does
// not reach them), so they're accessed through `any` casts for type-checking.
import * as childProcess from 'node:child_process';
import { transpileToNative, TranspileOptions } from './transpiler.js';
import { VERSION } from './version.js';

// A type error; file is absolute or relative to the working directory, line
// and column are 1-based (0 for errors without a position)
export interface TypeCheckDiagnostic {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
}

export interface RunOptions {
  source: string | null;
  output: string | null;
  scriptMode: boolean;
  tsCode: string | null;
  // Parses TypeScript source into the normalized JSON AST
  // (src/parse-node.ts under Node, src/parse-native.ts self-hosted)
  parse: (code: string, tsx: boolean) => any;
  // Type-checks the program rooted at a file (src/typecheck-node.ts under
  // Node, `tsparser --check` self-hosted); null skips it (--no-typecheck)
  typeCheck: ((fileName: string) => TypeCheckDiagnostic[]) | null;
  // The package's govendor/ directory: third-party Go modules generated
  // programs may import (node:sqlite's driver), see scripts/vendor-go.mjs
  vendorDir: string;
}

// A source path as diagnostics and Go line directives show it: relative to
// the working directory when inside it, else absolute; forward slashes
function displayPath(file: string): string {
  const absolute = path.resolve(file);
  const relative = path.relative(process.cwd(), absolute);
  const inside = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  return (inside ? relative : absolute).split('\\').join('/');
}

// file:line:column: <label>: message (the position Go's own errors use)
function printDiagnostic(file: string, line: number, column: number, label: string, message: string): void {
  const position = line > 0 ? `${displayPath(file)}:${line}:${column}` : displayPath(file);
  console.error(`${file ? position + ': ' : ''}${label}: ${message.split('\n').join('\n    ')}`);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  status: number;
}

// Third-party Go modules a generated program imports are copied under
// dist/tnvendor and wired in with `replace` directives in dist/go.mod, so
// builds need no network.
interface GoModule {
  path: string;
  version: string;
  dir: string;
}

// golang.org/x/text's transform and unicode/norm packages (String.normalize),
// copied from GOROOT/src/vendor
function vendorXText(): GoModule {
  const goroot = runCommand('go', ['env', 'GOROOT']).stdout.trim();
  const source = path.join(goroot, 'src', 'vendor', 'golang.org', 'x', 'text');
  for (const pkg of ['transform', path.join('unicode', 'norm')]) {
    const target = path.join('dist', 'tnvendor', 'x-text', pkg);
    fs.mkdirSync(target, { recursive: true });
    for (const file of fs.readdirSync(path.join(source, pkg))) {
      if (file.endsWith('.go') && !file.endsWith('_test.go')) {
        fs.writeFileSync(
          path.join(target, file),
          fs.readFileSync(path.join(source, pkg, file), 'utf-8')
        );
      }
    }
  }
  fs.writeFileSync(
    path.join('dist', 'tnvendor', 'x-text', 'go.mod'),
    'module golang.org/x/text\n\ngo 1.23\n'
  );
  return { path: 'golang.org/x/text', version: 'v0.0.0', dir: './tnvendor/x-text' };
}

// node:sqlite's driver and its dependencies, copied from the package's
// govendor/ (listed in govendor/manifest.txt); the copy is skipped while
// dist/tnvendor already holds the same version. Returns the modules and the
// Go version their go.mod files declare.
function vendorGoModules(vendorDir: string): { modules: GoModule[]; goVersion: string } {
  const manifest = fs.readFileSync(path.join(vendorDir, 'manifest.txt'), 'utf-8');
  let version = '';
  let goVersion = '1.23';
  const modules: GoModule[] = [];
  for (const line of manifest.split('\n')) {
    const parts = line.trim().split(' ');
    if (parts[0] === 'version') version = parts[1];
    if (parts[0] === 'go') goVersion = parts[1];
    if (parts[0] === 'module') {
      modules.push({ path: parts[1], version: parts[2], dir: './tnvendor/' + parts[1] });
    }
  }
  const stamp = path.join('dist', 'tnvendor', 'govendor.version');
  const current = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf-8') : '';
  if (current !== version) {
    for (const mod of modules) {
      const target = path.join('dist', 'tnvendor', mod.path);
      fs.rmSync(target, { recursive: true, force: true });
      fs.cpSync(path.join(vendorDir, mod.path), target, { recursive: true });
    }
    fs.writeFileSync(stamp, version);
  }
  return { modules: modules, goVersion: goVersion };
}

function writeGoMod(modules: GoModule[], goVersion: string): void {
  let requires = '';
  let replaces = '';
  for (const mod of modules) {
    requires += `\t${mod.path} ${mod.version}\n`;
    replaces += `\t${mod.path} => ${mod.dir}\n`;
  }
  fs.writeFileSync(
    path.join('dist', 'go.mod'),
    `module tnapp\n\ngo ${goVersion}\n\nrequire (\n${requires})\n\nreplace (\n${replaces})\n`
  );
}

// Run a command and capture its output. Uses Node's spawnSync under Node and a
// Go helper (os/exec) once transpiled — both synchronous, same result shape.
export function runCommand(name: string, args: string[]): CommandResult {
  const result = (childProcess as any).spawnSync(name, args, { encoding: 'utf-8' });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

// Run a command with the parent's stdio, returns the exit code.
export function runInherit(name: string, args: string[] = []): number {
  const result = (childProcess as any).spawnSync(name, args, { stdio: 'inherit' });
  return result.status;
}

export function createProject(projectName: string, installDependencies: boolean): void {
  fs.mkdirSync(projectName, { recursive: true });

  fs.writeFileSync(
    path.join(projectName, 'main.ts'),
    `// Write your TypeScript code here\nconsole.log('Hello, World!');\n`
  );
  fs.writeFileSync(path.join(projectName, 'tsconfig.json'), getTsConfig());
  fs.writeFileSync(path.join(projectName, 'package.json'), getPackageJson(projectName));
  fs.writeFileSync(path.join(projectName, '.gitignore'), getGitIgnore());
  fs.writeFileSync(path.join(projectName, 'README.md'), getReadMe(projectName));

  console.log(`Project "${projectName}" created successfully!`);

  if (installDependencies) {
    console.log('Installing dependencies...');
    // npm --prefix avoids needing cwd support in the subprocess binding
    const result = runCommand('npm', ['install', '--prefix', projectName]);
    if (result.stdout) console.log(result.stdout.trim());
    if (result.status !== 0) {
      if (result.stderr) console.error(result.stderr.trim());
      process.exit(result.status);
    }
    console.log('Dependencies installed successfully!');
  }
}

export function run(opts: RunOptions): void {
  const sourcePath: string | null = opts.tsCode ? null : opts.source;
  const tsCode: string = opts.tsCode ? opts.tsCode : fs.readFileSync(sourcePath!, 'utf-8');

  fs.mkdirSync('dist', { recursive: true });
  // Code typed into the prompt is saved as dist/script.ts, so it is
  // type-checked and errors point at a real file
  const entryPath = sourcePath ?? 'dist/script.ts';
  if (!sourcePath) fs.writeFileSync(entryPath, tsCode);

  if (opts.typeCheck) {
    const typeErrors = opts.typeCheck(entryPath);
    if (typeErrors.length > 0) {
      for (const d of typeErrors) printDiagnostic(d.file, d.line, d.column, `error TS${d.code}`, d.message);
      console.error(`\n${plural(typeErrors.length, 'type error')} (--no-typecheck skips the check)`);
      process.exit(1);
    }
  }

  const sourceDir = sourcePath ? path.dirname(path.resolve(sourcePath)) : null;
  // Node's platform names are GOOS names, except win32
  const goos: string = platform() === 'win32' ? 'windows' : platform();
  const transpileOptions: TranspileOptions = {
    parse: opts.parse,
    tsx: !!sourcePath && sourcePath.endsWith('.tsx'),
    fileName: displayPath(entryPath),
    goFile: 'dist/code.go',
    goos: goos
  };
  if (sourceDir) {
    transpileOptions.readFile = (specifier: string, fromDir: string | null) => {
      const baseDir = fromDir ?? sourceDir;

      // Relative or absolute path → resolve from baseDir
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        // ES convention: ./x.js may refer to x.ts
        const tsSpecifier = specifier.endsWith('.js')
          ? specifier.replace(/\.js$/, '.ts')
          : specifier;
        const tsxSpecifier = specifier.endsWith('.js')
          ? specifier.replace(/\.js$/, '.tsx')
          : specifier + '.tsx';
        for (const candidate of [tsSpecifier + '.ts', tsxSpecifier, tsSpecifier, specifier]) {
          try {
            const fullPath = path.resolve(baseDir, candidate);
            return {
              content: fs.readFileSync(fullPath, 'utf-8'),
              dir: path.dirname(fullPath),
              tsx: fullPath.endsWith('.tsx'),
              path: displayPath(fullPath)
            };
          } catch {
            /* not found */
          }
        }
        return null;
      }

      // npm package — walk up from baseDir looking for node_modules/<name>
      const resolved = resolveNpmPackage(baseDir, specifier);
      if (!resolved) return null;
      let { content, dir } = resolved;
      // Normalize CommonJS to ES module syntax
      if (
        !content.includes('export ') &&
        (content.includes('module.exports') || content.includes('exports.'))
      ) {
        content = normalizeCjsContent(content);
      }
      // Inject types from a local ambient .d.ts if available
      const typed = tryInjectDtsTypes(content, specifier, sourceDir);
      if (typed) content = typed;
      return { content, dir, path: displayPath(resolved.path) };
    };
  }
  const transpileResult = transpileToNative(tsCode, transpileOptions);
  if (transpileResult.diagnostics.length > 0) {
    for (const d of transpileResult.diagnostics) printDiagnostic(d.file, d.line, d.column, 'error', d.message);
    console.error(`\n${plural(transpileResult.diagnostics.length, 'error')}: TypeNative can't compile this yet`);
    process.exit(1);
  }

  const exeName = platform() === 'win32' ? 'native.exe' : 'native';
  const exePath = `dist/${exeName}`;

  // Clean up stale Go files from previous runs before writing new ones
  for (const existing of fs.readdirSync('dist')) {
    if (existing.endsWith('.go') || existing === 'go.mod' || existing === 'go.sum')
      fs.rmSync(`dist/${existing}`);
  }
  fs.writeFileSync('dist/code.go', transpileResult.main);

  const goFiles: string[] = ['dist/code.go'];
  for (const [filename, content] of transpileResult.files) {
    fs.writeFileSync(`dist/${filename}`, content);
    goFiles.push(`dist/${filename}`);
  }

  // Third-party Go modules the program imports (see vendorXText / vendorGoModules)
  const generated: string[] = [transpileResult.main];
  for (const content of transpileResult.files.values()) generated.push(content);
  const xTextImport = /^import (\w+ )?"golang\.org\/x\/text\//m;
  const sqliteImport = /^import (\w+ )?"github\.com\/ncruces\/go-sqlite3"/m;
  const modules: GoModule[] = [];
  let goVersion = '1.23';
  if (generated.some((content) => xTextImport.test(content))) modules.push(vendorXText());
  if (generated.some((content) => sqliteImport.test(content))) {
    const vendored = vendorGoModules(opts.vendorDir);
    for (const mod of vendored.modules) modules.push(mod);
    goVersion = vendored.goVersion;
  }
  if (modules.length > 0) writeGoMod(modules, goVersion);
  const buildResult =
    modules.length > 0
      ? runCommand('go', [
          'build',
          '-C',
          'dist',
          // Path-independent cache keys: the vendored packages (sqlite is ~5 MB
          // of Go) compile once, not again for every project directory
          '-trimpath',
          '-o',
          exeName,
          ...goFiles.map((f) => f.slice('dist/'.length))
        ])
      : runCommand('go', ['build', '-o', exePath, ...goFiles]);
  if (buildResult.status !== 0) {
    // Positions in .ts files come from line directives in the generated Go
    console.error('go build failed:');
    if (buildResult.stderr) console.error(buildResult.stderr.trim());
    process.exit(1);
  }

  if (opts.scriptMode) {
    process.exit(runInherit(exePath));
  } else if (opts.output) {
    fs.copyFileSync(exePath, opts.output);
    console.log(`Created native executable at: ${opts.output}`);
  }
}

function normalizeCjsContent(code: string): string {
  code = code.replace(/['"]use strict['"];?\n?/g, '');
  code = code.replace(
    /(?:module\.exports|exports)\.(\w+)\s*=\s*function\s*\w*\s*\(/g,
    'export function $1('
  );
  return code;
}

function tryInjectDtsTypes(
  jsContent: string,
  packageName: string,
  searchDir: string | null
): string | null {
  if (!searchDir) return null;
  // Look for *.d.ts files in searchDir that declare the module
  let dtsBody: string | null = null;
  try {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const file of fs.readdirSync(searchDir)) {
      if (!file.endsWith('.d.ts')) continue;
      const content = fs.readFileSync(path.join(searchDir, file), 'utf-8');
      const match = content.match(
        new RegExp(`declare module ['"]${escaped}['"][^{]*\\{([\\s\\S]*?)\\}`)
      );
      if (match) {
        dtsBody = match[1];
        break;
      }
    }
  } catch {
    return null;
  }
  if (!dtsBody) return null;

  // Extract typed function signatures from the .d.ts module body
  const signatures = new Map<string, { params: string; returnType: string }>();
  const sigRegex = /export function (\w+)\(([^)]*)\)\s*:\s*([^\n;]+)/g;
  for (const m of dtsBody.matchAll(sigRegex)) {
    signatures.set(m[1], { params: m[2].trim(), returnType: m[3].trim() });
  }
  if (signatures.size === 0) return null;

  // Replace untyped signatures in the normalized JS with typed ones from .d.ts
  return jsContent.replace(/export function (\w+)\s*\(([^)]*)\)/g, (match, name) => {
    const sig = signatures.get(name);
    if (!sig) return match;
    return `export function ${name}(${sig.params}): ${sig.returnType}`;
  });
}

function resolveNpmPackage(
  fromDir: string,
  packageName: string
): { content: string; dir: string; path: string } | null {
  // Walk up the directory tree looking for node_modules/<packageName>
  let searchDir = fromDir;
  while (true) {
    const pkgDir = path.join(searchDir, 'node_modules', packageName);
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

      // Build candidate entry points: TypeScript preferred, JavaScript as fallback
      const tsCandidates: string[] = [];
      const jsCandidates: string[] = [];
      for (const field of ['source', 'main', 'module']) {
        const entry: string | undefined = pkgJson[field];
        if (!entry) continue;
        if (entry.endsWith('.ts')) tsCandidates.push(entry);
        else if (entry.endsWith('.js')) {
          tsCandidates.push(entry.replace(/\.js$/, '.ts'));
          jsCandidates.push(entry);
        }
      }
      tsCandidates.push('index.ts', 'src/index.ts');
      jsCandidates.push('index.js', 'src/index.js');
      const candidates = [...tsCandidates, ...jsCandidates];

      for (const candidate of candidates) {
        const fullPath = path.resolve(pkgDir, candidate);
        try {
          return { content: fs.readFileSync(fullPath, 'utf-8'), dir: path.dirname(fullPath), path: fullPath };
        } catch {
          /* try next candidate */
        }
      }
    } catch {
      /* no package.json here, keep walking up */
    }

    const parent = path.dirname(searchDir);
    if (parent === searchDir) break; // filesystem root
    searchDir = parent;
  }
  return null;
}

function getPackageJson(projectName: string): string {
  const exeName = platform() === 'win32' ? `${projectName}.exe` : projectName;
  const pckg = {
    name: projectName,
    version: '1.0.0',
    scripts: {
      execute: 'npx typenative --source main.ts --script',
      build: `npx typenative --source main.ts --output bin/${exeName}`
    },
    devDependencies: {
      typenative: `^${VERSION}`
    }
  };
  return JSON.stringify(pckg, null, 2);
}

function getTsConfig(): string {
  const tsConfig = {
    include: ['**/*.ts'],
    compilerOptions: {
      target: 'es2020',
      lib: [],
      types: ['typenative', 'typenative/go', 'typenative/npm'],
      rootDir: '.',
      strict: true,
      noImplicitAny: true,
      allowSyntheticDefaultImports: true,
      skipLibCheck: true
    }
  };
  return JSON.stringify(tsConfig, null, 2);
}

function getGitIgnore(): string {
  return `# TypeNative generated files
node_modules/
dist/
bin/
`;
}

function getReadMe(projectName: string): string {
  const exeName = platform() === 'win32' ? `${projectName}.exe` : projectName;
  return `# ${projectName}

This project was created using TypeNative, a tool to transpile TypeScript code to native Go code.

## How to Run

You can write your TypeScript code in the \`main.ts\` file. The code will be transpiled to Go and compiled into a native executable.
You can also run the code directly in script mode using \`npm run execute\`.

## How to Build

1. Install dependencies: \`npm install\` (if not done already)
2. Build the project: \`npm run build\`
3. Run the executable: \`./bin/${exeName}\`
`;
}
