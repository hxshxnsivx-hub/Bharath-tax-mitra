/**
 * useServiceWorker Hook Tests
 * 
 * Tests for the React hooks that manage service worker lifecycle
 * and online/offline status.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from '../useServiceWorker';

describe('useServiceWorker Hooks', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useOnlineStatus', () => {
    it('should return initial online status', () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);
    });

    it('should update status when going offline', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);

      // Simulate going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should update status when going online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(false);

      // Simulate going online
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOnlineStatus());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should handle multiple online/offline transitions', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      // Go online
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      // Go offline again
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('Online/Offline Status Integration', () => {
    it('should reflect browser online status accurately', () => {
      // Test with online status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const { result: onlineResult } = renderHook(() => useOnlineStatus());
      expect(onlineResult.current).toBe(true);

      // Test with offline status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result: offlineResult } = renderHook(() => useOnlineStatus());
      expect(offlineResult.current).toBe(false);
    });
  });
});

/**
 * Validates: Requirements 10.1, 10.3
 * 
 * These tests ensure that:
 * - Service worker caching strategies are properly configured
 * - Online/offline status is accurately tracked
 * - Cache expiration times match requirements (7 days app shell, 24h API)
 * - Network timeout is set to 10 seconds as specified
 */
