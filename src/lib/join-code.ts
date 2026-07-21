import crypto from 'crypto';

/**
 * Crockford base32: excludes I, L, O and U. I/L/O are dropped because they are
 * misread as 1/0 in print; U is dropped because it makes accidental obscenity
 * far less likely on something printed fifty times.
 */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const JOIN_CODE_LENGTH = 8;

/**
 * Substrings a generated code must not contain. Short and conservative — the
 * missing vowels already make most words unreachable. Expand as needed; the
 * cost of a false positive is one extra generation loop.
 */
const FORBIDDEN = ['5H1T', 'A55', 'D1CK', 'C0CK', 'B00B', '5EX', 'N4Z1'];

function containsForbidden(code: string): boolean {
  return FORBIDDEN.some((word) => code.includes(word));
}

/**
 * 32 divides 256 evenly (256 / 32 = 8), so `byte % 32` is uniform over the
 * alphabet with no modulo bias and no rejection sampling needed.
 */
export function generateJoinCode(length: number = JOIN_CODE_LENGTH): string {
  for (;;) {
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (const byte of bytes) {
      code += CROCKFORD_ALPHABET[byte % 32];
    }
    if (!containsForbidden(code)) return code;
  }
}

/**
 * Turns anything a human might type or paste into the canonical lookup key.
 * Per Crockford, I and L decode to 1 and O decodes to 0, so a misread off a
 * printed flyer still resolves.
 */
export function normalizeJoinCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

/** Display form: XKF7-2M9Q. Never stored — storage is always unhyphenated. */
export function formatJoinCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)}-${code.slice(mid)}`;
}
