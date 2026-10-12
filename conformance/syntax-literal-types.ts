type Dir = 'up' | 'down';
function flip(d: Dir): Dir { return d === 'up' ? 'down' : 'up'; }
assert(flip('up') === 'down', 'literal types');
