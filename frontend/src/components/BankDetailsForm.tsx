/**
 * BankDetailsForm — refund bank account (task 3.3.1).
 *
 * Collects IFSC + account number (with a re-enter confirmation) for refund
 * credit. Validates IFSC format locally and looks up the bank/branch online
 * (best-effort, see ifscLookup). Emits a completed {ifsc, bankName, accountNo}
 * to the parent only when everything is valid; emits null otherwise.
 *
 * Premium (ink/gold) styling to match the export screen.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidIFSC, lookupIFSC } from '../services/ifscLookup';
import type { BankDetails } from '../services/itrExport';

interface BankDetailsFormProps {
  onChange: (bank: BankDetails | null) => void;
}

export function BankDetailsForm({ onChange }: BankDetailsFormProps) {
  const { t } = useTranslation();
  const [ifsc, setIfsc] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [confirmNo, setConfirmNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');

  const ifscValid = isValidIFSC(ifsc);
  const accountValid = /^\d{5,18}$/.test(accountNo);
  const confirmMatches = accountNo.length > 0 && accountNo === confirmNo;
  const complete = ifscValid && accountValid && confirmMatches && bankName.trim().length > 0;

  // Emit upward whenever the completed-ness changes.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current(
      complete ? { ifsc: ifsc.toUpperCase(), bankName: bankName.trim(), accountNo } : null
    );
  }, [complete, ifsc, bankName, accountNo]);

  // Debounced IFSC → bank/branch lookup.
  useEffect(() => {
    if (!ifscValid) {
      setLookupState('idle');
      return;
    }
    let cancelled = false;
    setLookupState('loading');
    const timer = setTimeout(async () => {
      const details = await lookupIFSC(ifsc);
      if (cancelled) return;
      if (details) {
        setBankName(details.bank);
        setBranch(details.branch);
        setLookupState('found');
      } else {
        setLookupState('notfound'); // allow manual entry
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ifsc, ifscValid]);

  const fieldClass = (ok: boolean, touched: boolean) =>
    `w-full rounded-lg border bg-card px-4 py-2.5 text-foreground outline-none transition-colors focus:ring-2 focus:ring-[hsl(var(--gold)/0.5)] ${
      touched && !ok ? 'border-destructive' : 'hairline'
    }`;

  return (
    <div className="hairline rounded-2xl bg-card p-6 shadow-elevated">
      <div className="eyebrow mb-1 text-[hsl(var(--gold-deep))]">
        {t('bank.eyebrow', { defaultValue: 'Refund account' })}
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">
        {t('bank.title', { defaultValue: 'Where should we send your refund?' })}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('bank.hint', { defaultValue: 'A refund is due — add the bank account to credit it to.' })}
      </p>

      <div className="mt-5 space-y-4">
        {/* IFSC */}
        <div>
          <label htmlFor="ifsc" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('bank.ifsc', { defaultValue: 'IFSC Code' })}
          </label>
          <input
            id="ifsc"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))}
            placeholder="HDFC0001234"
            className={`${fieldClass(ifscValid, ifsc.length > 0)} font-mono uppercase`}
            autoComplete="off"
          />
          <div className="mt-1 min-h-[1.25rem] text-xs">
            {ifsc.length > 0 && !ifscValid && (
              <span className="text-destructive">{t('bank.ifscInvalid', { defaultValue: 'Format: AAAA0XXXXXX' })}</span>
            )}
            {lookupState === 'loading' && <span className="text-muted-foreground">{t('bank.lookingUp', { defaultValue: 'Looking up bank…' })}</span>}
            {lookupState === 'found' && (
              <span className="text-[hsl(var(--gold-deep))]">
                {bankName}{branch ? ` · ${branch}` : ''}
              </span>
            )}
            {lookupState === 'notfound' && (
              <span className="text-muted-foreground">{t('bank.enterBankManually', { defaultValue: 'Enter your bank name below' })}</span>
            )}
          </div>
        </div>

        {/* Bank name (auto-filled, editable) */}
        <div>
          <label htmlFor="bankName" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('bank.bankName', { defaultValue: 'Bank Name' })}
          </label>
          <input
            id="bankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="HDFC Bank"
            className={fieldClass(bankName.trim().length > 0, false)}
            autoComplete="off"
          />
        </div>

        {/* Account number + confirm */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="acct" className="mb-1.5 block text-sm font-medium text-foreground">
              {t('bank.accountNo', { defaultValue: 'Account Number' })}
            </label>
            <input
              id="acct"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, '').slice(0, 18))}
              placeholder="00000000000000"
              className={`${fieldClass(accountValid, accountNo.length > 0)} font-mono`}
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="acct2" className="mb-1.5 block text-sm font-medium text-foreground">
              {t('bank.confirmAccountNo', { defaultValue: 'Re-enter Account Number' })}
            </label>
            <input
              id="acct2"
              value={confirmNo}
              onChange={(e) => setConfirmNo(e.target.value.replace(/\D/g, '').slice(0, 18))}
              placeholder="00000000000000"
              className={`${fieldClass(confirmMatches, confirmNo.length > 0)} font-mono`}
              inputMode="numeric"
              autoComplete="off"
            />
            {confirmNo.length > 0 && !confirmMatches && (
              <p className="mt-1 text-xs text-destructive">{t('bank.mismatch', { defaultValue: 'Account numbers do not match' })}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
