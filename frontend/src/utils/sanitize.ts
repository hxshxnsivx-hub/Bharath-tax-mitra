/**
 * sanitize.ts
 *
 * Centralised HTML sanitisation for any untrusted text rendered as markup —
 * primarily Bedrock chat assistant responses (task 0.9.3, design MEDIUM-3).
 *
 * The Bedrock RAG assistant (task 4.5.x) may return markdown/HTML fragments.
 * Rendering those via `dangerouslySetInnerHTML` without sanitisation is an XSS
 * vector. Every such render MUST pass through `sanitizeHtml()` first.
 *
 * Requirements: 6.1 | Compliance: XSS prevention
 */

import DOMPurify from 'dompurify';

/**
 * Tags safe to render in a chat bubble. Deliberately conservative —
 * only inline formatting, lists, links, code, and basic structure.
 * No <script>, <style>, <iframe>, <object>, <embed>, <form>, etc.
 */
const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'br', 'p', 'span',
  'ul', 'ol', 'li', 'code', 'pre', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

/**
 * Attributes permitted on allowed tags. `href`/`title` enable links;
 * `target`/`rel` are forced to safe values via the hook below.
 */
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel'];

// Force all links to open safely (no reverse-tabnabbing, no window.opener access).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Sanitise an untrusted HTML string for safe rendering.
 *
 * Strips scripts, event handlers (onclick, onerror, …), javascript: URLs,
 * and any tag/attribute not in the allow-lists above.
 *
 * @param dirty  Raw, untrusted HTML (e.g. a Bedrock chat response)
 * @returns      A sanitised HTML string safe for `dangerouslySetInnerHTML`
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Block javascript:, data:, vbscript: URIs in href
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // DOMPurify drops the content of dangerous elements (<script>, <style>)
    // by default, so `<script>alert('xss')</script>` → '' while text inside
    // allowed tags is preserved.
  });
}

/**
 * Sanitise to plain text only (no markup at all).
 * Useful for contexts that must never contain HTML — e.g. toast messages.
 *
 * @param dirty Raw, untrusted string
 * @returns     Text with all tags stripped
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
}
