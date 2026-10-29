// The `yaml` npm package's own command-line tool, compiled from its unmodified
// upstream TypeScript (vendor/yaml/src, see vendor/yaml/VENDOR.md). This file
// is a TypeScript port of upstream's bin.js: it hands stdin and the arguments
// to cli() and turns the error it reports into an exit code.
//
//   yaml < in.yaml             re-emit the YAML stream
//   yaml --json < in.yaml      print it as JSON
//   yaml valid < in.yaml       exit 1 on the first error
//   yaml lex < in.yaml         print the lexer's tokens
//   yaml cst < in.yaml         print the concrete syntax tree
//
// Runs as-is under Node.js (`node main.ts`) and compiles with TypeNative.
import { UserError, cli, help } from './vendor/yaml/src/cli.ts';

cli(
  process.stdin,
  (error) => {
    if (error instanceof UserError) {
      if (error.code === UserError.ARGS) console.error(`${help}\n`);
      console.error(error.message);
      process.exitCode = error.code;
    } else if (error) {
      // bin.js rethrows here; Node then prints the error and exits with 1
      console.error(error);
      process.exitCode = 1;
    }
  },
  process.argv.slice(2)
);
