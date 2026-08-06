/**
 * Unit Tests: TaxRulesService — AppConfig hot-reload path (OPT-A1)
 *
 * Validates Requirements 11.1, 11.3, 11.4, 11.5:
 *  - Rules fetched from GET /tax-rules/{fy} reach the calculator without a
 *    code deploy (hot-reload channel is live, not a stub)
 *  - refreshTaxRules() force-refreshes past a fresh cache
 *  - A malformed payload is REJECTED and the last known-good rules keep
 *    serving (validate-before-apply / rollback semantics)
 *  - Network failure falls back to cache, then bundled rules (offline-first)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { taxRulesService, defaultTaxRules } from '../taxRulesService';
import { db } from '../../lib/db';
import type { TaxRules } from '../../../../shared/types/tax-rules';

/** Deep-clone the bundled rules so mutations don't leak between tests. */
function clonedRules(): TaxRules {
  return JSON.parse(JSON.stringify(defaultTaxRules)) as TaxRules;
}

function okJson(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as unknown as Response;
}

describe('TaxRulesService — AppConfig hot-reload (OPT-A1)', () => {
  beforeEach(async () => {
    await taxRulesService.clearCache();
    await db.open();
    await db.taxRules.clear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves rules fetched from the server when the cache is empty (hot-reload live)', async () => {
    const serverRules = clonedRules();
    serverRules.version = '2.1.0-hot'; // simulate a new AppConfig deployment

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(serverRules));

    const rules = await taxRulesService.getTaxRules('FY2025-26');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/tax-rules/FY2025-26'),
      expect.anything()
    );
    // The DEPLOYED version won — not the bundled one
    expect(rules.version).toBe('2.1.0-hot');

    // And it was persisted for offline use
    const cached = await db.taxRules.get('FY2025-26');
    expect(cached?.rules.version).toBe('2.1.0-hot');
  });

  it('refreshTaxRules() force-refreshes even when the cache is fresh (Req 11.3)', async () => {
    // Fresh cache with the bundled version
    await db.taxRules.put({
      financialYear: 'FY2025-26',
      version: defaultTaxRules.version,
      rules: defaultTaxRules,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const serverRules = clonedRules();
    serverRules.version = '2.2.0-hot';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(serverRules));

    const rules = await taxRulesService.refreshTaxRules('FY2025-26');
    expect(rules.version).toBe('2.2.0-hot');

    const cached = await db.taxRules.get('FY2025-26');
    expect(cached?.rules.version).toBe('2.2.0-hot');
  });

  it('rejects a malformed payload and keeps the last known-good rules (Req 11.4/11.5)', async () => {
    // Last-good deployment sits in the cache
    const goodRules = clonedRules();
    goodRules.version = '2.0.0-good';
    await db.taxRules.put({
      financialYear: 'FY2025-26',
      version: goodRules.version,
      rules: goodRules,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Server responds 200 but with garbage (e.g. a bad AppConfig deployment)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okJson({ version: 'x', newRegime: { slabs: [] }, oldRegime: {} })
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const rules = await taxRulesService.refreshTaxRules('FY2025-26');

    // Garbage refused; last known-good still serving
    expect(rules.version).toBe('2.0.0-good');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid tax rules payload')
    );
  });

  it('falls back to bundled rules when fetch fails and no cache exists (offline-first)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));

    const rules = await taxRulesService.getTaxRules('FY2025-26');
    expect(rules.version).toBe(defaultTaxRules.version);
  });

  it('does not attempt any fetch while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const rules = await taxRulesService.getTaxRules('FY2025-26');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rules.version).toBe(defaultTaxRules.version);
  });
});
