const url: string = import.meta.url;
assert(url.startsWith('file://'), 'import meta url');
assert(url.length > 'file://'.length, 'import meta url path');
