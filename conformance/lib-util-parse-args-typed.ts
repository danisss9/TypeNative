// util.parseArgs: values typed from the options config
import { parseArgs } from 'node:util';
const { values, positionals } = parseArgs({
  args: ['--json', '--indent', '4', 'file.yaml'],
  options: {
    json: { type: 'boolean' },
    indent: { type: 'string', short: 'i' },
    strict: { type: 'boolean', default: false }
  },
  allowPositionals: true
});
assert(values.json === true && values.indent === '4' && values.strict === false, 'typed values');
assert(positionals.join() === 'file.yaml', 'positionals');
console.log(values.json, values.indent, positionals);
