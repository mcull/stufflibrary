// Pure module — no side-effectful imports (see working-agreement house pattern).

/**
 * Normalize a US phone number to E.164 (+1XXXXXXXXXX).
 * Returns null when the input is not a plausible US number
 * (NANP: area code and exchange must start with 2–9).
 */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  let national: string;
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    national = digits.slice(1);
  } else {
    return null;
  }

  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
    return null;
  }

  return `+1${national}`;
}
