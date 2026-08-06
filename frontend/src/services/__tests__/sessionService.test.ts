/**
 * Unit tests for sessionService.ts
 *
 * Requirements: 7.8 | Compliance: Session tracking
 *
 * Uses fake-indexeddb to provide an in-memory IndexedDB implementation so
 * the tests can run in the jsdom environment without a real browser.
 */

// Must be imported before Dexie/db to polyfill indexedDB globals
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSession,
  getActiveSession,
  getAllSessions,
  updateSession,
  updateCompleteness,
} from '../sessionService';
import { db } from '@/lib/db';
import type { TaxFormData } from '../../../../shared/types/form-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid TaxFormData with nothing filled in */
function emptyFormData(financialYear = 'FY2025-26'): TaxFormData {
  return {
    personalInfo: {},
    salaryIncome: {},
    deductions: {},
    businessInfo: {},
    selectedRegime: 'new',
    financialYear,
  };
}

/** Fully filled TaxFormData that should score 100 */
function fullFormData(): TaxFormData {
  return {
    personalInfo: { pan: 'ABCDE1234F', fullName: 'Ramesh Kumar', dob: '01/01/1985' },
    salaryIncome: {
      grossSalary: 1000000,
      tdsQ1: 25000,
      tdsQ2: 25000,
      tdsQ3: 25000,
      tdsQ4: 25000,
    },
    deductions: { lic: 50000 },
    businessInfo: { grossReceiptsDigital: 200000, grossReceiptsCash: 0 },
    selectedRegime: 'new',
    financialYear: 'FY2025-26',
  };
}

// ---------------------------------------------------------------------------
// Setup — clear sessions table and reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await db.taxSessions.clear();
  await db.pendingRequests.clear();
  vi.restoreAllMocks();
  // Suppress fire-and-forget fetch noise in tests
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------

