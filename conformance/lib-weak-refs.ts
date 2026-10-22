// WeakRef / FinalizationRegistry (go:runtime's GC forces a collection)
import { GC } from 'go:runtime';
class Session { id = 7; }
const kept = new Session();
const keptRef = new WeakRef(kept);
assert(keptRef.deref()?.id === 7 && keptRef.deref() === kept, 'deref while referenced');
const cleaned: string[] = [];
const registry = new FinalizationRegistry((held: string) => { cleaned.push(held); });
const token = {};
registry.register(kept, 'kept', token);
assert(registry.unregister(token) && !registry.unregister(token), 'unregister');
let tempRef: WeakRef<Session> | undefined;
function scope(): void {
  const temp = new Session();
  tempRef = new WeakRef(temp);
  registry.register(temp, 'temp collected');
}
scope();
// collection and cleanups are asynchronous: retry for up to a second
let tries = 0;
const poll = setInterval(() => {
  GC();
  tries++;
  if (cleaned.length === 0 && tries < 20) return;
  clearInterval(poll);
  assert(cleaned.join() === 'temp collected', `cleanup callback: ${cleaned.join()}`);
  assert(tempRef?.deref() === undefined, 'deref after collection');
}, 50);
