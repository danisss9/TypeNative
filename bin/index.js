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
import { transpileToNative } from './transpiler.js';
// Run a command and capture its output. Uses Node's spawnSync under Node and a
// Go helper (os/exec) once transpiled — both synchronous, same result shape.
export function runCommand(name, args) {
    const result = childProcess.spawnSync(name, args, { encoding: 'utf-8' });
    return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}
// Run a command with the parent's stdio, returns the exit code.
export function runInherit(name, args = []) {
    const result = childProcess.spawnSync(name, args, { stdio: 'inherit' });
    return result.status;
}
export function createProject(projectName, installDependencies) {
    fs.mkdirSync(projectName, { recursive: true });
    fs.writeFileSync(path.join(projectName, 'main.ts'), `// Write your TypeScript code here\nconsole.log('Hello, World!');\n`);
    fs.writeFileSync(path.join(projectName, 'tsconfig.json'), getTsConfig());
    fs.writeFileSync(path.join(projectName, 'package.json'), getPackageJson(projectName));
    fs.writeFileSync(path.join(projectName, '.gitignore'), getGitIgnore());
    fs.writeFileSync(path.join(projectName, 'README.md'), getReadMe(projectName));
    console.log(`Project "${projectName}" created successfully!`);
    if (installDependencies) {
        console.log('Installing dependencies...');
        // npm --prefix avoids needing cwd support in the subprocess binding
        const result = runCommand('npm', ['install', '--prefix', projectName]);
        if (result.stdout)
            console.log(result.stdout.trim());
        if (result.status !== 0) {
            if (result.stderr)
                console.error(result.stderr.trim());
            process.exit(result.status);
        }
        console.log('Dependencies installed successfully!');
    }
}
export function run(opts) {
    const sourcePath = opts.tsCode ? null : opts.source;
    const tsCode = opts.tsCode ? opts.tsCode : fs.readFileSync(sourcePath, 'utf-8');
    const sourceDir = sourcePath ? path.dirname(path.resolve(sourcePath)) : null;
    const transpileResult = transpileToNative(tsCode, sourceDir
        ? {
            readFile: (specifier, fromDir) => {
                const baseDir = fromDir ?? sourceDir;
                // Relative or absolute path → resolve from baseDir
                if (specifier.startsWith('.') || specifier.startsWith('/')) {
                    // ES convention: ./x.js may refer to x.ts
                    const tsSpecifier = specifier.endsWith('.js')
                        ? specifier.replace(/\.js$/, '.ts')
                        : specifier;
                    for (const candidate of [tsSpecifier + '.ts', tsSpecifier, specifier]) {
                        try {
                            const fullPath = path.resolve(baseDir, candidate);
                            return {
                                content: fs.readFileSync(fullPath, 'utf-8'),
                                dir: path.dirname(fullPath)
                            };
                        }
                        catch {
                            /* not found */
                        }
                    }
                    return null;
                }
                // npm package — walk up from baseDir looking for node_modules/<name>
                const resolved = resolveNpmPackage(baseDir, specifier);
                if (!resolved)
                    return null;
                let { content, dir } = resolved;
                // Normalize CommonJS to ES module syntax
                if (!content.includes('export ') &&
                    (content.includes('module.exports') || content.includes('exports.'))) {
                    content = normalizeCjsContent(content);
                }
                // Inject types from a local ambient .d.ts if available
                const typed = tryInjectDtsTypes(content, specifier, sourceDir);
                if (typed)
                    content = typed;
                return { content, dir };
            }
        }
        : undefined);
    const exeName = platform() === 'win32' ? 'native.exe' : 'native';
    const exePath = `dist/${exeName}`;
    fs.mkdirSync('dist', { recursive: true });
    // Clean up stale Go files from previous runs before writing new ones
    for (const existing of fs.readdirSync('dist')) {
        if (existing.endsWith('.go'))
            fs.rmSync(`dist/${existing}`);
    }
    fs.writeFileSync('dist/code.go', transpileResult.main);
    const goFiles = ['dist/code.go'];
    for (const [filename, content] of transpileResult.files) {
        fs.writeFileSync(`dist/${filename}`, content);
        goFiles.push(`dist/${filename}`);
    }
    const buildResult = runCommand('go', ['build', '-o', exePath, ...goFiles]);
    if (buildResult.status !== 0) {
        console.error('go build failed:');
        if (buildResult.stderr)
            console.error(buildResult.stderr.trim());
        process.exit(1);
    }
    if (opts.scriptMode) {
        process.exit(runInherit(exePath));
    }
    else if (opts.output) {
        fs.copyFileSync(exePath, opts.output);
        console.log(`Created native executable at: ${opts.output}`);
    }
}
function normalizeCjsContent(code) {
    code = code.replace(/['"]use strict['"];?\n?/g, '');
    code = code.replace(/(?:module\.exports|exports)\.(\w+)\s*=\s*function\s*\w*\s*\(/g, 'export function $1(');
    return code;
}
function tryInjectDtsTypes(jsContent, packageName, searchDir) {
    if (!searchDir)
        return null;
    // Look for *.d.ts files in searchDir that declare the module
    let dtsBody = null;
    try {
        const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        for (const file of fs.readdirSync(searchDir)) {
            if (!file.endsWith('.d.ts'))
                continue;
            const content = fs.readFileSync(path.join(searchDir, file), 'utf-8');
            const match = content.match(new RegExp(`declare module ['"]${escaped}['"][^{]*\\{([\\s\\S]*?)\\}`));
            if (match) {
                dtsBody = match[1];
                break;
            }
        }
    }
    catch {
        return null;
    }
    if (!dtsBody)
        return null;
    // Extract typed function signatures from the .d.ts module body
    const signatures = new Map();
    const sigRegex = /export function (\w+)\(([^)]*)\)\s*:\s*([^\n;]+)/g;
    let m;
    while ((m = sigRegex.exec(dtsBody)) !== null) {
        signatures.set(m[1], { params: m[2].trim(), returnType: m[3].trim() });
    }
    if (signatures.size === 0)
        return null;
    // Replace untyped signatures in the normalized JS with typed ones from .d.ts
    return jsContent.replace(/export function (\w+)\s*\(([^)]*)\)/g, (match, name) => {
        const sig = signatures.get(name);
        if (!sig)
            return match;
        return `export function ${name}(${sig.params}): ${sig.returnType}`;
    });
}
function resolveNpmPackage(fromDir, packageName) {
    // Walk up the directory tree looking for node_modules/<packageName>
    let searchDir = fromDir;
    while (true) {
        const pkgDir = path.join(searchDir, 'node_modules', packageName);
        const pkgJsonPath = path.join(pkgDir, 'package.json');
        try {
            const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
            // Build candidate entry points: TypeScript preferred, JavaScript as fallback
            const tsCandidates = [];
            const jsCandidates = [];
            for (const field of ['source', 'main', 'module']) {
                const entry = pkgJson[field];
                if (!entry)
                    continue;
                if (entry.endsWith('.ts'))
                    tsCandidates.push(entry);
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
                    return { content: fs.readFileSync(fullPath, 'utf-8'), dir: path.dirname(fullPath) };
                }
                catch {
                    /* try next candidate */
                }
            }
        }
        catch {
            /* no package.json here, keep walking up */
        }
        const parent = path.dirname(searchDir);
        if (parent === searchDir)
            break; // filesystem root
        searchDir = parent;
    }
    return null;
}
function getPackageJson(projectName) {
    const exeName = platform() === 'win32' ? `${projectName}.exe` : projectName;
    const pckg = {
        name: projectName,
        version: '1.0.0',
        scripts: {
            execute: 'npx typenative --source main.ts --script',
            build: `npx typenative --source main.ts --output bin/${exeName}`
        },
        devDependencies: {
            typenative: '^0.0.19'
        }
    };
    return JSON.stringify(pckg, null, 2);
}
function getTsConfig() {
    const tsConfig = {
        include: ['**/*.ts'],
        compilerOptions: {
            target: 'es2020',
            lib: [],
            types: ['typenative', 'typenative/go', 'typenative/npm'],
            rootDir: '.',
            strict: true,
            noImplicitAny: true,
            allowSyntheticDefaultImports: true
        }
    };
    return JSON.stringify(tsConfig, null, 2);
}
function getGitIgnore() {
    return `# TypeNative generated files
node_modules/
dist/
bin/
`;
}
function getReadMe(projectName) {
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