describe('createSession', () => {
  it('creates a session with a deterministic sessionId', async () => {
    const session = await createSession('user-1', 'FY2025-26');
    expect(session.sessionId).toBe('session-user-1-FY2025-26');
  });

  it('stores the session in IndexedDB', async () => {
    await createSession('user-2', 'FY2025-26');
    const stored = await db.taxSessions.get('session-user-2-FY2025-26');
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe('user-2');
    expect(stored?.financialYear).toBe('FY2025-26');
  });

  it('sets initial status to draft and completenessScore to 0', async () => {
    const session = await createSession('user-3', 'FY2025-26');
    expect(session.status).toBe('draft');
    expect(session.completenessScore).toBe(0);
  });

  it('sets syncStatus to pending', async () => {
    const session = await createSession('user-4', 'FY2025-26');
    expect(session.syncStatus).toBe('pending');
  });

  it('fires a POST /sessions request (fire-and-forget)', async () => {
    await createSession('user-5', 'FY2025-26');
    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 10));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/sessions'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('does not throw if the server POST fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    await expect(createSession('user-6', 'FY2025-26')).resolves.toBeDefined();
  });

  it('queues the request in pendingRequests when the server POST fails (offline)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    await createSession('user-7', 'FY2025-26');

    const queued = await db.pendingRequests.toArray();
    expect(queued).toHaveLength(1);
    expect(queued[0].endpoint).toBe('/sessions');
    expect(queued[0].method).toBe('POST');
    expect(queued[0].payload).toEqual({ assessmentYear: 'FY2025-26' });
  });

  it('queues the request when the server responds with a 5xx error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await createSession('user-8', 'FY2025-26');

    const queued = await db.pendingRequests.toArray();
    expect(queued).toHaveLength(1);
    expect(queued[0].endpoint).toBe('/sessions');
  });

  it('does NOT queue the request on a successful POST', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    await createSession('user-9', 'FY2025-26');

    const queued = await db.pendingRequests.toArray();
    expect(queued).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getActiveSession
// ---------------------------------------------------------------------------

describe('getActiveSession', () => {
  it('returns null when there are no sessions', async () => {
    const result = await getActiveSession('nobody');
    expect(result).toBeNull();
  });

  it('returns the most-recent draft session', async () => {
    const now = Date.now();
    await db.taxSessions.bulkAdd([
      {
        sessionId: 's-old',
        userId: 'u1',
        financialYear: 'FY2024-25',
        status: 'draft',
        completenessScore: 0,
        createdAt: now - 20000,
        updatedAt: now - 20000,
        syncStatus: 'synced',
      },
      {
        sessionId: 's-new',
        userId: 'u1',
        financialYear: 'FY2025-26',
        status: 'draft',
        completenessScore: 50,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'synced',
      },
    ]);

    const active = await getActiveSession('u1');
    expect(active?.sessionId).toBe('s-new');
  });

  it('ignores non-draft sessions', async () => {
    await db.taxSessions.add({
      sessionId: 's-filed',
      userId: 'u2',
      financialYear: 'FY2025-26',
      status: 'filed',
      completenessScore: 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
    });

    const active = await getActiveSession('u2');
    expect(active).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getAllSessions
// ---------------------------------------------------------------------------

describe('getAllSessions', () => {
  it('returns all sessions for the user regardless of status', async () => {
    await db.taxSessions.bulkAdd([
      {
        sessionId: 'sa1',
        userId: 'ua',
        financialYear: 'FY2024-25',
        status: 'filed',
        completenessScore: 100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'synced',
      },
      {
        sessionId: 'sa2',
        userId: 'ua',
        financialYear: 'FY2025-26',
        status: 'draft',
        completenessScore: 30,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending',
      },
      {
        sessionId: 'sb1',
        userId: 'ub',
        financialYear: 'FY2025-26',
        status: 'draft',
        completenessScore: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending',
      },
    ]);

    const uaSessions = await getAllSessions('ua');
    expect(uaSessions).toHaveLength(2);
    expect(uaSessions.map((s) => s.sessionId)).toEqual(
      expect.arrayContaining(['sa1', 'sa2'])
    );
  });

  it('returns empty array when user has no sessions', async () => {
    const result = await getAllSessions('ghost-user');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateSession
// ---------------------------------------------------------------------------

describe('updateSession', () => {
  it('applies partial updates and sets syncStatus to pending', async () => {
    await db.taxSessions.add({
      sessionId: 'upd-1',
      userId: 'u-upd',
      financialYear: 'FY2025-26',
      status: 'draft',
      completenessScore: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
    });

    await updateSession('upd-1', { status: 'review', completenessScore: 80 });

    const updated = await db.taxSessions.get('upd-1');
    expect(updated?.status).toBe('review');
    expect(updated?.completenessScore).toBe(80);
    expect(updated?.syncStatus).toBe('pending');
  });

  it('updates the updatedAt timestamp', async () => {
    const originalTime = Date.now() - 10000;
    await db.taxSessions.add({
      sessionId: 'upd-2',
      userId: 'u-upd2',
      financialYear: 'FY2025-26',
      status: 'draft',
      completenessScore: 0,
      createdAt: originalTime,
      updatedAt: originalTime,
      syncStatus: 'synced',
    });

    await updateSession('upd-2', { completenessScore: 50 });

    const updated = await db.taxSessions.get('upd-2');
    expect(updated?.updatedAt).toBeGreaterThan(originalTime);
  });
});

// ---------------------------------------------------------------------------
// updateCompleteness
// ---------------------------------------------------------------------------

describe('updateCompleteness', () => {
  async function seedSession(sessionId: string) {
    await db.taxSessions.add({
      sessionId,
      userId: 'score-user',
      financialYear: 'FY2025-26',
      status: 'draft',
      completenessScore: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
    });
  }

  it('scores 0 for completely empty form data', async () => {
    await seedSession('sc-empty');
    const score = await updateCompleteness('sc-empty', emptyFormData());
    expect(score).toBe(0);
  });

  it('scores 100 for fully filled form data', async () => {
    await seedSession('sc-full');
    const score = await updateCompleteness('sc-full', fullFormData());
    expect(score).toBe(100);
  });

  it('awards 10 pts for pan only', async () => {
    await seedSession('sc-pan');
    const data = emptyFormData();
    data.personalInfo = { pan: 'ABCDE1234F' };
    const score = await updateCompleteness('sc-pan', data);
    expect(score).toBe(10);
  });

  it('awards 10 pts for fullName only', async () => {
    await seedSession('sc-name');
    const data = emptyFormData();
    data.personalInfo = { fullName: 'Test User' };
    const score = await updateCompleteness('sc-name', data);
    expect(score).toBe(10);
  });

  it('awards 5 pts for dob only', async () => {
    await seedSession('sc-dob');
    const data = emptyFormData();
    data.personalInfo = { dob: '01/01/1990' };
    const score = await updateCompleteness('sc-dob', data);
    expect(score).toBe(5);
  });

  it('awards 30 pts for grossSalary > 0', async () => {
    await seedSession('sc-salary');
    const data = emptyFormData();
    data.salaryIncome = { grossSalary: 500000 };
    const score = await updateCompleteness('sc-salary', data);
    expect(score).toBe(30);
  });

  it('does not award salary points when grossSalary is 0', async () => {
    await seedSession('sc-salary-zero');
    const data = emptyFormData();
    data.salaryIncome = { grossSalary: 0 };
    const score = await updateCompleteness('sc-salary-zero', data);
    expect(score).toBe(0);
  });

  it('awards 20 pts when total TDS > 0', async () => {
    await seedSession('sc-tds');
    const data = emptyFormData();
    data.salaryIncome = { tdsQ1: 5000 };
    const score = await updateCompleteness('sc-tds', data);
    expect(score).toBe(20);
  });

  it('awards 15 pts for any 80C deduction', async () => {
    await seedSession('sc-80c');
    const data = emptyFormData();
    data.deductions = { lic: 10000 };
    const score = await updateCompleteness('sc-80c', data);
    expect(score).toBe(15);
  });

  it('awards 15 pts for any 80D deduction', async () => {
    await seedSession('sc-80d');
    const data = emptyFormData();
    data.deductions = { healthInsuranceSelf: 20000 };
    const score = await updateCompleteness('sc-80d', data);
    expect(score).toBe(15);
  });

  it('awards 15 pts for rentPaid', async () => {
    await seedSession('sc-rent');
    const data = emptyFormData();
    data.deductions = { rentPaid: 12000 };
    const score = await updateCompleteness('sc-rent', data);
    expect(score).toBe(15);
  });

  it('awards 10 pts for business gross receipts > 0', async () => {
    await seedSession('sc-biz');
    const data = emptyFormData();
    data.businessInfo = { grossReceiptsDigital: 100000, grossReceiptsCash: 0 };
    const score = await updateCompleteness('sc-biz', data);
    expect(score).toBe(10);
  });

  it('does not award business points when both receipts are 0', async () => {
    await seedSession('sc-biz-zero');
    const data = emptyFormData();
    data.businessInfo = { grossReceiptsDigital: 0, grossReceiptsCash: 0 };
    const score = await updateCompleteness('sc-biz-zero', data);
    expect(score).toBe(0);
  });

  it('persists the computed score to IndexedDB', async () => {
    await seedSession('sc-persist');
    await updateCompleteness('sc-persist', fullFormData());
    const stored = await db.taxSessions.get('sc-persist');
    expect(stored?.completenessScore).toBe(100);
  });

  it('score never exceeds 100', async () => {
    await seedSession('sc-cap');
    const score = await updateCompleteness('sc-cap', fullFormData());
    expect(score).toBeLessThanOrEqual(100);
  });
});
