// Maps whose values are Sets; Array.from(map.values()) and flatMap over them;
// `set ?? []`
class Registry {
  private _eventSchema = new Map<string, Set<string>>();
  private _allKnownEvents: Set<string> | null = null;
  constructor() {
    this._eventSchema.set('a', new Set(['click', 'focus']));
    this._eventSchema.set('b', new Set(['input']));
  }
  allKnownEventsOfElement(tagName: string): string[] {
    return Array.from(this._eventSchema.get(tagName) ?? []);
  }
  isKnown(eventName: string): boolean {
    this._allKnownEvents ??= new Set(Array.from(this._eventSchema.values()).flatMap((events) => Array.from(events)));
    return this._allKnownEvents.has(eventName.toLowerCase());
  }
}
const r = new Registry();
const text = [r.allKnownEventsOfElement('a').join(','), r.allKnownEventsOfElement('z').length, r.isKnown('INPUT'), r.isKnown('x')].join(' ');
const people = [{ name: 'a', tags: ['x', 'y'] }, { name: 'b', tags: ['z'] }];
const tags = people.flatMap((p) => p.tags);
const upper = tags.map((t) => t.toUpperCase()).join('');
console.log(text, upper);
assert(text === 'click,focus 0 true false', 'map of sets');
assert(upper === 'XYZ', 'flatMap element type');
