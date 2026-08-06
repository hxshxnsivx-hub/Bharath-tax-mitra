/**
 * Sync conflict detection & resolution (task 4.10.1) — Properties 36/37.
 */

import { describe, it, expect } from 'vitest';
import { detectConflicts, resolveConflict, resolveAuto } from '../conflictResolution';

const local = {
  sessionId: 's1',
  userId: 'u1',
  grossSalary: 1_300_000,
  regime: 'old',
  completenessScore: 90,
  updatedAt: 2000,
  syncStatus: 'pending',
};
const server = {
  sessionId: 's1',
  userId: 'u1',
  grossSalary: 1_200_000, // differs
  regime: 'old',
  completenessScore: 60, // differs
  updatedAt: 1000,
  syncStatus: 'synced',
};

describe('detectConflicts', () => {
  it('flags only substantive fields that differ, ignoring metadata', () => {
    const r = detectConflicts(local, server);
    expect(r.hasConflict).toBe(true);
    const names = r.fields.map((f) => f.field).sort();
    expect(names).toEqual(['completenessScore', 'grossSalary']);
    // metadata (updatedAt, syncStatus, ids) must never appear as conflicts
    expect(names).not.toContain('updatedAt');
    expect(names).not.toContain('syncStatus');
  });

  it('exposes each side and its last-edited timestamp', () => {
    const r = detectConflicts(local, server);
    expect(r.localUpdatedAt).toBe(2000);
    expect(r.serverUpdatedAt).toBe(1000);
    const gross = r.fields.find((f) => f.field === 'grossSalary')!;
    expect(gross.local).toBe(1_300_000);
    expect(gross.server).toBe(1_200_000);
  });

  it('reports no conflict when substantive fields match', () => {
    const same = { ...server, grossSalary: 1_300_000, completenessScore: 90, updatedAt: 9999 };
    expect(detectConflicts(local, same).hasConflict).toBe(false);
  });

  it('does not treat a field present on only one side as a conflict', () => {
    const r = detectConflicts({ ...local, extra: 'x' } as never, server as never);
    expect(r.fields.map((f) => f.field)).not.toContain('extra');
  });
});

describe('resolveConflict / resolveAuto (Property 36/37)', () => {
  it('keeps the chosen side wholesale and stamps a fresh synced record', () => {
    const kept = resolveConflict('local', local, server, 5000);
    expect(kept.grossSalary).toBe(1_300_000);
    expect(kept.completenessScore).toBe(90);
    expect(kept.updatedAt).toBe(5000);
    expect(kept.syncStatus).toBe('synced');
  });

  it('use-server takes every server value (no half-merge — Property 37)', () => {
    const kept = resolveConflict('server', local, server, 5000);
    expect(kept.grossSalary).toBe(1_200_000);
    expect(kept.completenessScore).toBe(60);
    expect(kept.syncStatus).toBe('synced');
  });

  it('automatic resolution favours the local (user) edits — Property 36', () => {
    const auto = resolveAuto(local, server, 5000);
    expect(auto.grossSalary).toBe(1_300_000);
    expect(auto.syncStatus).toBe('synced');
  });
});
