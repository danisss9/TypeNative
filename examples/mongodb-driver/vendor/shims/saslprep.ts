// A stand-in for `@mongodb-js/saslprep`, which ships only compiled JavaScript.
// SCRAM applies SASLprep (RFC 4013) to usernames and passwords. This covers the
// RFC's mapping + NFKC normalization for the text the example sends; the
// prohibition tables (unassigned code points, bidi checks) are not included.
export function saslprep(input: string): string {
  // RFC 4013 §2.1 common mappings: non-ASCII spaces → space,
  // "commonly mapped to nothing" → removed (soft hyphen, zero-width marks…).
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (
      code === 0x00ad ||
      (code >= 0x200b && code <= 0x200d) ||
      code === 0x2060 ||
      code === 0xfeff
    ) {
      continue;
    }
    if (
      code === 0x00a0 ||
      code === 0x1680 ||
      (code >= 0x2000 && code <= 0x200a) ||
      code === 0x202f ||
      code === 0x205f ||
      code === 0x3000
    ) {
      out += ' ';
      continue;
    }
    out += ch;
  }
  return out.normalize('NFKC');
}
