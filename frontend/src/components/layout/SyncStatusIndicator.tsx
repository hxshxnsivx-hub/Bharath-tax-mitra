/**
 * SyncStatusIndicator Component
 *
 * Displays a human-readable sync status string driven by the offline queue:
 *  - Pending operations:  cloud icon + "3 operations pending sync" (amber)
 *  - All synced:          checkmark + "All changes synced" (green)
 *
 * Reads live state from OfflineContext (`pendingCount`, `isOnline`) and formats
 * the message via syncService.formatSyncStatus so the wording stays consistent
 * across the app.
 *
 * Requirements: 10.5, 10.6, 20.1 | Compliance: Data integrity
 */

import { CloudOff, CheckCircle2 } from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';
import { formatSyncStatus } from '../../services/syncService';

interface SyncStatusIndicatorProps {
  className?: string;
}

export function SyncStatusIndicator({ className = '' }: SyncStatusIndicatorProps) {
  const { pendingCount } = useOffline();
  const label = formatSyncStatus(pendingCount);
  const hasPending = pendingCount > 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs ${
        hasPending ? 'text-amber-600' : 'text-green-600'
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {hasPending ? (
        <CloudOff className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  );
}

export default SyncStatusIndicator;
