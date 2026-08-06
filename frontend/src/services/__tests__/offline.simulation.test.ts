/**
 * Integration tests: offline-first behaviour (airplane-mode simulation)
 *
 * Task 1.7.3 — Phase 1 checkpoint validation.
 *
 * Where the existing unit suites prove individual pieces in isolation
 * (syncService.test.ts, taxRulesService.test.ts, sessionService.test.ts),
 * this suite exercises the full offline → online → replay lifecycle the way a
 * real device would experience it when connectivity drops ("airplane mode")
 * and later returns.
 *
 * "Airplane mode" is simulated by:
 *   - forcing `navigator.onLine` to false via a getter spy, and
 *   - making `fetch` reject with a network error (TypeError, as browsers do).
 *
 * "Back online" is simulated by:
 *   - flipping the `navigator.onLine` getter to true,
 *   - making `fetch` resolve successfully, and
 *   - either dispatching the `window` `online` event (Safari iOS fallback path)
 *     or calling `startSync()` directly (the path the BackgroundSync service
 *     worker uses when it posts BTM_SYNC_TRIGGER back into the page context).
 *
 * Requirements: 5.9, 10.2, 10.4, 10.5, 10.6, 20.1
 * Compliance: Offline-first operation, data integrity, Safari iOS fallback
 */

import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { TaxCalculator } from '../taxCalculator';
import { taxRulesService, defaultTaxRules } from '../taxRulesService';
import { createSession } from '../sessionService';
import {
  enqueue,
  startSync,
  getSyncStatus,
  formatSyncStatus,
  initSyncListeners,
} from '../syncService';
import type { IncomeData, DeductionData } from '../../../../shared/types/tax-calculation';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function zeroDeductions(): DeductionData {
  return {
    section80C: {
      lic: 0,
      ppf: 0,
      elss: 0,
      nsc: 0,
      homeLoanPrincipal: 0,
      tuitionFees: 0,
      sukanyaSamriddhi: 0,
      other: 0,
    },
    section80CCD1B: { npsAdditional: 0 },
    section80D: {
      selfPremium: 0,
      parentsPremium: 0,
      preventiveHealthCheckup: 0,
      isSelfSenior: false,
      isParentsSenior: false,
    },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 0, isMetro: false },
    section16: { professionalTax: 0 },
  };
}

function salaryIncome(grossSalary: number): IncomeData {
  return {
    salary: {
      grossSalary,
      basicSalary: Math.round(grossSalary * 0.4),
      hraReceived: 0,
      specialAllowance: 0,
      otherAllowances: 0,
      professionalTax: 0,
    },
  };
}

// ─── Network simulation helpers ────────────────────────────────────────────────

/**
 * Put the simulated device into "airplane mode":
 *  - navigator.onLine reports false
 *  - every fetch rejects like a real offline network error (TypeError)
 */
function goOffline(): void {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  );
}

/**
 * Restore connectivity:
 *  - navigator.onLine reports true
 *  - fetch resolves OK and records each call so we can assert replay order
 * Returns the fetch mock for assertions.
 */
