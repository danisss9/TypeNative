import punycode from 'node:punycode';

assert(punycode.encode('mañana') === 'maana-pta', 'encode');
assert(punycode.decode('maana-pta') === 'mañana', 'decode');
assert(punycode.encode('☃-⌘') === '--dqo34k', 'encode symbols');
assert(punycode.toASCII('mañana.com') === 'xn--maana-pta.com', 'toASCII');
assert(punycode.toUnicode('xn--maana-pta.com') === 'mañana.com', 'toUnicode');
assert(punycode.toASCII('example.com') === 'example.com', 'ASCII domains are unchanged');
