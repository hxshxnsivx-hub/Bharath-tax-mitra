/**
 * PII redaction helpers (task 4.1.3).
 *
 * Single source for how sensitive identifiers are shown on screen and in
 * exports: everything but the last 4 characters is masked. Used by the
 * printable summary, results screens, and any future document-review UI so
 * redaction can never drift between surfaces.
 *
 * Redaction is display-only — the underlying value stays intact in encrypted
 * IndexedDB and in the ITR JSON that the IT Portal requires in full.
 */

/** Mask all but the last 4 characters. `ABCDE1234F` → `XXXXXX234F`. */
export function redactTail(value: string | undefined | null, maskChar = 'X'): string {
  const v = (value ?? '').toString().trim();
  if (!v) return '—';
  if (v.length <= 4) return v;
  return maskChar.repeat(v.length - 4) + v.slice(-4);
}

/** PAN: `ABCDE1234F` → `XXXXXX234F` (last 4 visible). */
export function redactPAN(pan: string | undefined | null): string {
  return redactTail((pan ?? '').toUpperCase());
}

/**
 * Aadhaar: 12 digits → `XXXX-XXXX-1234`. Accepts spaced/dashed input.
 * Falls back to plain tail-masking if the value isn't a full 12 digits.
 */
export function redactAadhaar(aadhaar: string | undefined | null): string {
  const digits = (aadhaar ?? '').replace(/\D/g, '');
  if (!digits) return '—';
  if (digits.length !== 12) return redactTail(digits);
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

/** Mobile: 10 digits → `XXXXXX7890`. Tolerates +91 / spaces. */
export function redactMobile(mobile: string | undefined | null): string {
  const digits = (mobile ?? '').replace(/\D/g, '');
  if (!digits) return '—';
  const last10 = digits.slice(-10);
  return redactTail(last10);
}

/** Bank account: show only the last 4. */
export function redactAccountNo(acct: string | undefined | null): string {
  return redactTail((acct ?? '').replace(/\s/g, ''));
}
