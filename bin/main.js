// Self-hosting entry point: this file is what TypeNative compiles to produce
// the native compiler binary. Interactive prompts use the transpilable
// prompt module (sync stdin) instead of inquirer.
import { run, createProject } from './index.js';
import { ask, askMultiline, confirm } from './prompt.js';
import { parseAstJsonNative } from './parse-native.js';
(function main() {
    const scriptMode = process.argv.findIndex((a) => a === '--script') > -1;
    const newCommand = process.argv.findIndex((a) => a === '--new') > -1;
    const sourceIndex = process.argv.findIndex((a) => a === '--source');
    let source = sourceIndex > -1 ? process.argv[sourceIndex + 1] : null;
    const outputIndex = process.argv.findIndex((a) => a === '--output');
    let output = outputIndex > -1 ? process.argv[outputIndex + 1] : null;
    if (newCommand) {
        const projectName = ask('Enter Project Name:');
        const installDependencies = confirm('Do you want to install dependencies?');
        createProject(projectName, installDependencies);
        return;
    }
    let tsCode = null;
    if (!newCommand && !scriptMode && !source) {
        source = ask('Enter Path to typescript main file:');
    }
    if (!newCommand && !scriptMode && !output) {
        output = ask('Enter Output Path:');
    }
    if (!newCommand && scriptMode && !source) {
        tsCode = askMultiline('Write your typescript code here:');
    }
    run({ source, output, scriptMode, tsCode, parse: parseAstJsonNative });
})();
