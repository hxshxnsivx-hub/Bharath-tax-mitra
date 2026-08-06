/**
 * OfflineBadge
 *
 * Small visual badge shown on the tax results view when the calculation was
 * performed while the device was offline. The figures still come from the
 * client-side TaxCalculator running against cached/bundled tax rules, so the
 * badge reassures the user the result is accurate but was produced locally.
 *
 * Requirements: 5.9, 10.2 | Compliance: Consistent calculation
 */

import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBadgeProps {
  className?: string;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Calculated offline"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Calculated Offline</span>
    </div>
  );
};

export default OfflineBadge;
