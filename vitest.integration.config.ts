/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
    name: 'integration',
    testTimeout: 30000,
    hookTimeout: 30000
  }
});