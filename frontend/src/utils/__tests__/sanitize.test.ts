import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText } from '../sanitize';

describe('sanitizeHtml — XSS prevention for Bedrock chat responses (task 0.9.3)', () => {
  it('strips a <script> tag to empty string', () => {
    const dirty = "<script>alert('xss')</script>";
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('');
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('alert');
  });

  it('strips script tags but keeps surrounding safe text', () => {
    const dirty = "Hello <script>alert('xss')</script>World";
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('Hello');
    expect(clean).toContain('World');
  });

  it('removes inline event handlers (onerror)', () => {
    const dirty = '<img src="x" onerror="alert(1)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert');
  });

  it('strips javascript: URLs from links', () => {
    const dirty = '<a href="javascript:alert(1)">click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('javascript:');
  });

  it('preserves safe formatting tags', () => {
    const dirty = '<p>Your tax is <strong>₹12,500</strong></p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<strong>');
    expect(clean).toContain('₹12,500');
    expect(clean).toContain('<p>');
  });

  it('preserves lists and code blocks', () => {
    const dirty = '<ul><li>80C</li><li>80D</li></ul><code>tax</code>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<li>80C</li>');
    expect(clean).toContain('<code>');
  });

  it('forces safe rel/target on links', () => {
    const dirty = '<a href="https://incometax.gov.in">portal</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain('target="_blank"');
  });

  it('strips disallowed tags like iframe', () => {
    const dirty = '<iframe src="https://evil.com"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('iframe');
  });

  it('returns empty string for empty/null-ish input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('sanitizeText — plain-text-only sanitisation', () => {
  it('strips all markup but keeps text content', () => {
    const dirty = '<b>Bold</b> and <script>alert(1)</script> text';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('<b>');
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('Bold');
    expect(clean).toContain('text');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });
});
