import inquirer from 'inquirer';
import shell from 'shelljs';
import fs from 'fs-extra';
import path from 'path';
import { transpileToC } from './transpiler.js';

(async function main() {
  const scriptMode = process.argv.findIndex((a) => a === '--script') > -1;

  const targetIndex = process.argv.findIndex((a) => a === '--source');
  const target = targetIndex > -1 ? process.argv[targetIndex + 1] : null;

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'path',
      message: 'Enter Path to typescript main file:',
      when: !scriptMode && !target
    },
    {
      type: 'input',
      name: 'output',
      message: 'Enter Output Path:',
      when: !scriptMode && !target
    },
    {
      type: 'editor',
      name: 'tsCode',
      message: 'Write your typescript code and save',
      when: scriptMode && !target
    }
  ]);

  const tsCode: string = answers.tsCode
    ? answers.tsCode
    : await fs.readFile(target ?? answers.path, { encoding: 'utf-8' });

  const cCode = transpileToC(tsCode);

  await fs.ensureDir('dist');
  await fs.writeFile('dist/code.c', cCode, { encoding: 'utf-8' });

  shell.exec(
    `${path.resolve()}\\tcc\\tcc.exe -g ${path.resolve()}/dist/code.c -o ${path.resolve()}/dist/native.exe ${
      scriptMode ? '-run' : ''
    }`
  );

  if (answers.output) {
    await fs.copy('dist/native.exe', answers.output, { overwrite: true });
  }

  if (!scriptMode) {
    console.log('DONE');
  }
})();
