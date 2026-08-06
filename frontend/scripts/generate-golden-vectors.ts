/**
 * Golden-vector generator (OPT-A2 — single source of truth for tax logic).
 *
 * Runs the TypeScript TaxCalculator (the reference implementation) over a
 * canonical set of inputs covering every statutory boundary, and writes
 * shared/golden-vectors.json. BOTH engines then assert against that file:
 *   - frontend/src/services/__tests__/taxCalculator.golden.test.ts (exact)
 *   - backend/tests/test_golden_vectors.py (numeric fields exact;
 *     analysis prose and slab labels excluded by design)
 *
 * Regenerate ONLY on a deliberate statutory change:
 *   cd frontend && npx vite-node scripts/generate-golden-vectors.ts
 * A changed vector file in a PR is a statement: "the tax math changed."
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TaxCalculator } from '../src/services/taxCalculator';
import taxRulesJson from '../../shared/tax-rules-fy2025-26.json';
import type { TaxRules } from '../../shared/types/tax-rules';
import type {
  IncomeData,
  DeductionData,
  PersonalInfo,
} from '../../shared/types/tax-calculation';

const rules = taxRulesJson as unknown as TaxRules;
const calc = new TaxCalculator(rules);

/* ── Input builders (zero-filled, override what the vector exercises) ────── */

function income(over: {
  salary?: Partial<IncomeData['salary']>;
  houseProperty?: IncomeData['houseProperty'];
  businessIncome?: IncomeData['businessIncome'];
  capitalGains?: IncomeData['capitalGains'];
  otherSources?: IncomeData['otherSources'];
} = {}): IncomeData {
  return {
    salary: {
      grossSalary: 0, basicSalary: 0, hraReceived: 0,
      specialAllowance: 0, otherAllowances: 0, professionalTax: 0,
      ...over.salary,
    },
    ...(over.houseProperty ? { houseProperty: over.houseProperty } : {}),
    ...(over.businessIncome ? { businessIncome: over.businessIncome } : {}),
    ...(over.capitalGains ? { capitalGains: over.capitalGains } : {}),
    ...(over.otherSources ? { otherSources: over.otherSources } : {}),
  };
}

function deductions(over: {
  s80c?: Partial<DeductionData['section80C']>;
  s80d?: Partial<DeductionData['section80D']>;
  nps?: number;
  s80e?: number;
  s80g?: number;
  hra?: Partial<DeductionData['hra']>;
  profTax?: number;
} = {}): DeductionData {
  return {
    section80C: {
      lic: 0, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0,
      tuitionFees: 0, sukanyaSamriddhi: 0, other: 0, ...over.s80c,
    },
    section80CCD1B: { npsAdditional: over.nps ?? 0 },
    section80D: {
      selfPremium: 0, parentsPremium: 0, preventiveHealthCheckup: 0,
      isSelfSenior: false, isParentsSenior: false, ...over.s80d,
    },
    section80E: { educationLoanInterest: over.s80e ?? 0 },
    section80G: { donations: over.s80g ?? 0 },
    hra: { rentPaid: 0, isMetro: false, ...over.hra },
    section16: { professionalTax: over.profTax ?? 0 },
  };
}

function person(age: number): PersonalInfo {
  return {
    pan: 'ABCDE1234F',
    name: 'Golden Vector',
    dateOfBirth: `${2026 - age}-01-01`,
    age,
    isSeniorCitizen: age >= 60,
    isSuperSeniorCitizen: age >= 80,
    residentialStatus: 'resident',
  };
}

/* ── The canonical vector set — every statutory boundary earns a row ─────── */

