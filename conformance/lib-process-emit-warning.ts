// process.emitWarning prints "(node:PID) Warning: …" to stderr, and once per
// process the "(Use `node --trace-warnings ...`" hint
process.emitWarning('first warning');
process.emitWarning('second warning');
process.emitWarning('a deprecation', 'DeprecationWarning');
console.log('warned');
