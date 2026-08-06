/**
 * IFSC → bank/branch lookup (task 3.3.1).
 *
 * Uses the public, keyless Razorpay IFSC API. Best-effort and privacy-benign
 * (an IFSC is a public branch identifier, not user PII). Degrades gracefully:
 * returns null on offline / error / 404 so the user can always type the bank
 * name manually. Never throws.
 */

export interface IFSCDetails {
  bank: string;
  branch: string;
}

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** True if the string is a well-formed IFSC (AAAA0XXXXXX). */
export function isValidIFSC(ifsc: string): boolean {
  return IFSC_RE.test(ifsc.toUpperCase());
}

export async function lookupIFSC(ifsc: string): Promise<IFSCDetails | null> {
  const code = ifsc.toUpperCase().trim();
  if (!isValidIFSC(code)) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${code}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { BANK?: string; BRANCH?: string };
    if (!data.BANK) return null;
    return { bank: data.BANK, branch: data.BRANCH ?? '' };
  } catch {
    return null; // offline / network error / abort
  } finally {
    clearTimeout(timeout);
  }
}
