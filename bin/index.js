#!/usr/bin/env node
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'node:path';
import { execa } from 'execa';
import { transpileToNative } from './transpiler.js';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
(async function main() {
    const scriptMode = process.argv.findIndex((a) => a === '--script') > -1;
    const newCommand = process.argv.findIndex((a) => a === '--new') > -1;
    const sourceIndex = process.argv.findIndex((a) => a === '--source');
    const source = sourceIndex > -1 ? process.argv[sourceIndex + 1] : null;
    const outputIndex = process.argv.findIndex((a) => a === '--output');
    const output = outputIndex > -1 ? process.argv[outputIndex + 1] : null;
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'Enter Project Name:',
            when: newCommand,
            validate: (input) => input.trim() !== ''
        },
        {
            type: 'confirm',
            name: 'installDependencies',
            message: 'Do you want to install dependencies?',
            when: newCommand
        },
        {
            type: 'input',
            name: 'path',
            message: 'Enter Path to typescript main file:',
            when: !newCommand && !scriptMode && !source,
            validate: (input) => input.trim() !== ''
        },
        {
            type: 'input',
            name: 'output',
            message: 'Enter Output Path:',
            when: !newCommand && !scriptMode && !output,
            validate: (input) => input.trim() !== ''
        },
        {
            type: 'editor',
            name: 'tsCode',
            message: 'Write your typescript code here:',
            when: !newCommand && scriptMode && !source,
            default: `console.log('Hello, World!');`
        }
    ]);
    if (newCommand) {
        const projectName = answers.projectName.trim();
        await fs.ensureDir(projectName);
        await fs.writeFile(path.join(projectName, 'main.ts'), `// Write your TypeScript code here\nconsole.log('Hello, World!');\n`, { encoding: 'utf-8' });
        await fs.writeFile(path.join(projectName, 'tsconfig.json'), getTsConfig(), {
            encoding: 'utf-8'
        });
        await fs.writeFile(path.join(projectName, 'package.json'), getPackageJson(projectName), {
            encoding: 'utf-8'
        });
        await fs.writeFile(path.join(projectName, '.gitignore'), getGitIgnore(), {
            encoding: 'utf-8'
        });
        await fs.writeFile(path.join(projectName, 'README.md'), getReadMe(projectName), {
            encoding: 'utf-8'
        });
        console.log(`Project "${projectName}" created successfully!`);
        if (answers.installDependencies) {
            console.log('Installing dependencies...');
            await execa('npm', ['install'], { cwd: projectName, stdio: 'inherit' });
            console.log('Dependencies installed successfully!');
        }
        return;
    }
    const sourcePath = answers.tsCode ? null : (source ?? answers.path ?? null);
    const tsCode = answers.tsCode
        ? answers.tsCode
        : await fs.readFile(sourcePath, { encoding: 'utf-8' });
    const sourceDir = sourcePath ? path.dirname(path.resolve(sourcePath)) : null;
    const transpileResult = transpileToNative(tsCode, sourceDir
        ? {
            readFile: (specifier, fromDir) => {
                const baseDir = fromDir ?? sourceDir;
                // Relative or absolute path → resolve from baseDir
                if (specifier.startsWith('.') || specifier.startsWith('/')) {
                    for (const candidate of [specifier + '.ts', specifier]) {
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
                if (!content.includes('export ') && (content.includes('module.exports') || content.includes('exports.'))) {
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
    const exeName = process.platform === 'win32' ? 'native.exe' : 'native';
    const exePath = `dist/${exeName}`;
    await fs.ensureDir('dist');
    // Clean up stale Go files from previous runs before writing new ones
    for (const existing of await fs.readdir('dist')) {
        if (existing.endsWith('.go'))
            await fs.remove(`dist/${existing}`);
    }
    await fs.writeFile('dist/code.go', transpileResult.main, { encoding: 'utf-8' });
    const goFiles = ['dist/code.go'];
    for (const [filename, content] of transpileResult.files) {
        await fs.writeFile(`dist/${filename}`, content, { encoding: 'utf-8' });
        goFiles.push(`dist/${filename}`);
    }
    await execa('go', ['build', '-o', exePath, ...goFiles], {
        stdio: 'inherit'
    });
    // await fs.remove('dist/code.go');
    if (scriptMode) {
        await execa(exePath, {
            stdio: 'inherit'
        });
        //await fs.remove(exePath);
    }
    else if (output || answers.output) {
        await fs.copy(exePath, output ?? answers.output, { overwrite: true });
        //await fs.remove(exePath);
        console.log(`Created native executable at: ${output ?? answers.output}`);
    }
})();
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
    const exeName = process.platform === 'win32' ? `${projectName}.exe` : projectName;
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
    const exeName = process.platform === 'win32' ? `${projectName}.exe` : projectName;
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
