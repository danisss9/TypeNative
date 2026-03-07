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

    await fs.writeFile(
      path.join(projectName, 'main.ts'),
      `// Write your TypeScript code here\nconsole.log('Hello, World!');\n`,
      { encoding: 'utf-8' }
    );
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

  const sourcePath: string | null = answers.tsCode ? null : (source ?? answers.path ?? null);
  const tsCode: string = answers.tsCode
    ? answers.tsCode
    : await fs.readFile(sourcePath!, { encoding: 'utf-8' });

  const sourceDir = sourcePath ? path.dirname(path.resolve(sourcePath)) : null;
  const nativeCode = transpileToNative(
    tsCode,
    sourceDir
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
                } catch {
                  /* not found */
                }
              }
              return null;
            }

            // npm package — walk up from baseDir looking for node_modules/<name>
            return resolveNpmPackage(baseDir, specifier);
          }
        }
      : undefined
  );

  const exeName = process.platform === 'win32' ? 'native.exe' : 'native';
  const exePath = `dist/${exeName}`;

  await fs.ensureDir('dist');
  await fs.writeFile('dist/code.go', nativeCode, { encoding: 'utf-8' });

  await execa('go', ['build', '-o', exePath, 'dist/code.go'], {
    stdio: 'inherit'
  });
  // await fs.remove('dist/code.go');

  if (scriptMode) {
    await execa(exePath, {
      stdio: 'inherit'
    });
    //await fs.remove(exePath);
  } else if (output || answers.output) {
    await fs.copy(exePath, output ?? answers.output, { overwrite: true });
    //await fs.remove(exePath);
    console.log(`Created native executable at: ${output ?? answers.output}`);
  }
})();

function resolveNpmPackage(
  fromDir: string,
  packageName: string
): { content: string; dir: string } | null {
  // Walk up the directory tree looking for node_modules/<packageName>
  let searchDir = fromDir;
  while (true) {
    const pkgDir = path.join(searchDir, 'node_modules', packageName);
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8') as string);

      // Build candidate entry points, preferring TypeScript source
      // Build candidate entry points — only TypeScript source files are valid
      const candidates: string[] = [];
      for (const field of ['source', 'main', 'module']) {
        const entry: string | undefined = pkgJson[field];
        if (!entry) continue;
        if (entry.endsWith('.ts')) candidates.push(entry);
        else if (entry.endsWith('.js')) candidates.push(entry.replace(/\.js$/, '.ts'));
      }
      candidates.push('index.ts', 'src/index.ts');

      for (const candidate of candidates) {
        const fullPath = path.resolve(pkgDir, candidate);
        try {
          return { content: fs.readFileSync(fullPath, 'utf-8') as string, dir: path.dirname(fullPath) };
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
      allowSyntheticDefaultImports: true
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
