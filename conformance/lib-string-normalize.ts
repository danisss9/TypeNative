const composed: string = 'caf\u00e9';
const decomposed: string = 'cafe\u0301';
assert(composed !== decomposed && composed.normalize('NFC') === decomposed.normalize('NFC') && decomposed.normalize('NFC').length === 4, 'normalize');
