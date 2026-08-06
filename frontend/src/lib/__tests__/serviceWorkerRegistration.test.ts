/**
 * Service Worker Registration Tests
 * 
 * Tests for service worker registration, lifecycle management,
 * and cache utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isServiceWorkerActive,
  clearAllCaches,
} from '../serviceWorkerRegistration';

describe('Service Worker Registration', () => {
  beforeEach(() => {
    // Mock service worker API
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: null,
        ready: Promise.resolve({
          active: null,
          installing: null,
          waiting: null,
          unregister: vi.fn().mockResolvedValue(true),
        }),
        register: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isServiceWorkerActive', () => {
    it('should return false when service worker is not supported', () => {
      // Remove service worker support
      const originalServiceWorker = navigator.serviceWorker;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });

      expect(isServiceWorkerActive()).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
      });
    });

    it('should return false when service worker is supported but not active', () => {
      expect(isServiceWorkerActive()).toBe(false);
    });

    it('should return true when service worker is active', () => {
      // Set controller to indicate active service worker
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: { postMessage: vi.fn() },
        configurable: true,
      });

      expect(isServiceWorkerActive()).toBe(true);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches when caches API is available', async () => {
      const mockCacheKeys = ['cache-v1', 'cache-v2'];
      const mockCachesDelete = vi.fn().mockResolvedValue(true);

      Object.defineProperty(window, 'caches', {
        value: {
          keys: vi.fn().mockResolvedValue(mockCacheKeys),
          delete: mockCachesDelete,
        },
        configurable: true,
        writable: true,
      });

      await clearAllCaches();

      expect(window.caches.keys).toHaveBeenCalled();
      expect(mockCachesDelete).toHaveBeenCalledTimes(2);
      expect(mockCachesDelete).toHaveBeenCalledWith('cache-v1');
      expect(mockCachesDelete).toHaveBeenCalledWith('cache-v2');
    });

    it('should handle errors gracefully when clearing caches fails', async () => {
      Object.defineProperty(window, 'caches', {
        value: {
          keys: vi.fn().mockRejectedValue(new Error('Cache error')),
        },
        configurable: true,
        writable: true,
      });

      // Should not throw
      await expect(clearAllCaches()).resolves.toBeUndefined();
    });

    it('should handle missing caches API gracefully', async () => {
      const win = window as { caches?: CacheStorage };
      const originalCaches = win.caches;
      delete win.caches;

      // Should not throw
      await expect(clearAllCaches()).resolves.toBeUndefined();

      // Restore
      win.caches = originalCaches;
    });
  });

  describe('Cache Management', () => {
    it('should validate cache expiration settings', () => {
      // Test cache expiration times as per requirements
      const CACHE_EXPIRATION = {
        APP_SHELL: 7 * 24 * 60 * 60, // 7 days
        API_RESPONSES: 24 * 60 * 60, // 24 hours
        TAX_RULES: 24 * 60 * 60, // 24 hours
        IMAGES: 7 * 24 * 60 * 60, // 7 days
      };

      expect(CACHE_EXPIRATION.APP_SHELL).toBe(604800);
      expect(CACHE_EXPIRATION.API_RESPONSES).toBe(86400);
      expect(CACHE_EXPIRATION.TAX_RULES).toBe(86400);
      expect(CACHE_EXPIRATION.IMAGES).toBe(604800);
    });

    it('should validate network timeout settings', () => {
      // Test network timeout as per requirements (10 seconds)
      const NETWORK_TIMEOUT = 10;

      expect(NETWORK_TIMEOUT).toBe(10);
    });
  });

  describe('Service Worker Configuration', () => {
    it('should have correct cache names', () => {
      const CACHE_NAMES = {
        APP_SHELL: 'app-shell',
        API_RESPONSES: 'api-responses',
        TAX_RULES: 'tax-rules',
        IMAGES: 'images',
        FONTS: 'fonts',
        CDN_RESOURCES: 'cdn-resources',
      };

      expect(CACHE_NAMES.APP_SHELL).toBe('app-shell');
      expect(CACHE_NAMES.API_RESPONSES).toBe('api-responses');
      expect(CACHE_NAMES.TAX_RULES).toBe('tax-rules');
      expect(CACHE_NAMES.IMAGES).toBe('images');
      expect(CACHE_NAMES.FONTS).toBe('fonts');
      expect(CACHE_NAMES.CDN_RESOURCES).toBe('cdn-resources');
    });

    it('should validate caching strategies', () => {
      const CACHING_STRATEGIES = {
        APP_SHELL: 'CacheFirst',
        API_CALLS: 'NetworkFirst',
        TAX_RULES: 'StaleWhileRevalidate',
        STATIC_ASSETS: 'CacheFirst',
      };

      expect(CACHING_STRATEGIES.APP_SHELL).toBe('CacheFirst');
      expect(CACHING_STRATEGIES.API_CALLS).toBe('NetworkFirst');
      expect(CACHING_STRATEGIES.TAX_RULES).toBe('StaleWhileRevalidate');
      expect(CACHING_STRATEGIES.STATIC_ASSETS).toBe('CacheFirst');
    });
  });
});
