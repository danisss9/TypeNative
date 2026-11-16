// Intl.Segmenter: graphemes, words and sentences (UAX #29), indexes in UTF-16 code units
// Expected values: Node 26's Intl (ICU 78)
function errName(fn: () => unknown): string {
  try {
    fn();
    return 'none';
  } catch (e) {
    return (e as Error).name;
  }
}
let failures = 0;
function eq(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    failures++;
    console.log(`FAIL ${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

const segs = (text: string, granularity: 'grapheme' | 'word' | 'sentence', locale = 'en') =>
  [...new Intl.Segmenter(locale, { granularity }).segment(text)];
const words = (text: string, locale = 'en') => segs(text, 'word', locale).map((s) => s.segment + (s.isWordLike ? '*' : '')).join('|');

eq(JSON.stringify(segs('e\u0301👨‍👩‍👧🇺🇸a\r\n한', 'grapheme').map((s) => [s.segment, s.index])), '[["é",0],["👨\u200d👩\u200d👧",2],["🇺🇸",10],["a",14],["\\r\\n",15],["한",17]]', 'graphemes');
eq(String(segs('👍🏽 ok 🇫🇷🇩🇪', 'grapheme').length), '7', 'grapheme count');
eq(words('Hello, world! It\'s 3.14 and 1,000 e.g. foo_bar a:b'), 'Hello*|,| |world*|!| |It\'s*| |3.14*| |and*| |1,000*| |e.g*|.| |foo_bar*| |a:b*', 'words');
eq(words('I ❤️ 👨‍👩‍👧 🇺🇸🇫🇷!'), 'I*| |❤️| |👨\u200d👩\u200d👧| |🇺🇸|🇫🇷|!', 'words emoji');
eq(words('カタカナ ひらがな', 'ja'), 'カタカナ*| |ひ*|ら*|が*|な*', 'words kana');
eq(JSON.stringify(segs('x 👍 y', 'word').map((s) => s.index)), '[0,1,2,4,5]', 'word indexes');
eq(JSON.stringify(segs('Hi. There! Is it 3.14? Yes. e.g. this one. Mr. Smith went.\nNew "quoted." Done', 'sentence').map((s) => s.segment)), '["Hi. ","There! ","Is it 3.14? ","Yes. e.g. this one. ","Mr. ","Smith went.\\n","New \\"quoted.\\" ","Done"]', 'sentences');
eq(JSON.stringify(segs('Wait... What?! OK', 'sentence').map((s) => s.segment)), '["Wait... ","What?! ","OK"]', 'sentence terminators');
eq(JSON.stringify(new Intl.Segmenter('en', { granularity: 'word' }).segment('Hello world').containing(8)), '{"segment":"world","index":6,"input":"Hello world","isWordLike":true}', 'containing');
eq(JSON.stringify(new Intl.Segmenter('en').segment('ab').containing()), '{"segment":"a","index":0,"input":"ab"}', 'containing default');
eq(String(new Intl.Segmenter('en').segment('ab').containing(5)), 'undefined', 'containing past the end');
eq(JSON.stringify(segs('ab', 'grapheme')[1]), '{"segment":"b","index":1,"input":"ab"}', 'segment data');
eq(String(segs('', 'word').length), '0', 'empty input');
eq(JSON.stringify(new Intl.Segmenter('fr', { granularity: 'sentence' }).resolvedOptions()), '{"locale":"fr","granularity":"sentence"}', 'resolvedOptions');

assert(failures === 0, `${failures} Intl check(s) failed`);
console.log('lib-intl-segmenter ok');
