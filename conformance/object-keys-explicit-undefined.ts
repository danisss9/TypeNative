// A key an object literal writes as undefined is an own key: Object.keys
// lists it, in the literal's order (Babel's getOptions copies every default
// key — sourceFilename: undefined among them — from the caller's options)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

interface Options {
  sourceType?: string;
  sourceFilename?: string;
  startLine?: number;
  strictMode?: boolean;
}

function createDefaultOptions(): Options {
  return {
    sourceType: 'script',
    sourceFilename: undefined,
    startLine: 1,
    strictMode: undefined,
  };
}

function getOptions(opts: Options): Options {
  const options: any = createDefaultOptions();
  for (const key of Object.keys(options) as (keyof Options)[]) {
    if (opts[key] != null) options[key] = opts[key];
  }
  return options;
}

check('keys', Object.keys(createDefaultOptions()).join(','), 'sourceType,sourceFilename,startLine,strictMode');
const options = getOptions({ sourceType: 'module', sourceFilename: 'app.jsx' });
check('filename copied', options.sourceFilename, 'app.jsx');
check('type copied', options.sourceType, 'module');
check('default kept', options.startLine, 1);
check('omitted key absent', Object.keys({ sourceType: 'x' } as Options).join(','), 'sourceType');

// (the defaults typed as Babel types them: Omit<Required<…>> & Pick<…>)
type KeepOptionalKeys = 'sourceFilename' | 'strictMode';
type OptionsWithDefaults = Omit<Required<Options>, KeepOptionalKeys> & Pick<Options, KeepOptionalKeys>;
function babelDefaults(): OptionsWithDefaults {
  return {
    sourceType: 'script',
    sourceFilename: undefined,
    startLine: 1,
    strictMode: undefined,
  };
}
function babelOptions(opts: Options): OptionsWithDefaults {
  const options: any = babelDefaults();
  for (const key of Object.keys(options) as (keyof Options)[]) {
    if (opts[key] != null) options[key] = opts[key];
  }
  return options;
}
check('babel keys', Object.keys(babelDefaults()).join(','), 'sourceType,sourceFilename,startLine,strictMode');
check('babel filename copied', babelOptions({ sourceFilename: 'b.jsx' }).sourceFilename, 'b.jsx');
console.log('ok');
