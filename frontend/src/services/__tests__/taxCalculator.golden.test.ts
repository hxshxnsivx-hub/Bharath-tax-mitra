/**
 * Golden-vector regression tests (OPT-A2 — single source of truth).
 *
 * Asserts the TS engine reproduces shared/golden-vectors.json EXACTLY.
 * The same file is asserted by backend/tests/test_golden_vectors.py, so a
 * passing suite on both sides proves the two engines agree to the rupee.
 *
 * If a statutory change is intended: update the engine, regenerate via
 * `npx vite-node scripts/generate-golden-vectors.ts`, and commit the diff —
 * a changed vector file IS the review artifact for the tax-math change.
 */

import { describe, it, expect } from 'vitest';
import { TaxCalculator } from '../taxCalculator';
import { defaultTaxRules } from '../taxRulesService';
import goldenFile from '../../../../shared/golden-vectors.json';
import type {
  IncomeData,
  DeductionData,
  PersonalInfo,
  RegimeComparisonResult,
} from '../../../../shared/types/tax-calculation';

interface GoldenVector {
  id: string;
  description: string;
  input: {
    income: IncomeData;
    deductions: DeductionData;
    personalInfo: PersonalInfo | null;
  };
  expected: RegimeComparisonResult;
}

const vectors = (goldenFile as { vectors: GoldenVector[] }).vectors;

describe('TaxCalculator — golden vectors (OPT-A2)', () => {
  const calc = new TaxCalculator(defaultTaxRules);

  it('covers the canonical statutory boundary set', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(24);
  });

  it.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, v) => {
    const result = calc.compareRegimes(
      v.input.income,
      v.input.deductions,
      v.input.personalInfo ?? undefined
    );
    expect(result).toEqual(v.expected);
  });
});
