// Generator methods inherited by subclasses (and called on base-typed values)
abstract class Unit { items = [1, 2]; *ops(): Generator<number> { for (const i of this.items) yield i * 10; } }
class ViewUnit extends Unit {}
class HostUnit extends Unit { override items = [5]; }
abstract class Job { abstract get units(): Iterable<Unit>; }
class ViewJob extends Job { get units(): Iterable<ViewUnit> { return [new ViewUnit()]; } }
const jobs: Job[] = [new ViewJob()];
const out: number[] = [];
for (const job of jobs) for (const u of job.units) for (const op of u.ops()) out.push(op);
const hu: Unit = new HostUnit();
for (const op of hu.ops()) out.push(op);
console.log(out.join(','));
assert(out.join(',') === '10,20,50', 'inherited generators');
