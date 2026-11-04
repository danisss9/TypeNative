// A class instance passed where an object type with a subset of its fields is expected
type Meta = { id?: string; description?: string; meaning?: string };
class Message { constructor(public id: string, public description: string | undefined, public meaning: string, public nodes: number[]) {} }
function toDoc(meta: Meta): string { return [meta.id ?? '-', meta.description ?? '-', meta.meaning ?? '-'].join('|'); }
const text = toDoc(new Message('m1', undefined, 'mean', [1])) + ' ' + toDoc({ description: 'd' });
console.log(text);
assert(text === 'm1|-|mean -|d|-', 'class as object type');
