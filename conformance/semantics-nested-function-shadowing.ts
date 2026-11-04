// A nested function declaration shadows a top-level function of the same name
class Other {
  names: string[] = [];
}
function getScope(view: number, parent: Other | null): Other {
  const s = new Other();
  s.names.push('other' + view);
  return s;
}
class Scope {
  targets = new Map<string, number>();
}
function resolve(views: number[]): string[] {
  const scopes = new Map<number, Scope>();
  function getScope(view: number): Scope {
    if (scopes.has(view)) return scopes.get(view)!;
    const scope = new Scope();
    scope.targets.set('t' + view, view * 10);
    scopes.set(view, scope);
    return scope;
  }
  function resolveOne(view: number): string {
    const scope = getScope(view);
    if (scope.targets.has('t' + view)) return 't' + view + '=' + scope.targets.get('t' + view)!;
    return 'none';
  }
  return views.map((v) => resolveOne(v));
}
const text = resolve([1, 2, 1]).join(',') + ' ' + getScope(5, null).names.join(',');
console.log(text);
assert(text === 't1=10,t2=20,t1=10 other5', 'nested declaration called');
