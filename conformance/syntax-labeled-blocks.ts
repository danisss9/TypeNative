// label: { … break label; … } on blocks and if statements
let r = 0;
outer: {
  r = 1;
  if (r === 1) break outer;
  r = 2;
}
assert(r === 1, 'break out of a labeled block');
unused: { r += 10; }
assert(r === 11, 'unused label');
for (let i = 0; i < 3; i++) {
  skip: {
    if (i === 1) break skip;
    r += 100;
  }
}
assert(r === 211, 'labeled block in a loop');
check: if (r > 0) {
  r = -1;
  break check;
}
assert(r === -1, 'labeled if');
