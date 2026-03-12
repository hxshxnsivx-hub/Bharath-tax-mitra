import { db } from '@/lib/db';
import type { TaxRules } from '../../../shared/types/tax-rules';
import taxRulesData from '../../../shared/tax-rules-fy2025-26.json';

const TAX_RULES_CACHE_KEY = 'tax-rules';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

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
   * Get tax rules for the specified financial year
   * First checks IndexedDB cache, then falls back to bundled rules
   */
  async getTaxRules(financialYear: string = 'FY2025-26'): Promise<TaxRules> {
    // Return from memory cache if available
    if (this.cachedRules && this.cachedRules.financialYear === financialYear) {
      return this.cachedRules;
    }

    try {
      // Try to get from IndexedDB
      const cachedRule = await db.taxRules.get(financialYear);
      
      if (cachedRule && !this.isCacheExpired(cachedRule.cachedAt)) {
        this.cachedRules = cachedRule.rules;
        return cachedRule.rules;
      }

      // Fetch from server (in production, this would be an API call)
      // For now, use bundled rules
      const rules = taxRulesData as TaxRules;

      // Cache in IndexedDB
      await this.cacheTaxRules(financialYear, rules);

      this.cachedRules = rules;
      return rules;
    } catch (error) {
      console.error('Error loading tax rules:', error);
      // Fallback to bundled rules
      return taxRulesData as TaxRules;
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
   * Refresh tax rules from server
   */
  async refreshTaxRules(financialYear: string = 'FY2025-26'): Promise<TaxRules> {
    try {
      // In production, fetch from AWS AppConfig
      // const response = await fetch(`/api/tax-rules/${financialYear}`);
      // const rules = await response.json();

      // For now, use bundled rules
      const rules = taxRulesData as TaxRules;

      await this.cacheTaxRules(financialYear, rules);
      this.cachedRules = rules;

      return rules;
    } catch (error) {
      console.error('Error refreshing tax rules:', error);
      throw error;
    }
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
