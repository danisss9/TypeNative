#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import { transpileToNative } from './transpiler.js';
import { fileURLToPath } from 'url';

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
      await execa('npm install', { cwd: projectName, stdio: 'inherit' });
      console.log('Dependencies installed successfully!');
    }
    return;
  }

  const tsCode: string = answers.tsCode
    ? answers.tsCode
    : await fs.readFile(source ?? answers.path, { encoding: 'utf-8' });

  const nativeCode = transpileToNative(tsCode);

  await fs.ensureDir('dist');
  await fs.writeFile('dist/code.go', nativeCode, { encoding: 'utf-8' });

  await execa('go build -o dist/native.exe dist/code.go', {
    stdio: 'inherit'
  });
  // await fs.remove('dist/code.go');

  if (scriptMode) {
    await execa('dist/native.exe', {
      stdio: 'inherit'
    });
    //await fs.remove('dist/native.exe');
  } else if (output || answers.output) {
    await fs.copy('dist/native.exe', output ?? answers.output, { overwrite: true });
    //await fs.remove('dist/native.exe');
    console.log(`Created native executable at: ${output ?? answers.output}`);
  }
})();

function getPackageJson(projectName: string): string {
  const pckg = {
    name: projectName,
    version: '1.0.0',
    scripts: {
      execute: 'npx typenative --source main.ts --script',
      build: `npx typenative --source main.ts --output bin/${projectName}.exe`
    },
    devDependencies: {
      typenative: '^0.0.13'
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
      types: ['./node_modules/typenative/types/typenative.d.ts'],
      rootDir: '.',
      strict: true,
      noImplicitAny: true
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
  return `# ${projectName}

This project was created using TypeNative, a tool to transpile TypeScript code to native Go code.

## How to Run

You can write your TypeScript code in the \`main.ts\` file. The code will be transpiled to Go and compiled into a native executable.
You can also run the code directly in script mode using \`npm run execute\`.

## How to Build

1. Install dependencies: \`npm install\` (if not done already)
2. Build the project: \`npm run build\`
3. Run the executable: \`./bin/${projectName}.exe\`
`;
}
