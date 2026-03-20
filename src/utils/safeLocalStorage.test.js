import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeLocalStorage } from './safeLocalStorage';

// Mock localStorage for Node environment
const mockStorage = {};
beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  
  globalThis.localStorage = {
    getItem: vi.fn((key) => mockStorage[key] ?? null),
    setItem: vi.fn((key, value) => { mockStorage[key] = String(value); }),
    removeItem: vi.fn((key) => { delete mockStorage[key]; }),
  };
});

describe('safeLocalStorage', () => {
  it('should get/set/remove items', () => {
    safeLocalStorage.setItem('test_key', 'hello');
    expect(safeLocalStorage.getItem('test_key')).toBe('hello');
    safeLocalStorage.removeItem('test_key');
    expect(safeLocalStorage.getItem('test_key')).toBeNull();
  });

  it('should return null for missing keys', () => {
    expect(safeLocalStorage.getItem('nonexistent_key_xyz')).toBeNull();
  });

  it('should handle localStorage errors gracefully', () => {
    globalThis.localStorage.getItem = vi.fn(() => { throw new Error('denied'); });
    expect(safeLocalStorage.getItem('test')).toBeNull();
  });

  it('should handle setItem errors gracefully', () => {
    globalThis.localStorage.setItem = vi.fn(() => { throw new Error('denied'); });
    // Should not throw
    expect(() => safeLocalStorage.setItem('test', 'value')).not.toThrow();
  });
});
