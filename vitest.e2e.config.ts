/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tests/e2e/**/*.{test,spec}.{ts,tsx}'],
    name: 'e2e',
    testTimeout: 60000,
    hookTimeout: 60000
  }
});