#!/usr/bin/env node
import inquirer from 'inquirer';
import shell from 'shelljs';
import fs from 'fs-extra';
import path from 'path';
import { transpileToNative } from './transpiler.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
    const tsCode = answers.tsCode
        ? answers.tsCode
        : await fs.readFile(target ?? answers.path, { encoding: 'utf-8' });
    const nativeCode = transpileToNative(tsCode);
    await fs.ensureDir('dist');
    await fs.writeFile('dist/code.go', nativeCode, { encoding: 'utf-8' });
    shell.exec('go build -o dist/native.exe dist/code.go');
    // await fs.remove('dist/code.go');
    if (answers.output) {
        await fs.copy('dist/native.exe', answers.output, { overwrite: true });
        await fs.remove('dist/native.exe');
    }
    if (scriptMode) {
        shell.exec(path.join('dist', 'native.exe'));
        await fs.remove('dist/native.exe');
    }
    else {
        console.log('DONE');
    }
})();
