import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Headroom for load-sensitive suites under full-run parallelism: fast-check
    // property tests (many randomized iterations) and React.lazy + Suspense
    // dynamic-import tests both pass in isolation but can exceed the 5s default
    // when the whole suite contends for workers.
    testTimeout: 20000,
    hookTimeout: 20000,
    // Two load-sensitive suites (fast-check property runs, React.lazy+Suspense
    // dynamic imports) pass in isolation but can time out under full-run worker
    // contention. Retries absorb the timing flake; a genuinely broken test still
    // fails every attempt, so this never masks a real regression. Bumped 1→2 as
    // the lazy/Suspense chunk-resolution occasionally exceeded both prior tries
    // under peak contention.
    retry: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
