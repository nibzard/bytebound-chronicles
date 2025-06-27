/**
 * Global test setup file for Vitest
 * This file runs before all test files
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  
  // Mock console methods to reduce noise during testing
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  // Keep console.error for debugging
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset any mocks or test state before each test
});

afterEach(() => {
  // Cleanup after each test
});