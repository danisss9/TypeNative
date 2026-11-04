// x instanceof C of an unset C-typed value (stored in a dynamic field):
// false, as for undefined in JS
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Message {
  constructor(public nodes: string[]) {}
}
class SubMessage extends Message {}

class Element {
  i18n: any;
}

function attach(el: Element, nodes: string[]): void {
  let message: Message | undefined = new Message(nodes);
  if (message.nodes.length === 0) {
    message = undefined;
  }
  el.i18n = message;
}

const empty = new Element();
attach(empty, []);
assert(!(empty.i18n instanceof Message), 'unset message is no instance');
assert(empty.i18n === undefined, 'unset message is undefined');
const full = new Element();
attach(full, ['a']);
assert(full.i18n instanceof Message, 'set message is an instance');
const sub = new Element();
sub.i18n = new SubMessage(['x']);
assert(sub.i18n instanceof Message && sub.i18n instanceof SubMessage, 'subclass instance');
let none: SubMessage | undefined;
const holder: any = none;
assert(!(holder instanceof SubMessage), 'unset subclass value');
console.log('ok');
