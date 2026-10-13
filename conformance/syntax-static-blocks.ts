class Config { static values: number[] = []; static { Config.values.push(1); } }
assert(Config.values.length === 1, 'static block');
