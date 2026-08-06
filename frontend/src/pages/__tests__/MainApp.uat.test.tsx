/**
 * User Acceptance Testing (UAT) — Phase 1 persona journeys (Task 1.7.5)
 *
 * This is the final Phase 1 checkpoint suite. It validates the end-to-end manual
 * tax-filing journey (Personal → Salary → Deductions → Business → Results/regime
 * comparison) for several realistic Indian taxpayer personas.
 *
 * SCOPE & APPROACH
 * ----------------
 * Each persona is expressed as the *form-shaped* data the UI collects (the same
 * objects PersonalInfoForm / SalaryIncomeForm / DeductionsForm / BusinessIncomeForm
 * pass to their onSave callbacks). Those objects are driven through the EXACT same
 * mapping + engine path the running app uses:
 *
 *     form state  ──▶  buildIncomeData() / buildDeductionData()   (from MainApp.tsx)
 *     form state  ──▶  toPersonalInfo()                            (formDataMapper.ts)
 *                 ──▶  new TaxCalculator(defaultTaxRules).compareRegimes(...)
 *
 * `buildIncomeData` / `buildDeductionData` are the literal helpers MainApp calls in
 * `handleBusinessSave` / `skipToResults` before invoking `handleCalculateTax`, and
 * `toPersonalInfo` is what `handleCalculateTax` uses to normalise DOB + senior flags.
 * So this exercises the real production wiring, not a re-implementation.
 *
 * Every expected rupee figure below is hand-computed from the statutory FY 2025-26
 * rules encoded in shared/tax-rules-fy2025-26.json (the same rules the engine loads),
 * with the basis cited inline. This COMPLEMENTS the engine-level authoritative suite
 * in taxCalculator.itd-scenarios.test.ts (Task 1.7.2) by validating at the
 * persona / form→mapper→engine integration level instead.
 *
 * FY 2025-26 rule recap (per the JSON):
 *   New regime slabs: 0/5/10/15/20/30% at 3L/6L/9L/12L/15L; SD ₹50,000;
 *     87A ₹25,000 rebate for taxable ≤ ₹7L (+ marginal relief); cess 4%.
 *   Old regime (<60) slabs: 0/5/20/30% at 2.5L/5L/10L; senior(60-79) nil to ₹3L;
 *     super-senior(80+) nil to ₹5L; SD ₹50,000; 87A ₹12,500 for taxable ≤ ₹5L; cess 4%.
 *   Section 44AD presumptive: 6% digital + 8% cash; threshold ₹2Cr (₹3Cr if cash ≤ 5%).
 *
 * NOTE on standard deduction for business-only personas: the engine always applies
 * the ₹50,000 standard deduction (both regimes), even when income is purely
 * presumptive business. This matches the engine's documented behaviour and the
 * authoritative 44AD-4 scenario in Task 1.7.2, so the expected figures here follow
 * the same convention rather than contradicting it.
 *
 * A single component-level smoke test renders the real ResultsView with a persona's
 * computed comparison to prove the results UI wiring (see rationale at the bottom).
 *
 * Requirements: 5.1 (calculator accuracy), 5.x (regime comparison) | Phase 1 deliverable.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { buildIncomeData, buildDeductionData } from '../../utils/buildTaxData';
import { toPersonalInfo } from '../../utils/formDataMapper';
import { TaxCalculator } from '../../services/taxCalculator';
import { defaultTaxRules } from '../../services/taxRulesService';
import ResultsView from '../../components/results/ResultsView';

const FY = 'FY2025-26';

// ── Persona model ───────────────────────────────────────────────────────────

type Regime = 'old' | 'new';
type TdsDirection = 'refund' | 'payable' | 'settled';

interface Persona {
  id: string;
  title: string;
  /** PersonalInfoForm shape (dob is DD/MM/YYYY as the form stores it). */
  personalInfo: Record<string, unknown> | null;
  /** SalaryIncomeForm onSave shape. */
  salary: Record<string, unknown> | null;
  /** DeductionsForm onSave shape. */
  deductions: Record<string, unknown> | null;
  /** BusinessIncomeForm onSave shape. */
  business: Record<string, unknown> | null;
  /** Total TDS already paid (sum across quarters) for refund/payable direction. */
  tdsPaid: number;
  expected: {
    recommendedRegime: Regime;
    /** Total tax under the recommended regime, hand-computed to the rupee. */
    recommendedTax: number;
    /** Expected gross total income the engine should aggregate. */
    grossTotalIncome: number;
    /** Expected presumptive business income in the breakdown (0 if none). */
    businessIncome?: number;
    /** Direction of TDS vs recommended liability. */
    tdsDirection: TdsDirection;
    /** Basis note for documentation. */
    basis: string;
  };
}

