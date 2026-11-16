// CustomEvent, ErrorEvent, navigator, Storage / sessionStorage / localStorage
const target = new EventTarget();
let got: unknown = null;
target.addEventListener('ping', (e: Event) => {
  got = (e as CustomEvent<{ n: number }>).detail;
});
target.dispatchEvent(new CustomEvent('ping', { detail: { n: 7 } }));
assert((got as { n: number }).n === 7, 'CustomEvent detail');
const custom = new CustomEvent('x');
assert(custom.type === 'x' && custom.detail == null, 'CustomEvent without detail');

const err = new Error('boom');
const errorEvent = new ErrorEvent('error', { message: 'm', filename: 'f.js', lineno: 3, colno: 4, error: err });
assert(errorEvent.message === 'm' && errorEvent.filename === 'f.js' && errorEvent.lineno === 3 && errorEvent.colno === 4, 'ErrorEvent fields');
assert(errorEvent.error === err, 'ErrorEvent error');

assert(typeof navigator === 'object' && navigator.hardwareConcurrency >= 1, 'navigator.hardwareConcurrency');
assert(navigator.userAgent === 'Node.js/26' && navigator.language.length >= 2 && navigator.languages[0] === navigator.language, 'navigator strings');
assert(typeof navigator.platform === 'string' && navigator.platform.length > 0, 'navigator.platform');

sessionStorage.setItem('a', '1');
sessionStorage.setItem('b', '2');
assert(sessionStorage.getItem('a') === '1' && sessionStorage.length === 2 && sessionStorage.key(0) === 'a', 'sessionStorage');
sessionStorage.removeItem('a');
assert(sessionStorage.getItem('a') === null && sessionStorage.length === 1, 'removeItem');
sessionStorage.clear();
assert(sessionStorage.length === 0 && sessionStorage.key(0) === null, 'clear');

// localStorage needs a file (Node: --localstorage-file)
assert(localStorage === undefined, 'localStorage is undefined without a file');
console.log('web globals ok');
