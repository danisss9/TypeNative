// Try/Catch

// Basic throw and catch
let caughtBasic = false;
try {
  throw new Error("test error");
} catch (e) {
  caughtBasic = true;
}
assert(caughtBasic === true, 'basic try/catch — error was caught');

// No throw — catch not called
let noCatch = false;
try {
  noCatch = true;
} catch (e) {
  noCatch = false;
}
assert(noCatch === true, 'try/catch — catch not called when no throw');

// Finally always runs (no throw)
let finallyRan = false;
try {
  finallyRan = false;
} finally {
  finallyRan = true;
}
assert(finallyRan === true, 'try/finally — finally runs when no throw');

// Try/catch/finally execution order
let order = '';
try {
  order += 'try';
  throw new Error("boom");
} catch (e) {
  order += '-catch';
} finally {
  order += '-finally';
}
assert(order === 'try-catch-finally', 'try/catch/finally — execution order');