function goOnline(): ReturnType<typeof vi.fn> {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Flush pending microtasks / short timers so async listeners settle. */
function flush(ms = 30): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Setup / teardown ───────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.open();
  await db.pendingRequests.clear();
  await db.taxSessions.clear();
  await db.taxRules.clear();
  await taxRulesService.clearCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ─── 1. App keeps working while offline ──────────────────────────────────────────

describe('airplane mode — app keeps working offline', () => {
  it('performs tax calculation entirely offline (no network dependency)', async () => {
    goOffline();

    // The calculator is pure client-side logic — it must not need the network.
    const calculator = new TaxCalculator(defaultTaxRules);
    const result = calculator.compareRegimes(salaryIncome(1_000_000), zeroDeductions());

    expect(result.oldRegime.totalTaxLiability).toBeGreaterThanOrEqual(0);
    expect(result.newRegime.totalTaxLiability).toBeGreaterThanOrEqual(0);
    expect(['old', 'new']).toContain(result.recommendedRegime);
    // fetch must never have been touched by a calculation.
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('serves tax rules from the IndexedDB cache while offline', async () => {
    // Simulate a prior online session having cached the rules.
    await db.taxRules.put({
      financialYear: 'FY2025-26',
      version: defaultTaxRules.version,
      rules: defaultTaxRules,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    (taxRulesService as unknown as { cachedRules: unknown }).cachedRules = null;

    goOffline();

    const rules = await taxRulesService.getTaxRules('FY2025-26');
    expect(rules.version).toBe(defaultTaxRules.version);
    expect(rules.newRegime.slabs).toEqual(defaultTaxRules.newRegime.slabs);
    // Rule retrieval must not have hit the network.
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('offline calculation (cached rules) is identical to bundled-rules calculation', async () => {
    await db.taxRules.put({
      financialYear: 'FY2025-26',
      version: defaultTaxRules.version,
      rules: defaultTaxRules,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    (taxRulesService as unknown as { cachedRules: unknown }).cachedRules = null;

    goOffline();

    const cachedRules = await taxRulesService.getTaxRules('FY2025-26');
    const offlineCalc = new TaxCalculator(cachedRules);
    const onlineCalc = new TaxCalculator(defaultTaxRules);

    for (const gross of [0, 700_000, 1_500_000, 6_000_000]) {
      const income = salaryIncome(gross);
      const ded = zeroDeductions();
      expect(offlineCalc.compareRegimes(income, ded)).toEqual(
        onlineCalc.compareRegimes(income, ded),
      );
    }
  });

  it('queues server-bound actions instead of throwing, and the app continues', async () => {
    goOffline();

    // createSession would normally POST /sessions. Offline it must not throw —
    // it persists locally and queues the request for later replay.
    const session = await createSession('user-offline-1', 'FY2025-26');

    // Local write succeeded so the user can keep filing.
    expect(session.sessionId).toBe('session-user-offline-1-FY2025-26');
    const stored = await db.taxSessions.get(session.sessionId);
    expect(stored).toBeDefined();

    // The server call was captured into the offline queue.
    const queued = await db.pendingRequests.toArray();
    expect(queued).toHaveLength(1);
    expect(queued[0].endpoint).toBe('/sessions');
    expect(queued[0].method).toBe('POST');
    expect(queued[0].payload).toEqual({ assessmentYear: 'FY2025-26' });
  });

  it('reports the pending count via getSyncStatus / formatSyncStatus while offline', async () => {
    goOffline();

    await createSession('user-offline-2', 'FY2025-26');
    await enqueue('/profile', 'PUT', { lang: 'hi' });

    const status = await getSyncStatus();
    expect(status.pending).toBe(2);
    expect(formatSyncStatus(status.pending)).toBe('2 operations pending sync');
  });
});

// ─── 2. Recovery: back online → replay → drain ───────────────────────────────────

describe('back online — queued operations replay and the queue drains', () => {
  it('replays the queue via startSync (BackgroundSync / SW-triggered path)', async () => {
    // ── Airplane mode: queue work ──────────────────────────────────────────
    goOffline();
    await createSession('user-recover-1', 'FY2025-26');
    await enqueue('/profile', 'PUT', { lang: 'ta' });

    let status = await getSyncStatus();
    expect(status.pending).toBe(2);

    // ── Connectivity restored ──────────────────────────────────────────────
    const fetchMock = goOnline();

    // The service worker, on its `sync` event, posts BTM_SYNC_TRIGGER back to
    // the page which calls startSync() in the page context. Simulate that call.
    await startSync();

    // Every queued op was replayed against the real endpoint…
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/sessions'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/profile'),
      expect.objectContaining({ method: 'PUT' }),
    );

    // …and the queue is now empty with a recorded sync timestamp.
    status = await getSyncStatus();
    expect(status.pending).toBe(0);
    expect(status.lastSyncAt).not.toBeNull();
    expect(formatSyncStatus(status.pending)).toBe('All changes synced');
  });

  it('replays the queue via the window "online" event (Safari iOS fallback path)', async () => {
    // ── Airplane mode: queue work ──────────────────────────────────────────
    goOffline();
    await enqueue('/sessions', 'POST', { assessmentYear: 'FY2025-26' });
    expect((await getSyncStatus()).pending).toBe(1);

    // ── Register the Safari fallback listener, then come back online ────────
    initSyncListeners(); // wires window.addEventListener('online', startSync)
    const fetchMock = goOnline();

    // Dispatch the same event the browser fires when connectivity returns.
    window.dispatchEvent(new Event('online'));
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/sessions'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect((await getSyncStatus()).pending).toBe(0);
  });

  it('does NOT replay while still offline even if startSync is invoked', async () => {
    goOffline();
    await enqueue('/sessions', 'POST', { assessmentYear: 'FY2025-26' });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    // startSync guards on navigator.onLine — still false here.
    await startSync();

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await getSyncStatus()).pending).toBe(1);
  });
});

// ─── 3. Replay ordering (FIFO) ───────────────────────────────────────────────────

describe('back online — queued operations replay in FIFO order', () => {
  it('replays requests oldest-first, matching enqueue order', async () => {
    goOffline();

    // Space the enqueues so their timestamps are strictly increasing.
    await enqueue('/first', 'POST', { order: 1 });
    await flush(5);
    await enqueue('/second', 'PUT', { order: 2 });
    await flush(5);
    await enqueue('/third', 'PATCH', { order: 3 });

    expect((await getSyncStatus()).pending).toBe(3);

    const fetchMock = goOnline();
    await startSync();

    // Reconstruct the endpoint order from the recorded fetch calls.
    const calledEndpoints = fetchMock.mock.calls.map((c) => String(c[0]));
    const firstIdx = calledEndpoints.findIndex((u) => u.endsWith('/first'));
    const secondIdx = calledEndpoints.findIndex((u) => u.endsWith('/second'));
    const thirdIdx = calledEndpoints.findIndex((u) => u.endsWith('/third'));

    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);

    expect((await getSyncStatus()).pending).toBe(0);
  });
});
