/**
 * ConflictResolver — sync conflict resolution dialog (task 4.10.2).
 *
 * Shows the diverging fields side by side (this device vs. server) with each
 * side's last-edited time, and lets the user keep one whole side. User edits
 * are framed as the default (Property 36) — the "Keep this device" action is
 * the primary button.
 */

import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui';
import type { ConflictChoice, ConflictResult } from '../services/conflictResolution';

interface ConflictResolverProps<T extends Record<string, unknown>> {
  conflict: ConflictResult<T> | null;
  open: boolean;
  onResolve: (choice: ConflictChoice) => void;
  onOpenChange: (open: boolean) => void;
}

function fmtTime(ts: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function ConflictResolver<T extends Record<string, unknown>>({
  conflict,
  open,
  onResolve,
  onOpenChange,
}: ConflictResolverProps<T>) {
  const { t } = useTranslation();
  if (!conflict) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {t('conflict.title', { defaultValue: 'Two versions found' })}
          </DialogTitle>
          <DialogDescription>
            {t('conflict.body', {
              defaultValue:
                'This return was changed on another device. Choose which version to keep — the other will be discarded.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm" data-testid="conflict-fields">
          <div className="eyebrow text-[hsl(var(--gold-deep))]">
            {t('conflict.thisDevice', { defaultValue: 'This device' })}
            <div className="mt-0.5 font-normal normal-case tracking-normal text-muted-foreground">{fmtTime(conflict.localUpdatedAt)}</div>
          </div>
          <div className="eyebrow text-muted-foreground">
            {t('conflict.server', { defaultValue: 'Server' })}
            <div className="mt-0.5 font-normal normal-case tracking-normal text-muted-foreground">{fmtTime(conflict.serverUpdatedAt)}</div>
          </div>

          {conflict.fields.map((f) => (
            <div key={f.field} className="col-span-2 grid grid-cols-2 gap-3 border-t border-border pt-2">
              <div className="col-span-2 text-xs font-medium text-muted-foreground">{f.field}</div>
              <div className="rounded-lg bg-[hsl(var(--gold)/0.08)] px-3 py-2 font-mono text-xs text-foreground">{fmtValue(f.local)}</div>
              <div className="rounded-lg bg-secondary/40 px-3 py-2 font-mono text-xs text-foreground">{fmtValue(f.server)}</div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <button
            onClick={() => onResolve('server')}
            className="hairline rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/60"
          >
            {t('conflict.useServer', { defaultValue: 'Use server version' })}
          </button>
          <button
            onClick={() => onResolve('local')}
            className="btn-gold rounded-lg px-4 py-2 text-sm font-bold"
          >
            {t('conflict.keepLocal', { defaultValue: 'Keep this device' })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
