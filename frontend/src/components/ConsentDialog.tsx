/**
 * ConsentDialog — informed consent before PII is collected (task 4.1.3).
 *
 * Requirement 4.6 asks for explicit consent before processing the user's PAN,
 * Aadhaar and bank details. The gate sits in front of the filing wizard (the
 * first point where PII is entered), not the document uploader — document
 * processing is Phase 2 and isn't built, so gating there would be theatre.
 *
 * Consent is deliberate: the primary action stays disabled until the user
 * ticks the box. The choice is persisted so we ask once per device.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui';
import { storeConsent } from '../utils/consent';

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after the user ticks the box and confirms. */
  onConsent: () => void;
}

export function ConsentDialog({ open, onOpenChange, onConsent }: ConsentDialogProps) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);

  const accept = () => {
    if (!checked) return;
    storeConsent();
    onConsent();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {t('consent.title', { defaultValue: 'Before we begin' })}
          </DialogTitle>
          <DialogDescription>
            {t('consent.body', {
              defaultValue:
                'To prepare your return we will process your PAN, Aadhaar and bank details. Everything is encrypted on this device, documents are deleted after 24 hours, and nothing is shared without your say.',
            })}
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-[hsl(var(--gold)/0.06)] p-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--gold-deep))]"
            data-testid="consent-checkbox"
          />
          <span className="text-foreground">
            {t('consent.agree', { defaultValue: 'I consent to my tax details being processed on this device.' })}
          </span>
        </label>

        <DialogFooter>
          <button
            onClick={accept}
            disabled={!checked}
            className="btn-gold rounded-lg px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('consent.continue', { defaultValue: 'Agree & continue' })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
