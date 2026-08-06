/**
 * sessionService.ts
 *
 * Manages tax filing sessions — creation, retrieval, update, and
 * completeness scoring. Sessions are persisted locally in IndexedDB
 * and synced to the server when online.
 *
 * Requirements: 7.8 | Compliance: Session tracking
 */

import { db, type TaxSession } from '../lib/db';
import type { TaxFormData } from '../../../shared/types/form-data';
import { enqueue } from './syncService';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Session creation ────────────────────────────────────────────────────────

/**
 * Create a new tax filing session for a user and financial year.
 * The session is persisted to IndexedDB immediately and a fire-and-forget
 * sync to the server is attempted.
 */
export async function createSession(
  userId: string,
  financialYear: string,
): Promise<TaxSession> {
  const now = Date.now();
  const sessionId = `session-${userId}-${financialYear}`;

  const session: TaxSession = {
    sessionId,
    userId,
    financialYear,
    status: 'draft',
    completenessScore: 0,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.taxSessions.put(session);

  // Best-effort server sync — failure must not block local operation.
  // On network failure (offline) the request is queued in `pendingRequests`
  // and replayed by syncService when connectivity is restored.
  const syncPayload = { assessmentYear: financialYear };
  try {
    const profileArr = await db.profiles.toArray();
    const token = profileArr[0]?.authToken
      ? await db.getProfile(profileArr[0].userId).then((p) => p?.authToken)
      : undefined;

    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(syncPayload),
    });

    // Server reachable but transiently failing (5xx / throttling) — queue for retry.
    if (!response.ok && (response.status >= 500 || response.status === 429)) {
      await enqueue('/sessions', 'POST', syncPayload);
    }
  } catch {
    // Network error (offline) — queue the request so it syncs on reconnect.
    await enqueue('/sessions', 'POST', syncPayload);
  }

  return session;
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

/**
 * Get the most recently updated draft session for a user.
 * Returns null when no draft exists.
 */
export async function getActiveSession(userId: string): Promise<TaxSession | null> {
  const sessions = await db.taxSessions
    .where('[userId+status]')
    .equals([userId, 'draft'])
    .toArray();

  if (sessions.length === 0) return null;

  // Return the most recently updated one
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  return sessions[0];
}

/**
 * Get all sessions for a user, sorted newest first.
 */
export async function getAllSessions(userId: string): Promise<TaxSession[]> {
  const sessions = await db.taxSessions.where('userId').equals(userId).toArray();
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  return sessions;
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update a session in IndexedDB, marking it as pending sync.
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<TaxSession>,
): Promise<void> {
  await db.taxSessions.update(sessionId, {
    ...updates,
    updatedAt: Date.now(),
    syncStatus: 'pending' as const,
  });
}

// ─── Completeness scoring ────────────────────────────────────────────────────

/**
 * Compute a completeness score (0–100) from the current form data.
 *
 * Scoring breakdown:
 *  - personalInfo.pan filled             → 10 pts
 *  - personalInfo.fullName filled        → 10 pts
 *  - personalInfo.dob filled             → 5 pts
 *  - salaryIncome.grossSalary > 0        → 30 pts
 *  - total TDS (Q1+Q2+Q3+Q4) > 0        → 20 pts
 *  - any 80C / 80D / HRA deduction > 0  → 15 pts (optional)
 *  - business receipts > 0              → 10 pts (optional)
 *
 * Maximum: 100 points.
 */
function computeCompletenessScore(formData: TaxFormData): number {
  let score = 0;

  // ── Personal info (25 pts) ──────────────────────────────────────────────
  if (formData.personalInfo?.pan?.trim()) score += 10;
  if (formData.personalInfo?.fullName?.trim()) score += 10;
  if (formData.personalInfo?.dob?.trim()) score += 5;

  // ── Salary income (50 pts) ──────────────────────────────────────────────
  if ((formData.salaryIncome?.grossSalary ?? 0) > 0) score += 30;

  const totalTds =
    (formData.salaryIncome?.tdsQ1 ?? 0) +
    (formData.salaryIncome?.tdsQ2 ?? 0) +
    (formData.salaryIncome?.tdsQ3 ?? 0) +
    (formData.salaryIncome?.tdsQ4 ?? 0);
  if (totalTds > 0) score += 20;

  // ── Deductions (15 pts — optional) ──────────────────────────────────────
  const d = formData.deductions;
  const hasAnyDeduction =
    d &&
    (
      (d.lic ?? 0) > 0 ||
      (d.ppf ?? 0) > 0 ||
      (d.elss ?? 0) > 0 ||
      (d.nsc ?? 0) > 0 ||
      (d.homeLoanPrincipal ?? 0) > 0 ||
      (d.healthInsuranceSelf ?? 0) > 0 ||
      (d.healthInsuranceParents ?? 0) > 0 ||
      (d.rentPaid ?? 0) > 0
    );
  if (hasAnyDeduction) score += 15;

  // ── Business income (10 pts — optional) ─────────────────────────────────
  const totalReceipts =
    (formData.businessInfo?.grossReceiptsDigital ?? 0) +
    (formData.businessInfo?.grossReceiptsCash ?? 0);
  if (totalReceipts > 0) score += 10;

  return Math.min(score, 100);
}

/**
 * Compute and persist the completeness score for a session.
 * Returns the updated score (0–100).
 */
export async function updateCompleteness(
  sessionId: string,
  formData: TaxFormData,
): Promise<number> {
  const score = computeCompletenessScore(formData);
  await updateSession(sessionId, { completenessScore: score });
  return score;
}
