// conformance-flags: --no-typecheck
// Object.prototype methods read as values off an empty object and run
// through call (jsesc's const toString = object.toString; toString.call(v))
const object = {};
const hasOwnProperty = object.hasOwnProperty;
const toString = object.toString;

const forOwn = (obj, callback) => {
  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) callback(key, obj[key]);
  }
};

const isObject = (value) => toString.call(value) == '[object Object]';
const isString = (value) => typeof value == 'string' || toString.call(value) == '[object String]';
const isMap = (value) => toString.call(value) == '[object Map]';

const seen = [];
forOwn({ a: 1, b: 'two' }, (key, value) => seen.push(`${key}=${value}`));
console.log(seen.join(' '));
console.log(isObject({ x: 1 }), isObject([1]), isObject('s'));
console.log(isString('s'), isString(1));
console.log(isMap(new Map()), isMap({}));
console.log(toString.call(null), toString.call(undefined), toString.call([1, 2]), toString.call(3));
console.log(hasOwnProperty.call({ k: 1 }, 'k'), hasOwnProperty.call({ k: 1 }, 'z'));
