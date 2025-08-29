import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
