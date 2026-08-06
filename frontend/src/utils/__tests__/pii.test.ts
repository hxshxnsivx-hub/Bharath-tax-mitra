/**
 * PII redaction helpers (task 4.1.3).
 */

import { describe, it, expect } from 'vitest';
import { redactPAN, redactAadhaar, redactMobile, redactAccountNo, redactTail } from '../pii';

describe('redactPAN', () => {
  it('masks all but the last 4 (AAAAA9999A → XXXXXX234F)', () => {
    expect(redactPAN('ABCDE1234F')).toBe('XXXXXX234F');
  });
  it('uppercases before masking', () => {
    expect(redactPAN('abcde1234f')).toBe('XXXXXX234F');
  });
  it('renders an em dash for empty input', () => {
    expect(redactPAN('')).toBe('—');
    expect(redactPAN(undefined)).toBe('—');
  });
});

describe('redactAadhaar', () => {
  it('formats a full 12-digit number as XXXX-XXXX-1234', () => {
    expect(redactAadhaar('123456787676')).toBe('XXXX-XXXX-7676');
  });
  it('tolerates dashes and spaces in the input', () => {
    expect(redactAadhaar('1234-5678-7676')).toBe('XXXX-XXXX-7676');
    expect(redactAadhaar('1234 5678 7676')).toBe('XXXX-XXXX-7676');
  });
  it('falls back to tail masking for a partial number', () => {
    expect(redactAadhaar('12345678')).toBe('XXXX5678');
  });
  it('never leaks the first 8 digits', () => {
    expect(redactAadhaar('123456787676')).not.toContain('1234567');
  });
});

describe('redactMobile', () => {
  it('masks a 10-digit number to the last 4', () => {
    expect(redactMobile('9876543210')).toBe('XXXXXX3210');
  });
  it('strips a +91 country code before masking', () => {
    expect(redactMobile('+91 98765 43210')).toBe('XXXXXX3210');
  });
});

describe('redactAccountNo / redactTail', () => {
  it('shows only the last 4 of an account number', () => {
    expect(redactAccountNo('50100123456789')).toBe('XXXXXXXXXX6789');
  });
  it('returns short values unmasked (nothing to hide)', () => {
    expect(redactTail('1234')).toBe('1234');
  });
});
