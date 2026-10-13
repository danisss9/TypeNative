let ticks = 0;
const id = setInterval(() => {
  ticks++;
  if (ticks === 3) {
    clearInterval(id);
    assert(ticks === 3, 'interval');
  }
}, 1);
