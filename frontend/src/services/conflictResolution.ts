/**
 * Sync conflict detection & resolution (task 4.10).
 *
 * When a record was edited locally (offline) AND changed on the server since
 * the local copy's base, replaying the local write blindly would clobber one
 * side. This module detects the divergence field-by-field and applies the
 * user's resolution choice.
 *
 * Correctness properties (design Property 36/37):
 *  - 36: user edits take priority in an *automatic* resolution — `resolveAuto`
 *        keeps the local value.
 *  - 37: resolution preserves data integrity — the result is always one intact
 *        side's value per field plus a fresh `updatedAt`, never a half-merged
 *        record.
 *
 * Metadata fields (ids, timestamps, sync bookkeeping) are never treated as
 * conflicts — only substantive data fields are compared.
 */

export type ConflictChoice = 'local' | 'server';

export interface ConflictField {
  field: string;
  local: unknown;
  server: unknown;
}

export interface ConflictResult<T> {
  hasConflict: boolean;
  fields: ConflictField[];
  local: T;
  server: T;
  localUpdatedAt: number;
  serverUpdatedAt: number;
}

const IGNORED_FIELDS = new Set([
  'updatedAt',
  'createdAt',
  'lastSyncTimestamp',
  'lastSyncAt',
  'syncStatus',
  'sessionId',
  'userId',
  'draftId',
  'calculationId',
]);

function toComparable(v: unknown): string {
  return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
}

/**
 * Detect field-level conflicts between a local and a server record. A field
 * conflicts only when both sides hold it and the values differ.
 */
export function detectConflicts<T extends Record<string, unknown>>(
  local: T,
  server: T
): ConflictResult<T> {
  const fields: ConflictField[] = [];
  const keys = new Set([...Object.keys(local), ...Object.keys(server)]);

  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const l = local[key];
    const s = server[key];
    // Only a conflict when both are present and genuinely differ.
    if (l !== undefined && s !== undefined && toComparable(l) !== toComparable(s)) {
      fields.push({ field: key, local: l, server: s });
    }
  }

  return {
    hasConflict: fields.length > 0,
    fields,
    local,
    server,
    localUpdatedAt: Number(local.updatedAt ?? 0),
    serverUpdatedAt: Number(server.updatedAt ?? 0),
  };
}

/**
 * Apply the user's explicit resolution choice, returning a clean record with a
 * refreshed `updatedAt` and a `synced` status. Non-conflicting fields are
 * taken from the chosen side too, so the result is internally consistent.
 */
export function resolveConflict<T extends Record<string, unknown>>(
  choice: ConflictChoice,
  local: T,
  server: T,
  now: number = Date.now()
): T {
  const base = choice === 'local' ? local : server;
  return { ...base, updatedAt: now, syncStatus: 'synced' } as T;
}

/**
 * Automatic resolution when no user is present to choose: user edits win
 * (Property 36). Used by the background sync path so offline work is never
 * silently overwritten by a server copy.
 */
export function resolveAuto<T extends Record<string, unknown>>(
  local: T,
  server: T,
  now: number = Date.now()
): T {
  return resolveConflict('local', local, server, now);
}
