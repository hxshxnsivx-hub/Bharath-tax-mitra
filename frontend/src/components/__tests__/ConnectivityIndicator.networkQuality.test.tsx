/**
 * ConnectivityIndicator — three-state connectivity tests
 *
 * Validates Requirement 10.4 (connectivity indicator) extended to three states:
 *  - Green  → online with a healthy connection
 *  - Yellow → online but on a slow (2G-class) connection
 *  - Red    → offline
 *
 * The slow state is derived from the Network Information API via
 * useNetworkQuality, which is mocked here to drive each branch deterministically.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectivityIndicator } from '../ConnectivityIndicator';
import * as useServiceWorkerHook from '../../hooks/useServiceWorker';
import * as useNetworkQualityHook from '../../hooks/useNetworkQuality';

vi.mock('../../hooks/useServiceWorker', () => ({
  useOnlineStatus: vi.fn(() => true),
  useServiceWorker: vi.fn(() => ({
    isOfflineReady: false,
    needRefresh: false,
    isActive: true,
    updateServiceWorker: vi.fn(),
    checkForUpdates: vi.fn(),
    cacheStats: { cacheNames: [], totalSize: 0 },
  })),
}));

vi.mock('../../hooks/useNetworkQuality', () => ({
  useNetworkQuality: vi.fn(() => ({ isSlow: false, effectiveType: '4g', isSupported: true })),
}));

describe('ConnectivityIndicator — three-state connectivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows GREEN "Online" when online with a healthy connection', () => {
    vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(true);
    vi.spyOn(useNetworkQualityHook, 'useNetworkQuality').mockReturnValue({
      isSlow: false,
      effectiveType: '4g',
      isSupported: true,
    });

    render(<ConnectivityIndicator />);

    const status = screen.getByRole('status', { name: 'Online' });
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('shows YELLOW "Slow Connection" when online but on a 2G-class network', () => {
    vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(true);
    vi.spyOn(useNetworkQualityHook, 'useNetworkQuality').mockReturnValue({
      isSlow: true,
      effectiveType: '2g',
      isSupported: true,
    });

    render(<ConnectivityIndicator />);

    const status = screen.getByRole('status', { name: 'Slow connection' });
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('bg-yellow-100', 'text-yellow-800');
    expect(screen.getByText('Slow Connection')).toBeInTheDocument();
  });

  it('shows RED "Offline" when disconnected (overrides slow state)', () => {
    vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(false);
    vi.spyOn(useNetworkQualityHook, 'useNetworkQuality').mockReturnValue({
      isSlow: true,
      effectiveType: 'slow-2g',
      isSupported: true,
    });

    render(<ConnectivityIndicator />);

    const status = screen.getByRole('status', { name: 'Offline' });
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('bg-red-100', 'text-red-800');
  });
});
