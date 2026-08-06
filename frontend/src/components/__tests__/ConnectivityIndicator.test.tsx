/**
 * ConnectivityIndicator Component Tests
 * 
 * Tests for the connectivity status display and service worker
 * update notifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectivityIndicator, ConnectivityBadge } from '../ConnectivityIndicator';
import * as useServiceWorkerHook from '../../hooks/useServiceWorker';

// Mock the hooks
vi.mock('../../hooks/useServiceWorker', () => ({
  useOnlineStatus: vi.fn(() => true),
  useServiceWorker: vi.fn(() => ({
    isOfflineReady: false,
    needRefresh: false,
    isActive: true,
    updateServiceWorker: vi.fn(),
    checkForUpdates: vi.fn(),
    cacheStats: {
      cacheNames: [],
      totalSize: 0,
    },
  })),
}));

describe('ConnectivityIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Online Status Display', () => {
    it('should display online status when connected', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(true);

      render(<ConnectivityIndicator />);

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Online' })).toBeInTheDocument();
    });

    it('should display offline status when disconnected', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(false);

      render(<ConnectivityIndicator />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Offline' })).toBeInTheDocument();
    });

    it('should have appropriate styling for online status', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(true);

      render(<ConnectivityIndicator />);
      const statusElement = screen.getByText('Online').closest('div');

      expect(statusElement).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should have appropriate styling for offline status', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(false);

      render(<ConnectivityIndicator />);
      const statusElement = screen.getByText('Offline').closest('div');

      expect(statusElement).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Offline Ready Badge', () => {
    it('should display offline ready badge when app is offline-ready', () => {
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: true,
        needRefresh: false,
        isActive: true,
        updateServiceWorker: vi.fn(),
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator />);

      expect(screen.getByText('Offline Ready')).toBeInTheDocument();
    });

    it('should not display offline ready badge when not ready', () => {
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: false,
        needRefresh: false,
        isActive: true,
        updateServiceWorker: vi.fn(),
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator />);

      expect(screen.queryByText('Offline Ready')).not.toBeInTheDocument();
    });

    it('should not display offline ready badge when update is needed', () => {
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: true,
        needRefresh: true,
        isActive: true,
        updateServiceWorker: vi.fn(),
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator />);

      expect(screen.queryByText('Offline Ready')).not.toBeInTheDocument();
    });
  });

  describe('Update Notification', () => {
    it('should display update notification when update is available', () => {
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: false,
        needRefresh: true,
        isActive: true,
        updateServiceWorker: vi.fn(),
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator showUpdatePrompt />);

      expect(screen.getByText('Update Available')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update application to latest version' })).toBeInTheDocument();
    });

    it('should call updateServiceWorker when update button is clicked', () => {
      const mockUpdateServiceWorker = vi.fn();
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: false,
        needRefresh: true,
        isActive: true,
        updateServiceWorker: mockUpdateServiceWorker,
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator showUpdatePrompt />);

      const updateButton = screen.getByRole('button', { name: 'Update application to latest version' });
      fireEvent.click(updateButton);

      expect(mockUpdateServiceWorker).toHaveBeenCalledTimes(1);
    });

    it('should not display update notification when showUpdatePrompt is false', () => {
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: false,
        needRefresh: true,
        isActive: true,
        updateServiceWorker: vi.fn(),
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator showUpdatePrompt={false} />);

      expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });

    it('should not display update notification when no update is needed', () => {
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: false,
        needRefresh: false,
        isActive: true,
        updateServiceWorker: vi.fn(),
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator showUpdatePrompt />);

      expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });
  });

  describe('ConnectivityBadge', () => {
    it('should display online badge when connected', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(true);

      render(<ConnectivityBadge />);

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Online' })).toBeInTheDocument();
    });

    it('should display offline badge when disconnected', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(false);

      render(<ConnectivityBadge />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Offline' })).toBeInTheDocument();
    });

    it('should have appropriate styling for online badge', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(true);

      const { container } = render(<ConnectivityBadge />);
      const indicator = container.querySelector('.bg-green-500');

      expect(indicator).toBeInTheDocument();
    });

    it('should have appropriate styling for offline badge', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(false);

      const { container } = render(<ConnectivityBadge />);
      const indicator = container.querySelector('.bg-red-500');

      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles and labels', () => {
      vi.spyOn(useServiceWorkerHook, 'useOnlineStatus').mockReturnValue(true);

      render(<ConnectivityIndicator />);

      const statusElement = screen.getByRole('status', { name: 'Online' });
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      expect(statusElement).toHaveAttribute('aria-label', 'Online');
    });

    it('should have proper alert role for update notification', () => {
      vi.spyOn(useServiceWorkerHook, 'useServiceWorker').mockReturnValue({
        isOfflineReady: false,
        needRefresh: true,
        isActive: true,
        updateServiceWorker: vi.fn(),
        checkForUpdates: vi.fn(),
        cacheStats: {
          cacheNames: [],
          totalSize: 0,
        },
      });

      render(<ConnectivityIndicator showUpdatePrompt />);

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const customClass = 'custom-test-class';
      const { container } = render(<ConnectivityIndicator className={customClass} />);

      expect(container.firstChild).toHaveClass(customClass);
    });
  });
});

/**
 * Validates: Requirements 10.1, 10.3, 10.4
 * 
 * These tests ensure that:
 * - Connectivity status is displayed accurately
 * - Service worker update notifications work correctly
 * - Offline-ready badge appears when PWA is ready
 * - Accessibility requirements are met (ARIA roles, labels)
 * - User interactions (update button) function properly
 */
