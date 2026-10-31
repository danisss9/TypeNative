// toUpperCase / toLowerCase as JS maps case: one character to several
// (ß → SS, ﬁ → FI, İ → i̇), ẞ → ß, and Σ → ς at the end of a word
assert('straße'.toUpperCase() === 'STRASSE', 'ß upper-cases to SS');
assert('ﬁne'.toUpperCase() === 'FINE', 'ligature to two letters');
assert('ẞ'.toLowerCase() === 'ß' && 'ẞ'.toUpperCase() === 'ẞ', 'capital sharp s');
assert('İ'.toLowerCase() === 'i̇' && 'İ'.toLowerCase().length === 2, 'dotted capital I');
assert('ΟΔΟΣ'.toLowerCase() === 'οδος', 'final sigma');
assert('ΣΑ'.toLowerCase() === 'σα' && 'Σ'.toLowerCase() === 'σ', 'sigma elsewhere');
assert('ΑΣ ΟΣ.'.toLowerCase() === 'ας ος.', 'final sigma before a space and punctuation');
assert('[ẞ]'.toLowerCase().toUpperCase() === '[SS]', 'case folding as marked normalizes labels');
const label: any = 'Ǆ';
assert(label.toLowerCase() === 'ǆ' && 'ǅ'.toUpperCase() === 'Ǆ', 'titlecase digraphs, also through any');
