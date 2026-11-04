// A parameter or local named as a top-level function shadows it in calls
enum JobKind { Tmpl, Host }
function transform(job: string[], kind: JobKind): void { job.push('t' + kind); }
function transformText(parts: string[], transform: (p: string) => string): string[] { return [transform(parts[0])]; }
function other(): string { const transform = (s: string) => s + '!'; return transform('x'); }
const job: string[] = [];
transform(job, JobKind.Host);
const text = [transformText([' a '], (t) => t.trim()).join(''), other(), job.join('')].join(' ');
console.log(text);
assert(text === 'a x! t1', 'shadowed calls');
