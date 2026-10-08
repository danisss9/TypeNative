const re = /\d/g;
let n = 0;
while (re.exec('a1b2c3') !== null) n++;
assert(n === 3, 'global exec');
