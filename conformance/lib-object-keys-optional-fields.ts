// Object.keys of an object typed by an interface with optional object
// fields: only the fields that were set are keys
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Trigger {
  constructor(public name: string) {}
}

interface Triggers {
  when?: Trigger;
  idle?: Trigger;
  viewport?: Trigger;
  label?: string;
}

function parse(names: string[]): Triggers {
  const triggers: Triggers = {};
  for (const name of names) {
    if (name === 'idle') triggers.idle = new Trigger(name);
    if (name === 'viewport') triggers.viewport = new Trigger(name);
    if (name === 'label') triggers.label = name;
  }
  return triggers;
}

interface Details {
  triggers: Readonly<Triggers>;
  hydrate: Readonly<Triggers>;
}

const details: Details = { triggers: parse(['viewport']), hydrate: parse([]) };
assert(Object.keys(details.hydrate).length === 0, 'no hydrate triggers');
assert(Object.keys(details.triggers).join(',') === 'viewport', Object.keys(details.triggers).join(','));
assert(Object.keys(parse(['idle', 'viewport', 'label'])).join(',') === 'idle,viewport,label', Object.keys(parse(['idle', 'viewport', 'label'])).join(','));
console.log('ok');
