import { vi } from 'vitest';

export const mockTransaction = {
  execute: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
};

export const mockClient = {
  transaction: vi.fn().mockImplementation(async (mode, callback) => {
    if (typeof mode === 'function') {
      callback = mode;
    }
    if (callback) {
      return await callback(mockTransaction);
    }
  }),
  execute: vi.fn().mockResolvedValue({ rows: [], columns: [] }),
};

export const Client = vi.fn(() => mockClient);