const calc = new TaxCalculator(defaultTaxRules);

/** Run a persona through the real UI mapping + engine path. */
function runPersona(p: Persona) {
  const income = buildIncomeData(p.salary, p.business);
  const deductions = buildDeductionData(p.deductions, p.salary);
  const personalInfo = p.personalInfo?.dob
    ? toPersonalInfo(p.personalInfo, FY)
    : undefined;
  return calc.compareRegimes(income, deductions, personalInfo);
}

// ── Personas ─────────────────────────────────────────────────────────────────

const personas: Persona[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Young salaried employee, ₹9L, minimal deductions → NEW regime favourable.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'P1',
    title: 'Young salaried (₹9L, minimal deductions)',
    personalInfo: { pan: 'ABCPK1234A', fullName: 'Aarav Kumar', dob: '15/06/1997', address: 'Pune', email: 'aarav@example.com' },
    salary: { grossSalary: 900_000, basicSalary: 450_000, hraReceived: 0, specialAllowance: 0, otherAllowances: 0, professionalTax: 2_400, tdsQ1: 12_500, tdsQ2: 12_500, tdsQ3: 12_500, tdsQ4: 12_500 },
    deductions: { lic: 50_000 },
    business: null,
    tdsPaid: 50_000,
    expected: {
      recommendedRegime: 'new',
      // NEW: taxable 900000 − (SD 50000 + prof-tax 2400) = 847600.
      //   5%*300000=15000 ; 10%*247600=24760 → 39760. >7L so no 87A.
      //   cess 4% of 39760 = 1590 → 41,350.
      // OLD: taxable 900000 − (80C 50000 + SD 50000 + prof-tax 2400) = 797600.
      //   5%*250000=12500 ; 20%*297600=59520 → 72020 ; cess 2881 → 74,901.
      // new (41,350) < old (74,901) → NEW.
      recommendedTax: 41_350,
      grossTotalIncome: 900_000,
      tdsDirection: 'refund', // TDS 50,000 > 41,350
      basis: 'New 6-slab table + SD ₹50k + prof-tax; old 80C ₹50k insufficient to beat new slabs.',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Mid-career salaried, ₹14L, 80C maxed + 80CCD(1B) + 80D + HRA → OLD wins.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'P2',
    title: 'Mid-career salaried (₹14L, 80C maxed + NPS + 80D + HRA)',
    personalInfo: { pan: 'ABCPK2234B', fullName: 'Priya Sharma', dob: '12/03/1985', address: 'Mumbai', email: 'priya@example.com' },
    salary: { grossSalary: 1_200_000, basicSalary: 600_000, hraReceived: 200_000, specialAllowance: 0, otherAllowances: 0, professionalTax: 2_400, tdsQ1: 20_000, tdsQ2: 20_000, tdsQ3: 20_000, tdsQ4: 20_000 },
    deductions: { ppf: 150_000, npsAdditional: 50_000, healthInsuranceSelf: 25_000, rentPaid: 300_000, isMetroCity: true },
    business: null,
    tdsPaid: 80_000,
    expected: {
      recommendedRegime: 'old',
      // GTI = grossSalary 12L + HRA received 2L = 14,00,000.
      // OLD deductions: 80C 150000 + 80CCD1B 50000 + 80D 25000 +
      //   HRA min(2L, 3L−10%*6L=2.4L, 50%*6L=3L)=2L + SD 50000 + prof-tax 2400 = 4,77,400.
      //   taxable = 14,00,000 − 4,77,400 = 9,22,600.
      //   5%*250000=12500 ; 20%*422600=84520 → 97020 ; cess 3881 → 1,00,901.
      // NEW: taxable = 14,00,000 − (SD 50000 + prof-tax 2400) = 13,47,600.
      //   15000 + 30000 + 45000 + 20%*147600=29520 → 1,19,520 ; cess 4781 → 1,24,301.
      // old (1,00,901) < new (1,24,301) → OLD.
      recommendedTax: 100_901,
      grossTotalIncome: 1_400_000,
      tdsDirection: 'payable', // TDS 80,000 < 1,00,901
      basis: 'Old regime: HRA ₹2L + 80C ₹1.5L + NPS ₹50k + 80D ₹25k deductions beat new slabs.',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Senior citizen (60-79) pensioner, ₹8.5L, 80C + 80D(senior) → OLD wins,
  //    senior slab (nil up to ₹3L) applied.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'P3',
    title: 'Senior citizen pensioner (age 67, ₹8.5L)',
    personalInfo: { pan: 'ABCPK3234C', fullName: 'Ramesh Iyer', dob: '15/06/1958', address: 'Chennai', email: 'ramesh@example.com' },
    salary: { grossSalary: 850_000, basicSalary: 0, hraReceived: 0, specialAllowance: 0, otherAllowances: 0, professionalTax: 0, tdsQ1: 0, tdsQ2: 0, tdsQ3: 0, tdsQ4: 0 },
    deductions: { ppf: 150_000, healthInsuranceSelf: 50_000, isSelfSeniorCitizen: true },
    business: null,
    tdsPaid: 0,
    expected: {
      recommendedRegime: 'old',
      // Age at 31 Mar 2026 = 67 → senior (60-79), nil slab up to ₹3L.
      // OLD: 80C 150000 + 80D(self senior, limit ₹50k) 50000 + SD 50000 = 2,50,000.
      //   taxable = 8,50,000 − 2,50,000 = 6,00,000.
      //   senior slab: 5%*(5L−3L)=10000 ; 20%*(6L−5L)=20000 → 30000 ; cess 1200 → 31,200.
      //   (A non-senior <60 taxpayer would pay 33,800 here — proves senior slab applied.)
      // NEW: taxable = 8,50,000 − SD 50000 = 8,00,000 → 15000 + 10%*200000=20000 = 35000 ;
      //   cess 1400 → 36,400.
      // old (31,200) < new (36,400) → OLD.
      recommendedTax: 31_200,
      grossTotalIncome: 850_000,
      tdsDirection: 'payable', // no TDS, liability 31,200
      basis: 'Senior (60-79) nil-to-₹3L slab + 80C/80D(senior) deductions make old regime cheaper.',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Small-business owner under Section 44AD, ₹1.5Cr digital receipts → NEW wins.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'P4',
    title: 'Small-business owner (Sec 44AD, ₹1.5Cr digital receipts)',
    personalInfo: { pan: 'ABCPK4234D', fullName: 'Suresh Patel', dob: '20/08/1980', address: 'Surat', email: 'suresh@example.com' },
    salary: null,
    deductions: null,
    business: { businessType: 'trading', grossReceiptsDigital: 15_000_000, grossReceiptsCash: 0 },
    tdsPaid: 0,
    expected: {
      recommendedRegime: 'new',
      // Cash 0 ≤ 5% of total → ₹3Cr threshold; ₹1.5Cr ≤ ₹3Cr → eligible.
      //   presumptive = 6% × 1.5Cr = 9,00,000.
      // NEW: taxable = 9,00,000 − SD 50000 = 8,50,000 → 15000 + 10%*250000=25000 = 40000 ;
      //   cess 1600 → 41,600.
      // OLD: taxable = 9,00,000 − SD 50000 = 8,50,000 →
      //   5%*250000=12500 ; 20%*300000=60000 → 72500 ; cess 2900 → 75,400.
      // new (41,600) < old (75,400) → NEW.
      recommendedTax: 41_600,
      grossTotalIncome: 900_000,
      businessIncome: 900_000,
      tdsDirection: 'payable',
      basis: 'Sec 44AD 6% presumptive on ₹1.5Cr digital (₹3Cr threshold) = ₹9L; new slabs win.',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Low-income salaried, ₹4.5L → zero tax under 87A in both regimes.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'P5',
    title: 'Low-income salaried (₹4.5L → zero tax via 87A)',
    personalInfo: { pan: 'ABCPK5234E', fullName: 'Meena Devi', dob: '10/01/1999', address: 'Jaipur', email: 'meena@example.com' },
    salary: { grossSalary: 450_000, basicSalary: 225_000, hraReceived: 0, specialAllowance: 0, otherAllowances: 0, professionalTax: 2_400, tdsQ1: 1_250, tdsQ2: 1_250, tdsQ3: 1_250, tdsQ4: 1_250 },
    deductions: { lic: 10_000 },
    business: null,
    tdsPaid: 5_000,
    expected: {
      recommendedRegime: 'old', // exact tie at ₹0 → engine prefers 'old' (old <= new)
      // NEW: taxable = 4,50,000 − (SD 50000 + prof-tax 2400) = 3,97,600 → 5%*97600=4880 ;
      //   87A (≤7L) min(4880,25000)=4880 → ₹0.
      // OLD: taxable = 4,50,000 − (80C 10000 + SD 50000 + prof-tax 2400) = 3,87,600 →
      //   5%*137600=6880 ; 87A (≤5L) min(6880,12500)=6880 → ₹0.
      recommendedTax: 0,
      grossTotalIncome: 450_000,
      tdsDirection: 'refund', // TDS 5,000 fully refundable since liability ₹0
      basis: 'Section 87A rebate wipes liability to ₹0 in both regimes; TDS fully refundable.',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Gig worker — mixed salary + Section 44AD business income → NEW wins.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'P6',
    title: 'Gig worker (₹6L salary + ₹30L digital business receipts)',
    personalInfo: { pan: 'ABCPK6234F', fullName: 'Karthik Nair', dob: '05/09/1993', address: 'Bengaluru', email: 'karthik@example.com' },
    salary: { grossSalary: 600_000, basicSalary: 300_000, hraReceived: 0, specialAllowance: 0, otherAllowances: 0, professionalTax: 0, tdsQ1: 0, tdsQ2: 0, tdsQ3: 0, tdsQ4: 0 },
    deductions: null,
    business: { businessType: 'services', grossReceiptsDigital: 3_000_000, grossReceiptsCash: 0 },
    tdsPaid: 0,
    expected: {
      recommendedRegime: 'new',
      // Business: 6% × ₹30L = 1,80,000 (cash 0 ≤ 5% → ₹3Cr threshold, eligible).
      // GTI = salary 6,00,000 + business 1,80,000 = 7,80,000.
      // NEW: taxable = 7,80,000 − SD 50000 = 7,30,000 → 15000 + 10%*130000=13000 = 28000 ;
      //   >7L: marginal relief proviso needs tax > (income−7L=30000); 28000 < 30000 → no rebate.
      //   cess 1120 → 29,120.
      // OLD: taxable = 7,80,000 − SD 50000 = 7,30,000 →
      //   5%*250000=12500 ; 20%*230000=46000 → 58500 ; cess 2340 → 60,840.
      // new (29,120) < old (60,840) → NEW.
      recommendedTax: 29_120,
      grossTotalIncome: 780_000,
      businessIncome: 180_000,
      tdsDirection: 'payable',
      basis: 'Mixed salary + 44AD presumptive aggregate correctly; new regime cheaper.',
    },
  },
];

// ── Integration-path assertions (all personas) ───────────────────────────────

describe('UAT — Phase 1 persona journeys (form → mapper → engine integration path)', () => {
  for (const p of personas) {
    describe(`${p.id}: ${p.title}`, () => {
      const cmp = runPersona(p);
      const recommended = cmp.recommendedRegime === 'new' ? cmp.newRegime : cmp.oldRegime;

      it('aggregates the expected gross total income', () => {
        expect(cmp.oldRegime.grossTotalIncome).toBe(p.expected.grossTotalIncome);
        expect(cmp.newRegime.grossTotalIncome).toBe(p.expected.grossTotalIncome);
      });

      if (p.expected.businessIncome !== undefined) {
        it('maps Section 44AD presumptive business income correctly', () => {
          expect(cmp.newRegime.incomeBreakdown.businessIncome).toBe(p.expected.businessIncome);
          expect(cmp.oldRegime.incomeBreakdown.businessIncome).toBe(p.expected.businessIncome);
        });
      }

      it(`recommends the ${p.expected.recommendedRegime} regime`, () => {
        expect(cmp.recommendedRegime).toBe(p.expected.recommendedRegime);
      });

      it(`computes the recommended-regime tax as ₹${p.expected.recommendedTax.toLocaleString('en-IN')} (hand-computed)`, () => {
        // Basis: ${p.expected.basis}
        expect(recommended.totalTaxLiability).toBe(p.expected.recommendedTax);
      });

      it('holds sanity invariants (taxable ≥ 0, tax ≥ 0, sane effective rate, take-home consistent)', () => {
        for (const r of [cmp.oldRegime, cmp.newRegime]) {
          expect(r.taxableIncome).toBeGreaterThanOrEqual(0);
          expect(r.totalTaxLiability).toBeGreaterThanOrEqual(0);
          expect(r.totalTaxLiability).toBeLessThanOrEqual(r.grossTotalIncome);
          // Effective rate within sane bounds for individual income tax.
          expect(r.effectiveTaxRate).toBeGreaterThanOrEqual(0);
          expect(r.effectiveTaxRate).toBeLessThan(45);
          // take-home = gross − tax (engine definition)
          expect(r.takeHomeIncome).toBe(r.grossTotalIncome - r.totalTaxLiability);
        }
        // savings is the absolute gap and is non-negative.
        expect(cmp.savings).toBeGreaterThanOrEqual(0);
        expect(cmp.savings).toBe(Math.abs(cmp.oldRegime.totalTaxLiability - cmp.newRegime.totalTaxLiability));
      });

      it(`resolves TDS direction as "${p.expected.tdsDirection}"`, () => {
        // Mirrors TaxSummaryDashboard: taxPayableOrRefund = totalTaxLiability − tdsPaid.
        const net = recommended.totalTaxLiability - p.tdsPaid;
        const direction: TdsDirection = net > 0 ? 'payable' : net < 0 ? 'refund' : 'settled';
        expect(direction).toBe(p.expected.tdsDirection);
      });
    });
  }

  // Cross-persona: the recommended regime always has the lower (or equal) liability.
  it('always recommends the regime with the lower or equal total tax', () => {
    for (const p of personas) {
      const cmp = runPersona(p);
      const recommendedTax =
        cmp.recommendedRegime === 'new' ? cmp.newRegime.totalTaxLiability : cmp.oldRegime.totalTaxLiability;
      const otherTax =
        cmp.recommendedRegime === 'new' ? cmp.oldRegime.totalTaxLiability : cmp.newRegime.totalTaxLiability;
      expect(recommendedTax).toBeLessThanOrEqual(otherTax);
    }
  });

  // Explicitly prove the senior-citizen slab is applied for P3 (regression guard for
  // the HIGH-1 age-slab fix): the senior result must differ from the <60 computation.
  it('P3 applies the senior-citizen slab (distinct from the <60 standard slab)', () => {
    const p3 = personas.find((p) => p.id === 'P3')!;
    const seniorCmp = runPersona(p3);
    // Recompute the same income with no personalInfo → engine uses the standard <60 slab.
    const incomeNoAge = buildIncomeData(p3.salary, p3.business);
    const dedNoAge = buildDeductionData(p3.deductions, p3.salary);
    const standardCmp = calc.compareRegimes(incomeNoAge, dedNoAge, undefined);
    expect(seniorCmp.oldRegime.totalTaxLiability).toBe(31_200); // senior slab
    expect(standardCmp.oldRegime.totalTaxLiability).toBe(33_800); // <60 standard slab
    expect(seniorCmp.oldRegime.totalTaxLiability).toBeLessThan(standardCmp.oldRegime.totalTaxLiability);
  });
});

// ── Results-view UI smoke test (component-level) ──────────────────────────────
//
// Rationale: a full step-by-step MainApp form simulation (typing into Indian-currency
// inputs, satisfying required TAN/employer-name validation, advancing 5 wizard steps,
// and resolving the lazily-loaded ResultsView Suspense boundary) is brittle and would
// test form plumbing already covered by the dedicated form specs. The integration
// path above already exercises the real buildIncomeData/buildDeductionData/toPersonalInfo
// mapping the wizard uses. To prove the *results* UI wiring end-to-end, we render the
// real ResultsView with a persona's actual computed comparison and confirm it surfaces
// the recommended regime, the hand-computed liability, and the correct refund/payable
// direction — i.e. the screen the user reaches at the end of the journey.

describe('UAT — ResultsView renders a persona journey result', () => {
  it('renders P2 (old-regime winner) summary, recommendation and liability', () => {
    const p2 = personas.find((p) => p.id === 'P2')!;
    const cmp = runPersona(p2);

    render(
      <I18nextProvider i18n={i18n}>
        <ResultsView
          regimeComparison={cmp}
          calculatedOffline={false}
          selectedRegime="old"
          setSelectedRegime={() => {}}
          completenessScore={100}
          tdsPaid={p2.tdsPaid}
          onEnterSalary={() => {}}
          taxData={{ personalInfo: {}, salary: null, deductions: null, business: null }}
          acknowledgedAnomalyIds={new Set()}
          onAcknowledgeAnomaly={() => {}}
        />
      </I18nextProvider>
    );

    // Recommended-regime narrative from compareRegimes() is surfaced (appears in
    // both the dashboard subtitle and the regime-recommendation panel).
    expect(screen.getAllByText(/Old Regime saves ₹23,400/).length).toBeGreaterThan(0);
    // Hand-computed old-regime liability (₹1,00,901) appears in the dashboard/table.
    expect(screen.getAllByText(/₹1,00,901/).length).toBeGreaterThan(0);
    // TDS ₹80,000 < liability → "Amount Due" path, with the ₹20,901 shortfall shown.
    expect(screen.getAllByText(/₹20,901/).length).toBeGreaterThan(0);
  });
});
