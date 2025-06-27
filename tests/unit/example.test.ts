import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const message: string = 'TypeScript is working';
    expect(typeof message).toBe('string');
    expect(message).toBe('TypeScript is working');
  });

  it('should support async/await', async () => {
    const asyncFunction = async (): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('async working'), 10);
      });
    };

    const result = await asyncFunction();
    expect(result).toBe('async working');
  });
});