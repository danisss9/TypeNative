assert(encodeURIComponent('a b&c') === 'a%20b%26c' && decodeURIComponent('a%20b') === 'a b', 'uri');
