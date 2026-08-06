/**
 * SettingsView — right-to-erasure + storage management (tasks 4.3.3 / 4.11.1).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/config';
import SettingsView from '../SettingsView';
import { db } from '../../../lib/db';

async function seedData() {
  await db.open();
  await db.profiles.put({
    userId: 'user-123', mobileNumber: 'enc', languageCode: 'en', preferredRegime: 'new',
    lastSyncTimestamp: 0, createdAt: 0, updatedAt: 0,
  });
  await db.savedDrafts.put({ draftId: 'd1', sessionId: 's1', formData: {}, savedAt: 0, autoSave: true });
  await db.taxSessions.put({
    sessionId: 's1', userId: 'user-123', financialYear: 'FY2025-26', status: 'draft',
    completenessScore: 0, createdAt: 0, updatedAt: 0, syncStatus: 'synced',
  });
}

function renderSettings(onLogout = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <SettingsView onLogout={onLogout} authState={{ userId: 'user-123', preferredRegime: 'new' }} />
    </I18nextProvider>
  );
  return onLogout;
}

describe('SettingsView', () => {
  beforeEach(async () => {
    // caches API for clearAllCaches
    vi.stubGlobal('caches', { keys: vi.fn(() => Promise.resolve([])), delete: vi.fn(() => Promise.resolve(true)) });
    await seedData();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await db.delete();
  });

  it('gates deletion behind an explicit confirmation dialog', () => {
    renderSettings();
    // No confirm dialog until the destructive button is pressed.
    expect(screen.queryByText(/Delete all your data\?/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Delete all my data/i }));
    expect(screen.getByText(/Delete all your data\?/i)).toBeInTheDocument();
  });

  it('wipes every local store and logs out on confirm (right to erasure)', async () => {
    const onLogout = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /Delete all my data/i }));
    fireEvent.click(screen.getByRole('button', { name: /Yes, delete everything/i }));

    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    expect(await db.profiles.count()).toBe(0);
    expect(await db.savedDrafts.count()).toBe(0);
    expect(await db.taxSessions.count()).toBe(0);
  });

  it('clears cached files without deleting user data (4.11.1)', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /Clear cached files/i }));
    await waitFor(() => expect(screen.getByText(/Cache cleared ✓/i)).toBeInTheDocument());
    // Tax data untouched.
    expect(await db.profiles.count()).toBe(1);
  });
});

describe('db.deleteAllUserData', () => {
  beforeEach(seedData);
  afterEach(() => db.delete());

  it('clears all six stores', async () => {
    await db.taxRules.put({ financialYear: 'FY2025-26', version: '1', rules: {} as never, cachedAt: 0, expiresAt: 0 });
    await db.deleteAllUserData();
    const counts = await Promise.all([
      db.profiles.count(), db.taxSessions.count(), db.pendingRequests.count(),
      db.savedDrafts.count(), db.taxRules.count(), db.faqCache.count(),
    ]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
