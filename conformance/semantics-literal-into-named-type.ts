// An object literal passed where a named object type is expected (Set.add): each value converted to its field's type
enum Kind { Alias, Ctx }
interface Base { kind: Kind; name: string | null; }
interface AliasVariable extends Base { kind: Kind.Alias; identifier: string; expression: number; }
class Ref { constructor(public name: string, public value: string) {} }
class Other { constructor(public name: number) {} }
const vars: (Ref | Other)[] = [new Ref('$e', '$error')];
const aliases = new Set<AliasVariable>();
for (const variable of vars) {
  aliases.add({ kind: Kind.Alias, name: null, identifier: (variable as Ref).name, expression: 3 });
}
const anyVars: any[] = [{ name: 'n2' }];
for (const v of anyVars) aliases.add({ kind: Kind.Alias, name: null, identifier: v.name, expression: 4 });
const text = [...aliases].map((a) => a.identifier + a.expression).join(',');
console.log(text);
assert(text === '$e3,n24', 'converted fields');
