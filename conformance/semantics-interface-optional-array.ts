// Method-interface values: optional array parameters left out, and ?? falling back past a missing one
interface Cur { getSpan(start?: Cur, extra?: number[]): string; }
class C implements Cur { getSpan(start?: Cur, extra?: number[]): string { return 'c' + (start ? 1 : 0) + (extra ? extra.length : 0); } }
class L { _cursor: Cur = new C(); run(end?: Cur): string { return (end ?? this._cursor).getSpan(undefined); } run2(): string { return this._cursor.getSpan(); } }
assert(new L().run() === 'c00' && new L().run2() === 'c00', 'x');
