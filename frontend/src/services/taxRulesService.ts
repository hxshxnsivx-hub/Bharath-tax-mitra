import { db } from '@/lib/db';
import type { TaxRules } from '../../../shared/types/tax-rules';
import taxRulesData2025 from '../../../shared/tax-rules-fy2025-26.json';
import taxRulesData2026 from '../../../shared/tax-rules-fy2026-27.json';

// The bundled JSON carries audit/metadata fields that intentionally exceed the
// strict TaxRules contract — cast via unknown.
const bundledRules2025 = taxRulesData2025 as unknown as TaxRules;
const bundledRules2026 = taxRulesData2026 as unknown as TaxRules;

/** Resolve the correct bundled rules for a given financial/assessment year. */
function getBundledRules(financialYear: string): TaxRules {
  if (financialYear === 'FY2026-27' || financialYear === 'AY2026-27') {
    return bundledRules2026;
  }
  return bundledRules2025;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Base URL of the AppConfig-backed rules API (same convention as authService).
// The server route `GET /tax-rules/{fy}` returns the freeform JSON that AWS
// AppConfig serves for the `TaxRules` configuration profile (see
// infrastructure/lib/stacks/appconfig-stack.ts). In local dev this is served by
// the FastAPI mock server (backend/src/local/mock_server.py).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * Minimal structural guard for a rules payload received over the network.
 * We never feed an unvalidated remote object into the calculator — a malformed
 * AppConfig deployment must fall back to the last good cache / bundled rules,
 * not silently produce wrong tax (Req 11.4/11.5: validate before applying).
 */
function isValidTaxRules(value: unknown): value is TaxRules {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  const newRegime = r.newRegime as { slabs?: unknown } | undefined;
  const oldRegime = r.oldRegime as { slabs?: unknown } | undefined;
  return (
    typeof r.version === 'string' &&
    Array.isArray(newRegime?.slabs) &&
    newRegime!.slabs.length > 0 &&
    Array.isArray(oldRegime?.slabs) &&
    oldRegime!.slabs.length > 0
  );
}

export class TaxRulesService {
  private static instance: TaxRulesService;
  private cachedRules: TaxRules | null = null;

  private constructor() {}

  static getInstance(): TaxRulesService {
    if (!TaxRulesService.instance) {
      TaxRulesService.instance = new TaxRulesService();
    }
    return TaxRulesService.instance;
  }

  /**
   * Get tax rules for the specified financial year.
   * Supports 'FY2025-26' (default), 'FY2026-27', and their AY equivalents.
   * First checks IndexedDB cache, then falls back to bundled rules.
   */
  async getTaxRules(financialYear: string = 'FY2025-26'): Promise<TaxRules> {
    // Return from memory cache if available
    if (this.cachedRules && this.cachedRules.financialYear === financialYear) {
      return this.cachedRules;
    }

    // Normalise AY identifiers to their FY equivalents for cache keying
    const cacheKey =
      financialYear === 'AY2026-27' ? 'FY2026-27' : financialYear;

    try {
      // Try to get from IndexedDB
      const cachedRule = await db.taxRules.get(cacheKey);

      if (cachedRule && !this.isCacheExpired(cachedRule.cachedAt)) {
        this.cachedRules = cachedRule.rules;
        return cachedRule.rules;
      }

      // Cache is missing or stale. When online, fetch the latest rules from the
      // AppConfig-backed API (Req 11.1/11.3 — hot-reload without redeploy).
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const remote = await this.fetchRulesFromServer(cacheKey);
        if (remote) {
          await this.cacheTaxRules(cacheKey, remote);
          this.cachedRules = remote;
          return remote;
        }
      }

      // Offline, or the fetch failed/was invalid: prefer the stale cache (last
      // known-good AppConfig deployment) over bundled rules (Req 11.5).
      if (cachedRule) {
        this.cachedRules = cachedRule.rules;
        return cachedRule.rules;
      }

      // First run with no network: bundled rules keep the calculator working.
      const rules = getBundledRules(financialYear);
      await this.cacheTaxRules(cacheKey, rules);
      this.cachedRules = rules;
      return rules;
    } catch (error) {
      console.error('Error loading tax rules:', error);
      // Fallback to bundled rules
      return getBundledRules(financialYear);
    }
  }

  /**
   * Fetch rules from `GET /tax-rules/{fy}` (AppConfig data plane behind the
   * API; FastAPI mock server in local dev). Returns null on any failure —
   * callers decide the fallback. Never throws.
   */
  private async fetchRulesFromServer(financialYear: string): Promise<TaxRules | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // match SW network-first timeout
    try {
      const response = await fetch(`${API_BASE_URL}/tax-rules/${financialYear}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) return null;

      const payload: unknown = await response.json();
      if (!isValidTaxRules(payload)) {
        // Malformed AppConfig deployment — refuse it (Req 11.4/11.5)
        console.error('Rejected invalid tax rules payload from server');
        return null;
      }
      return payload;
    } catch {
      // Network error / timeout — expected offline; caller falls back
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Cache tax rules in IndexedDB
   */
  private async cacheTaxRules(financialYear: string, rules: TaxRules): Promise<void> {
    try {
      await db.taxRules.put({
        financialYear,
        version: rules.version,
        rules,
        cachedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION_MS,
      });
    } catch (error) {
      console.error('Error caching tax rules:', error);
    }
  }

  /**
   * Check if cached rules are expired
   */
  private isCacheExpired(cachedAt: number): boolean {
    return Date.now() - cachedAt > CACHE_DURATION_MS;
  }

  /**
   * Force-refresh tax rules from the AppConfig-backed API, bypassing cache
   * freshness (Req 11.3 — called by the sync service when the app comes online).
   * Falls back to the last cached rules, then bundled rules; never throws.
   */
  async refreshTaxRules(financialYear: string = 'FY2025-26'): Promise<TaxRules> {
    const cacheKey =
      financialYear === 'AY2026-27' ? 'FY2026-27' : financialYear;

    const remote = await this.fetchRulesFromServer(cacheKey);
    if (remote) {
      await this.cacheTaxRules(cacheKey, remote);
      this.cachedRules = remote;
      return remote;
    }

    // Refresh failed — keep serving the last known-good rules (Req 11.5).
    try {
      const cachedRule = await db.taxRules.get(cacheKey);
      if (cachedRule) {
        this.cachedRules = cachedRule.rules;
        return cachedRule.rules;
      }
    } catch (error) {
      console.error('Error reading cached tax rules during refresh:', error);
    }

    const rules = getBundledRules(financialYear);
    await this.cacheTaxRules(cacheKey, rules);
    this.cachedRules = rules;
    return rules;
  }

  /**
   * Clear cached tax rules
   */
  async clearCache(): Promise<void> {
    try {
      await db.taxRules.clear();
      this.cachedRules = null;
    } catch (error) {
      console.error('Error clearing tax rules cache:', error);
    }
  }

  /**
   * Get all available financial years
   */
  async getAvailableFinancialYears(): Promise<string[]> {
    try {
      const rules = await db.taxRules.toArray();
      return rules.map((r) => r.financialYear);
    } catch (error) {
      console.error('Error getting available financial years:', error);
      return ['FY2025-26'];
    }
  }
}

// Export singleton instance
export const taxRulesService = TaxRulesService.getInstance();

// Export default rules for synchronous use (e.g., in MainApp before async load)
// Always points to the current financial year (FY 2025-26).
export const defaultTaxRules = bundledRules2025;
