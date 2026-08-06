/**
 * Unit Tests: TaxRulesService — offline rule caching & consistent calculation
 *
 * Validates Requirements 5.9, 10.2, 10.4:
 *  - Tax rules are cached in IndexedDB on first load (Req 10.2 / 11.7)
 *  - Cached rules can be read back when offline (Req 5.9)
 *  - A calculation driven by cached rules produces output IDENTICAL to one
 *    driven by the bundled (online) rules — i.e. "matches server-side"
 *    (Compliance: Consistent calculation)
 *
 * Uses fake-indexeddb (loaded globally in src/test/setup.ts) so the Dexie
 * layer runs in-memory under jsdom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { taxRulesService, defaultTaxRules } from '../taxRulesService';
import { TaxCalculator } from '../taxCalculator';
import { db } from '../../lib/db';
import type { TaxRules } from '../../../../shared/types/tax-rules';
import type { IncomeData, DeductionData } from '../../../../shared/types/tax-calculation';

// ── Fixtures: representative inputs covering several tax brackets ──────────────

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

// A spread of incomes hitting the nil band, rebate zone, and higher slabs.
const REPRESENTATIVE_INCOMES = [0, 450000, 700000, 1000000, 1500000, 2500000, 6000000];

describe('TaxRulesService — offline caching & consistent calculation', () => {
  beforeEach(async () => {
    // Reset both the IndexedDB store and the service's in-memory cache.
    await taxRulesService.clearCache();
    await db.open();
    await db.taxRules.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('caches tax rules in IndexedDB on first load', async () => {
    // No cache present initially
    expect(await db.taxRules.get('FY2025-26')).toBeUndefined();

    const rules = await taxRulesService.getTaxRules('FY2025-26');
    expect(rules).toBeDefined();

    // First load should have persisted the rules to IndexedDB
    const cached = await db.taxRules.get('FY2025-26');
    expect(cached).toBeDefined();
    expect(cached?.version).toBe(defaultTaxRules.version);
    expect(cached?.financialYear).toBe('FY2025-26');
    expect(cached?.rules.newRegime.slabs.length).toBe(
      defaultTaxRules.newRegime.slabs.length
    );
  });

  it('reads cached rules back from IndexedDB when offline (no network)', async () => {
    // Seed IndexedDB as if a previous online session cached the rules
    await db.taxRules.put({
      financialYear: 'FY2025-26',
      version: defaultTaxRules.version,
      rules: defaultTaxRules,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Reset the in-memory cache so the read MUST come from IndexedDB
    (taxRulesService as unknown as { cachedRules: TaxRules | null }).cachedRules = null;

    // Simulate an offline device
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const rules = await taxRulesService.getTaxRules('FY2025-26');
    expect(rules).toBeDefined();
    expect(rules.version).toBe(defaultTaxRules.version);
    expect(rules.newRegime.slabs).toEqual(defaultTaxRules.newRegime.slabs);
  });

  it('offline (cached-rules) calculation is IDENTICAL to online (bundled-rules) calculation', async () => {
    // Online path: calculator built from the bundled rules shipped with the app
    const onlineCalculator = new TaxCalculator(defaultTaxRules);

    // Offline path: load via the service (caches to IndexedDB), then read the
    // rules straight back out of IndexedDB and build the calculator from those.
    await taxRulesService.getTaxRules('FY2025-26');
    const cachedRecord = await db.taxRules.get('FY2025-26');
    expect(cachedRecord).toBeDefined();
    const offlineCalculator = new TaxCalculator(cachedRecord!.rules);

    for (const gross of REPRESENTATIVE_INCOMES) {
      const income = salaryIncome(gross);
      const deductions = zeroDeductions();

      const online = onlineCalculator.compareRegimes(income, deductions);
      const offline = offlineCalculator.compareRegimes(income, deductions);

      // Same rules in → identical results out (deterministic, no rounding drift)
      expect(offline).toEqual(online);
    }
  });

  it('falls back to bundled rules (offline-safe) when the cache read fails', async () => {
    // Force the IndexedDB read to throw, simulating a storage failure offline
    vi.spyOn(db.taxRules, 'get').mockRejectedValueOnce(new Error('IDB unavailable'));
    (taxRulesService as unknown as { cachedRules: TaxRules | null }).cachedRules = null;

    const rules = await taxRulesService.getTaxRules('FY2025-26');
    // Calculation must still be possible offline using bundled fallback rules
    expect(rules.version).toBe(defaultTaxRules.version);
    const calc = new TaxCalculator(rules);
    expect(calc.calculateNewRegime(salaryIncome(1000000), zeroDeductions())).toBeDefined();
  });
});
