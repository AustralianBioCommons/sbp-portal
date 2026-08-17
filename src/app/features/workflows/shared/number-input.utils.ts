/**
 * Parses a whole number (zero or greater). Returns null for anything else
 * (decimals, negatives, blanks, non-numeric text) so invalid input surfaces as
 * a validation error instead of being silently truncated.
 */
export function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  // Digits only: keeps blanks, signs, decimal points and exponent/hex notation
  // out before Number() gets a chance to coerce them into a valid integer.
  if (!/^\d+$/.test(trimmed)) return null;

  // isSafeInteger over isInteger: also rejects digit strings too long to
  // survive the round trip through a JS number (e.g. 20 digits).
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Parses a whole number greater than zero. Returns null for anything else. */
export function parsePositiveInteger(value: string): number | null {
  const parsed = parseWholeNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}
