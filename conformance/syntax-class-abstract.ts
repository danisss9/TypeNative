abstract class S { abstract area(): number; describe(): string { return 'area ' + this.area(); } }
class Sq extends S { area(): number { return 4; } }
assert(new Sq().describe() === 'area 4', 'abstract');
