#!/usr/bin/env node

// Node CLI entry point (npm `bin`). Interactive prompts use inquirer here;
// the actual compiler logic lives in the transpilable src/index.ts.

import inquirer from 'inquirer';
import { run, createProject } from './index.js';

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
    createProject(answers.projectName.trim(), answers.installDependencies);
    return;
  }

  const sourcePath: string | null = answers.tsCode ? null : (source ?? answers.path ?? null);

  run({
    source: sourcePath,
    output: output ?? answers.output ?? null,
    scriptMode,
    tsCode: answers.tsCode ?? null
  });
})();
