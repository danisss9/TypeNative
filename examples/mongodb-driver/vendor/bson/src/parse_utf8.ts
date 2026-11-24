import { BSONError } from './error';

// (TypeNative: use the platform TextDecoder directly)
let TextDecoderFatal: TextDecoder;
let TextDecoderNonFatal: TextDecoder;

/**
 * Determines if the passed in bytes are valid utf8
 * @param bytes - An array of 8-bit bytes. Must be indexable and have length property
 * @param start - The index to start validating
 * @param end - The index to end validating
 */
export function parseUtf8(buffer: Uint8Array, start: number, end: number, fatal: boolean): string {
  if (fatal) {
    TextDecoderFatal ??= new TextDecoder('utf8', { fatal: true });
    try {
      return TextDecoderFatal.decode(buffer.subarray(start, end));
    } catch (cause) {
      throw new BSONError('Invalid UTF-8 string in BSON document', { cause });
    }
  }
  TextDecoderNonFatal ??= new TextDecoder('utf8', { fatal: false });
  return TextDecoderNonFatal.decode(buffer.subarray(start, end));
}
