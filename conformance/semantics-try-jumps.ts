// break and continue inside try/catch whose nearest loop or switch is
// outside the try: the jump crosses the try's Go closure
let seen = '';
for (let i = 0; i < 10; i++) {
  try {
    if (i === 3) {
      seen += `stop-${i}`;
      break;
    }
    seen += `${i},`;
  } catch (e) {
    seen += 'unreachable';
  }
}
assert(seen === '0,1,2,stop-3', 'break leaves a try inside a loop');

let skips = '';
for (let i = 0; i < 5; i++) {
  try {
    if (i % 2 === 0) continue;
    skips += i;
  } finally {
    skips += '.';
  }
}
assert(skips === '.1..3..', 'continue from a try with finally');

// a break in the catch block: the panic path jumps too
let caught = '';
for (const word of ['ok', 'boom', 'end']) {
  try {
    if (word === 'boom') throw new Error(word);
    caught += `${word};`;
  } catch (e) {
    caught += `[${(e as Error).message}]`;
    break;
  }
}
assert(caught === 'ok;[boom]', 'break inside a catch block');

// break inside a try targets an enclosing switch, not any loop above it
let marks = '';
for (const round of [1, 2]) {
  switch (round) {
    case 1: {
      try {
        marks += 'one;';
        break;
      } finally {
        marks += 'fin;';
      }
    }
    default:
      marks += 'default;';
  }
}
assert(marks === 'one;fin;default;', 'break from a try targets the enclosing switch');

// while loops and nested ifs between the try and its loop
let count = 0;
while (true) {
  if (count > 1) {
    try {
      count += 10;
      break;
    } finally {
      count += 1;
    }
  }
  count += 1;
}
assert(count === 13, 'break through an if inside try/finally in a while');
