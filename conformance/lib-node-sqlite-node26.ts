// node:sqlite in Node 26: Database / Statement names, statement close / dispose / stat / resetStats
import { Database, DatabaseSync, Statement } from 'node:sqlite';

const db = new Database(':memory:');
assert(db instanceof DatabaseSync, 'Database is DatabaseSync');
db.exec('create table t(x); insert into t values (1), (2), (3)');
const st = db.prepare('select * from t where x > ?');
assert(st instanceof Statement, 'Statement is StatementSync');
assert(st.all(0).length === 3, 'runs');
console.log('vmStep', st.stat('vmStep'), 'run', st.stat('run'));
assert(st.stat('run') === 1 && st.stat('vmStep') > 0 && st.stat('fullscanStep') === 2, 'stat counters');
st.resetStats();
assert(st.stat('vmStep') === 0 && st.stat('run') === 0, 'resetStats');
let code = '';
try {
  st.stat('nope' as 'run');
} catch (e) {
  code = (e as NodeJS.ErrnoException).code ?? '';
}
assert(code === 'ERR_INVALID_ARG_VALUE', 'an unknown counter');

st.close();
let message = '';
try {
  st.all(0);
} catch (e) {
  message = (e as Error).message;
}
assert(message === 'statement has been finalized', 'a closed statement throws');

{
  using scoped = db.prepare('select count(*) as n from t');
  assert((scoped.get() as { n: number }).n === 3, 'a disposable statement');
}
db.close();
