/**
 * Design-system utilities (OPT-UI.1).
 *
 * `cn()` merges Tailwind class lists with conflict resolution — the standard
 * shadcn/ui helper. Later classes win over earlier conflicting ones
 * (e.g. cn('p-4', condition && 'p-2') → 'p-2' when condition is true).
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
