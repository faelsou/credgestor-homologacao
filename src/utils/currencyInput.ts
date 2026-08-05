/**
 * Helpers for Brazilian currency text inputs (xxx,xx).
 * Display uses comma as decimal separator; parsing accepts comma or dot.
 */

const MAX_INTEGER_DIGITS = 12;
const DECIMAL_PLACES = 2;

/** Formats a number as Brazilian currency input text without R$ (e.g. 200 -> "200,00"). */
export const formatCurrencyInput = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) {
    return '';
  }

  return value.toFixed(DECIMAL_PLACES).replace('.', ',');
};

/**
 * Sanitizes raw user input while typing.
 * Keeps digits and a single decimal separator (normalized to comma).
 * Allows intermediate states like "200," or "200,5".
 */
export const sanitizeCurrencyInput = (raw: string): string => {
  if (!raw) return '';

  let cleaned = raw.replace(/[^\d,.]/g, '');
  let hasDecimal = false;
  let integerDigits = '';
  let decimalDigits = '';

  for (const char of cleaned) {
    if (char === ',' || char === '.') {
      if (!hasDecimal) {
        hasDecimal = true;
      }
      continue;
    }

    if (!hasDecimal) {
      if (integerDigits.length < MAX_INTEGER_DIGITS) {
        integerDigits += char;
      }
    } else if (decimalDigits.length < DECIMAL_PLACES) {
      decimalDigits += char;
    }
  }

  // Avoid leading zeros like "00" while still allowing "0," / "0,5"
  if (integerDigits.length > 1) {
    integerDigits = integerDigits.replace(/^0+(?=\d)/, '');
  }

  if (!hasDecimal) {
    return integerDigits;
  }

  return `${integerDigits || '0'},${decimalDigits}`;
};

/** Parses Brazilian currency input text into a number. Returns null if invalid/empty. */
export const parseCurrencyInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed || /^[,.]+$/.test(trimmed)) {
    return null;
  }

  const sanitized = sanitizeCurrencyInput(trimmed);
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized.replace(/,$/, '').replace(',', '.');
  if (!normalized) {
    return null;
  }

  const value = Number.parseFloat(normalized);

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
};
