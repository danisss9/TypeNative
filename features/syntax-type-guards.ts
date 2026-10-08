interface Cat { meow: true }
interface Dog { bark: true }
function isCat(p: Cat | Dog): p is Cat { return 'meow' in p; }
assert(isCat({ meow: true }), 'type guard');
