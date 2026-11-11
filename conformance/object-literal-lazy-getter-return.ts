// A function declared to return { value: T } whose object literal computes
// value in a getter (zod's util.cached): the getter runs on first read, not
// when the object is returned, and a defineProperty in it caches the result
let computed = 0;

function cached<T>(getter: () => T): { value: T } {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, 'value', { value });
        return value;
      }
      throw new Error('cached value already set');
    },
  };
}

const lazy = cached(() => {
  computed++;
  return { keys: ['a', 'b'], size: 2 };
});
console.log('before read', computed);
console.log(lazy.value.keys.join(','), lazy.value.size);
console.log('after reads', computed);

const flag = cached(() => {
  computed++;
  return false;
});
console.log(flag.value, computed);
