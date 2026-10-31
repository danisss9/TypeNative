const $EOF = 0;
const obs$ = [1, 2];
class Ctx { $implicit = 'row'; }
function $wrap(x: number): number { return x + $EOF; }
const ctx = new Ctx();
assert($wrap(3) === 3 && obs$.length === 2 && ctx.$implicit === 'row' && JSON.stringify(ctx) === '{"$implicit":"row"}', 'dollar identifiers');
