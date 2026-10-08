const v = JSON.parse('{"a":[1,2]}');
assert(v.a.length === 2 && v.a[1] === 2, 'parse');
