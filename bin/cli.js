#!/usr/bin/env node
// Node CLI entry point (npm `bin`). Interactive prompts use inquirer here;
// the actual compiler logic lives in the transpilable src/index.ts.
import module from 'node:module';
import { fileURLToPath } from 'node:url';
// V8's on-disk code cache for the compiler's modules (the transpiler and the
// typescript package are megabytes of JS): later runs skip compiling them.
// Enabled before they load, so they're imported dynamically below.
module.enableCompileCache?.();
(async function main() {
    const { run, createProject, parseCliArgs, usage } = await import('./index.js');
    const { VERSION } = await import('./version.js');
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
    const questions = [
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
    ];
    // inquirer (~70 modules) loads only when a question will be asked: a fully
    // flagged run (scripts, the conformance runner) skips its startup cost
    const answers = questions.some((q) => q.when)
        ? await (await import('inquirer')).default.prompt(questions)
        : {};
    if (newCommand) {
        createProject(answers.projectName.trim(), answers.installDependencies);
        return;
    }
    const sourcePath = answers.tsCode ? null : (source ?? answers.path ?? null);
    const { parseAstJson } = await import('./parse-node.js');
    const { typeCheckNode } = await import('./typecheck-node.js');
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
        gui: args.gui,
        cover: args.cover,
        profile: args.profile,
        emitGo: args.emitGo,
        seaConfig: args.seaConfig
    });
})();
