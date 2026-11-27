// Self-hosting entry point: this file is what TypeNative compiles to produce
// the native compiler binary. Interactive prompts use the transpilable
// prompt module (sync stdin) instead of inquirer.

import path from 'node:path';
import { run, createProject, parseCliArgs, usage, checkEnvironment } from './index.js';
import { ask, askMultiline, confirm } from './prompt.js';
import { parseAstJsonNative, typeCheckNative } from './parse-native.js';
import { VERSION } from './version.js';

(function main() {
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
  let source: string | null = args.source;
  let output: string | null = args.output;

  if (args.newProject) {
    if (!args.skipChecks) {
      const warnings = checkEnvironment();
      if (warnings.length > 0) {
        for (const warning of warnings) {
          console.warn(`warning: ${warning}`);
        }
        if (!confirm('Continue creating the project anyway?')) {
          console.log('Project creation cancelled.');
          return;
        }
      }
    }
    const projectName = source ?? ask('Enter Project Name:');
    createProject(projectName.trim(), !args.skipInstall);
    return;
  }

  let tsCode: string | null = null;
  if (!scriptMode && !source) {
    source = ask('Enter Path to typescript main file:');
  }
  if (!scriptMode && !output && !args.emitGo) {
    output = ask('Enter Output Path:');
  }
  if (scriptMode && !source) {
    tsCode = askMultiline('Write your typescript code here:');
  }

  // The native compiler lives in native/, next to the package's govendor/ and types/
  const packageDir = path.join(path.dirname(path.resolve(process.argv[0])), '..');
  const vendorDir = path.join(packageDir, 'govendor');
  const typesDir = path.join(packageDir, 'types');
  const typeCheck = args.noTypeCheck ? null : (fileName: string) => typeCheckNative(fileName, typesDir);
  run({
    source,
    output,
    scriptMode,
    tsCode,
    parse: parseAstJsonNative,
    typeCheck,
    vendorDir,
    target: args.target,
    release: args.release,
    gui: args.gui,
    cover: args.cover,
    profile: args.profile,
    emitGo: args.emitGo,
    seaConfig: args.seaConfig,
    skipChecks: args.skipChecks
  });
})();
