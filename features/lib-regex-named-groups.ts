const m = /(?<user>\w+)@/.exec('me@host');
assert(m?.groups?.user === 'me', 'named groups');
