import inquirer from 'inquirer';
import shell from 'shelljs';
import fs from 'fs-extra';
import ts from 'typescript';
import path from 'path';
import { parse } from 'acorn';
import { ProgramBuilder } from './builders/program.js';
(async function main() {
    const scriptMode = process.argv.findIndex((a) => a === '--script') > -1;
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'path',
            message: 'Enter Path to typescript main file:',
            when: !scriptMode
        },
        {
            type: 'input',
            name: 'output',
            message: 'Enter Output Path:',
            when: !scriptMode
        },
        {
            type: 'editor',
            name: 'tsCode',
            message: 'Write your typescript code and save',
            when: scriptMode
        }
    ]);
    const tsCode = scriptMode
        ? answers.tsCode
        : await fs.readFile(answers.path, { encoding: 'utf-8' });
    const jsCode = ts.transpileModule(tsCode, {}).outputText;
    const program = parse(jsCode, {
        ecmaVersion: 2020,
        preserveParens: true
    });
    await fs.writeJson('code/code.json', program, { encoding: 'utf-8', spaces: 2 });
    const programBuilder = new ProgramBuilder(program);
    const cCode = programBuilder.build();
    await fs.writeFile('code/code.c', cCode, { encoding: 'utf-8' });
    shell.exec(`${path.resolve()}\\tcc\\tcc.exe -g ${path.resolve()}/code/code.c -o ${path.resolve()}/code/code.exe ${scriptMode ? '-run' : ''}`);
    if (answers.output != null) {
        await fs.copy('code/code.exe', answers.output, { overwrite: true });
        console.log('Done!');
    }
})();
