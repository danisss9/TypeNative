const a = [1, 2, 3, 4];
const removed = a.splice(1, 2);
assert(removed.length === 2 && a.join() === '1,4', 'splice');
