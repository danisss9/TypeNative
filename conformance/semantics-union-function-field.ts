// A union of object types whose function field types differ: the field is called reflectively
enum Kind { Tmpl, Host, Both }
class Job { log: string[] = []; }
class TmplJob extends Job { tmpl = true; }
type Phase = { fn: (job: Job) => void; kind: Kind.Both } | { fn: (job: TmplJob) => void; kind: Kind.Tmpl };
function a(job: Job): void { job.log.push('a'); }
function b(job: TmplJob): void { job.log.push('b' + job.tmpl); }
const phases: Phase[] = [{ kind: Kind.Both, fn: a }, { kind: Kind.Tmpl, fn: b }];
function transform(job: Job, kind: Kind): void {
  for (const phase of phases) {
    if (phase.kind === kind || phase.kind === Kind.Both) phase.fn(job as TmplJob);
  }
}
const j = new TmplJob();
transform(j, Kind.Tmpl);
console.log(j.log.join(','));
assert(j.log.join(',') === 'a,btrue', 'phases ran');