const cases: Array<{
  id: string;
  description: string;
  income: IncomeData;
  deductions: DeductionData;
  personalInfo: PersonalInfo | null;
}> = [
  { id: 'V01-zero', description: 'Zero income — floor behaviour', income: income(), deductions: deductions(), personalInfo: null },
  { id: 'V02-slab-edge-250k1', description: 'Old-regime first slab boundary +1 rupee', income: income({ salary: { grossSalary: 250_001 } }), deductions: deductions(), personalInfo: null },
  { id: 'V03-rebate-450k', description: '87A zone both regimes — zero tax expected', income: income({ salary: { grossSalary: 450_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V04-rebate-edge-700k', description: 'New-regime 87A threshold exactly (₹7L taxable pre-SD nuance)', income: income({ salary: { grossSalary: 700_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V05-rebate-marginal-760k', description: '87A marginal-relief zone just past ₹7L taxable', income: income({ salary: { grossSalary: 760_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V06-mid-1.2M-80C-full', description: '₹12L salary with 80C fully used (cap check)', income: income({ salary: { grossSalary: 1_200_000, basicSalary: 480_000 } }), deductions: deductions({ s80c: { ppf: 100_000, elss: 80_000 } }), personalInfo: null },
  { id: 'V07-hra-metro', description: 'HRA exemption, metro (50% basic rule)', income: income({ salary: { grossSalary: 1_500_000, basicSalary: 600_000, hraReceived: 240_000 } }), deductions: deductions({ hra: { rentPaid: 300_000, isMetro: true } }), personalInfo: null },
  { id: 'V08-hra-nonmetro', description: 'HRA exemption, non-metro (40% basic rule)', income: income({ salary: { grossSalary: 1_500_000, basicSalary: 600_000, hraReceived: 240_000 } }), deductions: deductions({ hra: { rentPaid: 300_000, isMetro: false } }), personalInfo: null },
  { id: 'V09-kitchen-sink-2.5M', description: 'All deduction heads at once (80C cap, 80D senior parents, NPS, 80E, 80G, prof tax)', income: income({ salary: { grossSalary: 2_500_000, basicSalary: 1_000_000, hraReceived: 300_000, professionalTax: 2_400 } }), deductions: deductions({ s80c: { lic: 60_000, ppf: 90_000, nsc: 30_000 }, s80d: { selfPremium: 20_000, parentsPremium: 48_000, preventiveHealthCheckup: 5_000, isParentsSenior: true }, nps: 50_000, s80e: 35_000, s80g: 20_000, hra: { rentPaid: 360_000, isMetro: true }, profTax: 2_400 }), personalInfo: person(40) },
  { id: 'V10-surcharge-5.05M', description: 'Surcharge 10% band + marginal relief zone', income: income({ salary: { grossSalary: 5_050_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V11-surcharge-10.1M', description: 'Surcharge 15% band boundary', income: income({ salary: { grossSalary: 10_100_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V12-surcharge-20.1M', description: 'Surcharge 25% band boundary', income: income({ salary: { grossSalary: 20_100_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V13-surcharge-50.1M', description: 'Surcharge 37% band boundary', income: income({ salary: { grossSalary: 50_100_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V14-senior-65', description: 'Senior citizen — Paragraph A(II) slabs (old regime ₹3L nil)', income: income({ salary: { grossSalary: 800_000 } }), deductions: deductions(), personalInfo: person(65) },
  { id: 'V15-super-senior-85', description: 'Super senior — Paragraph A(III) slabs (old regime ₹5L nil)', income: income({ salary: { grossSalary: 800_000 } }), deductions: deductions(), personalInfo: person(85) },
  { id: 'V16-44ad-digital-1Cr', description: '44AD presumptive, digital receipts ₹1Cr (6%)', income: income({ businessIncome: { grossReceipts: 10_000_000, digitalReceipts: 10_000_000, cashReceipts: 0, expenses: 0 } }), deductions: deductions(), personalInfo: null },
  { id: 'V17-44ad-mixed-1.5Cr', description: '44AD mixed digital+cash (6% + 8% split)', income: income({ businessIncome: { grossReceipts: 15_000_000, digitalReceipts: 12_000_000, cashReceipts: 3_000_000, expenses: 0 } }), deductions: deductions(), personalInfo: null },
  { id: 'V18-44ad-enhanced-2.5Cr-digital', description: '44AD enhanced ₹3Cr threshold — 2.5Cr fully digital (cash ≤5%)', income: income({ businessIncome: { grossReceipts: 25_000_000, digitalReceipts: 25_000_000, cashReceipts: 0, expenses: 0 } }), deductions: deductions(), personalInfo: null },
  { id: 'V19-44ad-cashheavy-2.5Cr', description: '2.5Cr with cash >5% — above the ₹2Cr basic threshold', income: income({ businessIncome: { grossReceipts: 25_000_000, digitalReceipts: 20_000_000, cashReceipts: 5_000_000, expenses: 3_000_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V20-mixed-salary-business-other', description: 'Salary + business + interest/dividend mix', income: income({ salary: { grossSalary: 900_000, basicSalary: 360_000 }, businessIncome: { grossReceipts: 2_000_000, digitalReceipts: 2_000_000, cashReceipts: 0, expenses: 0 }, otherSources: { interestIncome: 45_000, dividendIncome: 12_000, other: 3_000 } }), deductions: deductions({ s80c: { ppf: 150_000 } }), personalInfo: person(35) },
  { id: 'V21-house-property', description: 'House property income with home-loan interest', income: income({ salary: { grossSalary: 1_000_000, basicSalary: 400_000 }, houseProperty: { annualValue: 240_000, municipalTaxes: 12_000, interestOnHomeLoan: 180_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V22-capital-gains', description: 'Short + long term capital gains added to income', income: income({ salary: { grossSalary: 600_000 }, capitalGains: { shortTerm: 150_000, longTerm: 250_000 } }), deductions: deductions(), personalInfo: null },
  { id: 'V23-proftax-only', description: 'Professional tax as Section 16 deduction (both regimes)', income: income({ salary: { grossSalary: 550_000, professionalTax: 2_400 } }), deductions: deductions({ profTax: 2_400 }), personalInfo: null },
  { id: 'V24-uat-p2-oldwins', description: 'UAT P2 mirror — heavy deductions, old regime wins', income: income({ salary: { grossSalary: 1_200_000, basicSalary: 480_000, hraReceived: 200_000 } }), deductions: deductions({ s80c: { ppf: 100_000, elss: 50_000 }, s80d: { selfPremium: 25_000 }, nps: 50_000, s80g: 10_000, hra: { rentPaid: 240_000, isMetro: false } }), personalInfo: null },

  // ── OPT-A3 half-rupee boundary vectors ─────────────────────────────────
  // These land percentage results EXACTLY on .50 paise, where JS Math.round
  // (half-up) and Python's built-in round() (banker's/half-even) disagree.
  // They exist to fail loudly if either engine regresses from the shared
  // half-up contract (pctOf / _pct_of).
  { id: 'V25-half-slab-350010', description: '5% slab tax lands on ₹x.50 (old: 2500.5, new: 0.5) — half-up must win', income: income({ salary: { grossSalary: 350_010 } }), deductions: deductions(), personalInfo: null },
  { id: 'V26-half-80g-odd-donation', description: '80G 50% of odd ₹1,001 donation = ₹500.50 — half-up must win', income: income({ salary: { grossSalary: 800_000, basicSalary: 320_000 } }), deductions: deductions({ s80g: 1_001 }), personalInfo: null },
  { id: 'V27-half-44ad-60001.5', description: '44AD 6% of ₹10,00,025 digital = ₹60,001.50 — half-up must win', income: income({ businessIncome: { grossReceipts: 1_000_025, digitalReceipts: 1_000_025, cashReceipts: 0, expenses: 0 } }), deductions: deductions(), personalInfo: null },
];

/* ── Generate ────────────────────────────────────────────────────────────── */

const vectors = cases.map((c) => ({
  id: c.id,
  description: c.description,
  input: { income: c.income, deductions: c.deductions, personalInfo: c.personalInfo },
  expected: calc.compareRegimes(c.income, c.deductions, c.personalInfo ?? undefined),
}));

const out = {
  _meta: {
    purpose:
      'OPT-A2 golden vectors — canonical inputs and expected RegimeComparisonResult. ' +
      'Both the TS and Python engines assert against this file in CI. ' +
      'Numeric fields are the contract; analysis prose and slab labels are not compared.',
    generator: 'frontend/scripts/generate-golden-vectors.ts (TS engine is the reference)',
    rulesVersion: rules.version,
    financialYear: rules.financialYear,
    generatedAt: new Date().toISOString(),
    vectorCount: vectors.length,
  },
  vectors,
};

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../../shared/golden-vectors.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n', 'utf-8');
console.log(`Wrote ${vectors.length} golden vectors → ${target}`);
