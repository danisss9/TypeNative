const m = /(\w+)@(\w+)/.exec('me@host');
assert(m !== null && m[1] === 'me' && m[2] === 'host', 'groups');
