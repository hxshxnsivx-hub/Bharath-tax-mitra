/**
 * useTaxForm — centralized form state hook with auto-save and draft restore.
 *
 * Responsibilities:
 *  - Holds the complete TaxFormData state for a tax-filing session
 *  - Provides typed partial-update setters for each sub-section
 *  - Auto-saves to IndexedDB every 30 seconds when the form is dirty
 *  - Restores the most-recent draft from IndexedDB on mount
 *  - Exposes `isDirty`, `lastSavedAt`, and `clearDraft` for UI feedback
 *
 * Requirements: 1.4 (draft persistence), 20.5 (data loss prevention)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/db';
import type {
  TaxFormData,
  PersonalInfoFormData,
  SalaryIncomeFormData,
  DeductionFormData,
  BusinessInfoFormData,
} from '../../../shared/types/form-data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds
const DEFAULT_FY = 'FY2025-26';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTaxFormOptions {
  /** Authenticated user ID — used to scope the draft key */
  userId: string;
  /** Active session ID — stored with the draft for cross-reference */
  sessionId: string;
  /** Financial year — defaults to 'FY2025-26' */
  financialYear?: string;
}

export interface UseTaxFormReturn {
  /** The live form state */
  taxFormData: TaxFormData;

  // Setters — each merges a partial update into the corresponding sub-section
  updatePersonalInfo: (patch: Partial<PersonalInfoFormData>) => void;
  updateSalaryIncome: (patch: Partial<SalaryIncomeFormData>) => void;
  updateDeductions: (patch: Partial<DeductionFormData>) => void;
  updateBusinessInfo: (patch: Partial<BusinessInfoFormData>) => void;
  setRegime: (regime: 'old' | 'new') => void;

  /** True when there are unsaved changes since the last successful save */
  isDirty: boolean;
  /** Unix timestamp (ms) of the last successful auto-save, or undefined */
  lastSavedAt: number | undefined;

  /** Manually trigger a save to IndexedDB immediately */
  saveDraft: () => Promise<void>;
  /** Delete the saved draft from IndexedDB and reset dirty state */
  clearDraft: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Default form state factory
// ---------------------------------------------------------------------------

function buildDefaultFormData(financialYear: string): TaxFormData {
  return {
    personalInfo: {},
    salaryIncome: {},
    deductions: {},
    businessInfo: {},
    selectedRegime: 'new',
    financialYear,
    lastSavedAt: undefined,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaxForm({
  userId,
  sessionId,
  financialYear = DEFAULT_FY,
}: UseTaxFormOptions): UseTaxFormReturn {
  const draftId = `draft-${userId}-${financialYear}`;

  const [taxFormData, setTaxFormData] = useState<TaxFormData>(() =>
    buildDefaultFormData(financialYear)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);

  // Track whether the initial restore from IndexedDB has completed
  const restoredRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Restore draft on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function restoreDraft() {
      try {
        const saved = await db.savedDrafts.get(draftId);
        if (cancelled) return;

        if (saved?.formData) {
          // SavedDraft.formData is heterogeneous (Record<string, unknown>) — this
          // draft key is only ever written by this hook, so the shape is known.
          const restored = saved.formData as unknown as TaxFormData;
          setTaxFormData(restored);
          setLastSavedAt(saved.savedAt);
          setIsDirty(false);
        }
      } catch (err) {
        console.error('[useTaxForm] Failed to restore draft:', err);
      } finally {
        restoredRef.current = true;
      }
    }

    restoreDraft();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  // ---------------------------------------------------------------------------
  // Save helper
  // ---------------------------------------------------------------------------
  const saveDraft = useCallback(async () => {
    try {
      const now = Date.now();
      const dataToSave: TaxFormData = {
        ...taxFormData,
        lastSavedAt: now,
      };

      await db.savedDrafts.put({
        draftId,
        sessionId,
        formData: dataToSave as unknown as Record<string, unknown>,
        savedAt: now,
        autoSave: true,
      });

      setTaxFormData(dataToSave);
      setLastSavedAt(now);
      setIsDirty(false);
    } catch (err) {
      console.error('[useTaxForm] Auto-save failed:', err);
    }
  }, [draftId, sessionId, taxFormData]);

  // Keep a stable ref so the interval doesn't need to be re-registered on each
  // render cycle — the interval callback reads the ref to get the latest save fn.
  const saveDraftRef = useRef(saveDraft);
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  // ---------------------------------------------------------------------------
  // Auto-save every 30 seconds when dirty
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty && restoredRef.current) {
        saveDraftRef.current();
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isDirty]);

  // ---------------------------------------------------------------------------
  // Clear draft
  // ---------------------------------------------------------------------------
  const clearDraft = useCallback(async () => {
    try {
      await db.savedDrafts.delete(draftId);
      setTaxFormData(buildDefaultFormData(financialYear));
      setLastSavedAt(undefined);
      setIsDirty(false);
    } catch (err) {
      console.error('[useTaxForm] Failed to clear draft:', err);
    }
  }, [draftId, financialYear]);

  // ---------------------------------------------------------------------------
  // Typed partial-update setters
  // ---------------------------------------------------------------------------

  const updatePersonalInfo = useCallback(
    (patch: Partial<PersonalInfoFormData>) => {
      setTaxFormData((prev: TaxFormData) => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, ...patch },
      }));
      setIsDirty(true);
    },
    []
  );

  const updateSalaryIncome = useCallback(
    (patch: Partial<SalaryIncomeFormData>) => {
      setTaxFormData((prev: TaxFormData) => ({
        ...prev,
        salaryIncome: { ...prev.salaryIncome, ...patch },
      }));
      setIsDirty(true);
    },
    []
  );

  const updateDeductions = useCallback(
    (patch: Partial<DeductionFormData>) => {
      setTaxFormData((prev: TaxFormData) => ({
        ...prev,
        deductions: { ...prev.deductions, ...patch },
      }));
      setIsDirty(true);
    },
    []
  );

  const updateBusinessInfo = useCallback(
    (patch: Partial<BusinessInfoFormData>) => {
      setTaxFormData((prev: TaxFormData) => ({
        ...prev,
        businessInfo: { ...prev.businessInfo, ...patch },
      }));
      setIsDirty(true);
    },
    []
  );

  const setRegime = useCallback((regime: 'old' | 'new') => {
    setTaxFormData((prev: TaxFormData) => ({ ...prev, selectedRegime: regime }));
    setIsDirty(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    taxFormData,
    updatePersonalInfo,
    updateSalaryIncome,
    updateDeductions,
    updateBusinessInfo,
    setRegime,
    isDirty,
    lastSavedAt,
    saveDraft,
    clearDraft,
  };
}
