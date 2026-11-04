// `a && f()`, `a || f()`, `a ?? f()` and `c ? f() : g()` as statements
const log: string[] = [];
function note(s: string): void {
  log.push(s);
}
function take(s: string): boolean {
  log.push(s);
  return s.length > 1;
}
let flag = true;
let name: string | null = 'x';
let missing: string | null = null;
flag && note('a');
!flag && note('b');
take('c') || take('dd');
take('ee') || take('f');
name && note(name);
name ?? note('skipped');
missing ?? note('null');
flag ? note('t') : note('f');
(flag && note('paren'));
console.log(log.join(','));
assert(log.join(',') === 'a,c,dd,ee,x,null,t,paren', 'logical statements');
