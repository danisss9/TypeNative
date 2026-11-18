// Generator next(value), return(value), throw(err), and capturing yield values

// 1. Capturing yield values and passing values via next(value)
function* accumulator(): Generator<number, number, number> {
  let total = 0;
  while (true) {
    const x = yield total;
    if (x === 0) return total;
    total += x;
  }
}

const acc = accumulator();
let r = acc.next(999); // first next() argument is ignored
assert(r.value === 0 && !r.done, 'first next ignores arg');
r = acc.next(10);
assert(r.value === 10 && !r.done, 'next(10)');
r = acc.next(5);
assert(r.value === 15 && !r.done, 'next(5)');
r = acc.next(0);
assert(r.value === 15 && r.done === true, 'return value on done');
r = acc.next(100);
assert(r.done === true, 'subsequent next after done');

// 2. Different TReturn and TNext types
function* typedGen(): Generator<number, string, boolean> {
  const flag = yield 1;
  return flag ? 'yes' : 'no';
}
const tg = typedGen();
const t1 = tg.next();
assert(t1.value === 1 && !t1.done, 'typedGen yield');
const t2 = tg.next(true);
assert(t2.value === 'yes' && t2.done === true, 'typedGen return');

// 3. return() before first next() does not run body
let started = false;
function* lazyGen(): Generator<number> {
  started = true;
  try {
    yield 1;
  } finally {
    started = true;
  }
}
const lg = lazyGen();
const lret = lg.return!(42);
assert(!started, 'return() before first next() does not start body');
assert(lret.value === 42 && lret.done === true, 'return() before first next() returns arg');
assert(lg.next().done === true, 'next() after early return() is done');

// 4. return() runs finally (not catch) and supports yield inside finally
const log: string[] = [];
function* withFinally(): Generator<number> {
  try {
    log.push('start');
    yield 1;
    log.push('unreachable');
  } catch (e) {
    log.push('catch:' + String(e));
  } finally {
    log.push('finally1');
    yield 99;
    log.push('finally2');
  }
}
const wf = withFinally();
assert(wf.next().value === 1, 'withFinally first yield');
const wfr1 = wf.return!(77);
assert(wfr1.value === 99 && !wfr1.done, 'return() yields from finally');
const wfr2 = wf.next();
assert(wfr2.value === 77 && wfr2.done === true, 'next() after finally yield finishes with return arg');
assert(log.join(',') === 'start,finally1,finally2', 'finally ran without catch');
assert(wf.return!(55).value === 55 && wf.return!(55).done === true, 'return() on finished generator');

// 5. throw() caught inside generator and uncaught propagating to caller
function* catchable(): Generator<string, string, unknown> {
  try {
    yield 'a';
    yield 'b';
  } catch (e) {
    yield 'caught:' + String(e);
    return 'recovered';
  }
  return 'normal';
}
const cg = catchable();
assert(cg.next().value === 'a', 'catchable first yield');
const ct = cg.throw!('boom');
assert(ct.value === 'caught:boom' && !ct.done, 'throw() caught and yields');
const ct2 = cg.next();
assert(ct2.value === 'recovered' && ct2.done === true, 'catchable finishes after catch');

let uncaughtCaught = '';
try {
  cg.throw!('after-done');
} catch (e) {
  uncaughtCaught = String(e);
}
assert(uncaughtCaught === 'after-done', 'throw() on finished generator throws in caller');

let unstartedThrown = '';
const cg2 = catchable();
try {
  cg2.throw!('before-start');
} catch (e) {
  unstartedThrown = String(e);
}
assert(unstartedThrown === 'before-start' && cg2.next().done === true, 'throw() before start throws and finishes');

// 6. yield* delegation of next(v), return(v), throw(e), and return value
const delLog: string[] = [];
function* inner(): Generator<number, string, number> {
  try {
    const a = yield 10;
    const b = yield a * 2;
    return 'inner:' + String(b);
  } catch (e) {
    delLog.push('inner-catch:' + String(e));
    yield 999;
    return 'inner-recovered';
  } finally {
    delLog.push('inner-finally');
  }
}
function* outer(): Generator<number, string, number> {
  try {
    const res = yield* inner();
    return 'outer:' + res;
  } finally {
    delLog.push('outer-finally');
  }
}

const og1 = outer();
assert(og1.next().value === 10, 'yield* first');
assert(og1.next(7).value === 14, 'yield* next(7) forwarded');
const og1End = og1.next(3);
assert(og1End.value === 'outer:inner:3' && og1End.done === true, 'yield* captures inner return value');

delLog.length = 0;
const og2 = outer();
assert(og2.next().value === 10, 'yield* throw setup');
assert(og2.throw!('err1').value === 999, 'yield* forwards throw to inner catch');
const og2End = og2.next(0);
assert(og2End.value === 'outer:inner-recovered' && og2End.done === true, 'yield* continues after inner catch');

delLog.length = 0;
const og3 = outer();
assert(og3.next().value === 10, 'yield* return setup');
const og3Ret = og3.return!('stop');
assert(og3Ret.value === 'stop' && og3Ret.done === true, 'yield* forwards return()');
assert(delLog.join(',') === 'inner-finally,outer-finally', 'yield* return() runs both finally blocks');

// 7. Class generator method
class Counter {
  *count(start: number): Generator<number, number, number> {
    let n = start;
    const step = yield n;
    n += step;
    return n;
  }
}
const c = new Counter().count(5);
assert(c.next().value === 5, 'class generator method first yield');
const cEnd = c.next(3);
assert(cEnd.value === 8 && cEnd.done === true, 'class generator method next(3)');
