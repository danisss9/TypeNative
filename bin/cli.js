#!/usr/bin/env node
// Node CLI entry point (npm `bin`). Interactive prompts use inquirer here;
// the actual compiler logic lives in the transpilable src/index.ts.
import inquirer from 'inquirer';
import { fileURLToPath } from 'node:url';
import { run, createProject, parseCliArgs, usage } from './index.js';
import { parseAstJson } from './parse-node.js';
import { typeCheckNode } from './typecheck-node.js';
import { VERSION } from './version.js';
(async function main() {
    const args = parseCliArgs(process.argv.slice(2));
    if (args.error) {
        console.error(`error: ${args.error}\nRun 'typenative --help' for the options.`);
        process.exit(2);
    }
    if (args.help) {
        console.log(usage());
        return;
    }
    if (args.version) {
        console.log(VERSION);
        return;
    }
    const scriptMode = args.script;
    const newCommand = args.newProject;
    const source = args.source;
    const output = args.output;
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
            when: !newCommand && !scriptMode && !output && !args.emitGo,
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
    const sourcePath = answers.tsCode ? null : (source ?? answers.path ?? null);
    const typesDir = fileURLToPath(new URL('../types', import.meta.url));
    run({
        source: sourcePath,
        output: output ?? answers.output ?? null,
        scriptMode,
        tsCode: answers.tsCode ?? null,
        parse: parseAstJson,
        typeCheck: args.noTypeCheck ? null : (fileName) => typeCheckNode(fileName, typesDir),
        vendorDir: fileURLToPath(new URL('../govendor', import.meta.url)),
        target: args.target,
        release: args.release,
        emitGo: args.emitGo
    });
})();
