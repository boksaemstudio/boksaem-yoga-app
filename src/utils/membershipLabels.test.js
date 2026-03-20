import { describe, it, expect } from 'vitest';
import { getMembershipLabel } from './membershipLabels';

describe('getMembershipLabel', () => {
  const mockConfig = {
    PRICING: {
      premium: { label: '프리미엄' },
      vip: { label: 'VIP' },
    },
    MEMBERSHIP_TYPE_MAP: {
      general: '일반',
      advanced: '심화',
    },
  };

  it('should return label from PRICING first', () => {
    expect(getMembershipLabel('premium', mockConfig)).toBe('프리미엄');
  });

  it('should fall back to MEMBERSHIP_TYPE_MAP', () => {
    expect(getMembershipLabel('general', mockConfig)).toBe('일반');
    expect(getMembershipLabel('advanced', mockConfig)).toBe('심화');
  });

  it('should return key as-is if no mapping found', () => {
    expect(getMembershipLabel('unknown_type', mockConfig)).toBe('unknown_type');
  });

  it('should return default for empty/null key', () => {
    expect(getMembershipLabel('', mockConfig)).toBe('일반');
    expect(getMembershipLabel(null, mockConfig)).toBe('일반');
    expect(getMembershipLabel(undefined, mockConfig)).toBe('일반');
  });

  it('should handle missing config gracefully', () => {
    expect(getMembershipLabel('general', {})).toBe('general');
    expect(getMembershipLabel('general', null)).toBe('general');
  });
});
