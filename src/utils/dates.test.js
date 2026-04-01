import { describe, it, expect } from 'vitest';
import {
  safeParseDate,
  compareDates,
  getDaysDifference,
  getDaysRemaining,
  dayNameToNumber,
  numberToDayName,
  getDayName,
  isSaturday,
  isSunday,
  isWeekend,
  toKSTDateString,
} from './dates';

describe('safeParseDate', () => {
  it('should parse YYYY-MM-DD strings as local dates', () => {
    const d = safeParseDate('2026-03-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // 0-based => March
    expect(d.getDate()).toBe(15);
  });

  it('should parse ISO strings', () => {
    const d = safeParseDate('2026-03-15T10:30:00Z');
    expect(d instanceof Date).toBe(true);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('should parse Firestore-like timestamps', () => {
    const d = safeParseDate({ seconds: 1773720000 });
    expect(d instanceof Date).toBe(true);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('should return invalid date for null/undefined', () => {
    expect(isNaN(safeParseDate(null).getTime())).toBe(true);
    expect(isNaN(safeParseDate(undefined).getTime())).toBe(true);
  });
});

describe('compareDates', () => {
  it('should return 0 for equal dates', () => {
    expect(compareDates('2026-03-15', '2026-03-15')).toBe(0);
  });

  it('should return -1 for earlier date', () => {
    expect(compareDates('2026-03-01', '2026-03-15')).toBe(-1);
  });

  it('should return 1 for later date', () => {
    expect(compareDates('2026-03-15', '2026-03-01')).toBe(1);
  });
});

describe('getDaysDifference', () => {
  it('should calculate correct day difference', () => {
    expect(getDaysDifference('2026-03-01', '2026-03-15')).toBe(14);
  });

  it('should return 0 for same date', () => {
    expect(getDaysDifference('2026-03-15', '2026-03-15')).toBe(0);
  });

  it('should return negative for past dates', () => {
    expect(getDaysDifference('2026-03-15', '2026-03-01')).toBe(-14);
  });
});

describe('getDaysRemaining', () => {
  it('should return null for TBD', () => {
    expect(getDaysRemaining('TBD')).toBeNull();
  });

  it('should return null for unlimited', () => {
    expect(getDaysRemaining('unlimited')).toBeNull();
  });

  it('should return null for empty/invalid', () => {
    expect(getDaysRemaining('')).toBeNull();
    expect(getDaysRemaining(null)).toBeNull();
    expect(getDaysRemaining(undefined)).toBeNull();
  });

  it('should return a number for valid date', () => {
    const future = '2099-12-31';
    const result = getDaysRemaining(future);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});

describe('dayNameToNumber / numberToDayName', () => {
  it('should convert Korean day names to numbers', () => {
    expect(dayNameToNumber('일')).toBe(0);
    expect(dayNameToNumber('월')).toBe(1);
    expect(dayNameToNumber('토')).toBe(6);
  });

  it('should return -1 for invalid day name', () => {
    expect(dayNameToNumber('없음')).toBe(-1);
  });

  it('should convert numbers to Korean day names', () => {
    expect(numberToDayName(0)).toBe('일');
    expect(numberToDayName(6)).toBe('토');
  });

  it('should return empty string for invalid number', () => {
    expect(numberToDayName(7)).toBe('');
    expect(numberToDayName(-1)).toBe('');
  });
});

describe('getDayName', () => {
  it('should return correct day for known date', () => {
    // 2026-03-15 is a Sunday
    expect(getDayName('2026-03-15')).toBe('일');
  });

  it('should return empty for invalid input', () => {
    expect(getDayName('')).toBe('');
    expect(getDayName(null)).toBe('');
  });
});

describe('isSaturday / isSunday / isWeekend', () => {
  it('should detect Saturday', () => {
    // 2026-03-14 is Saturday
    expect(isSaturday('2026-03-14')).toBe(true);
    expect(isSunday('2026-03-14')).toBe(false);
    expect(isWeekend('2026-03-14')).toBe(true);
  });

  it('should detect Sunday', () => {
    expect(isSunday('2026-03-15')).toBe(true);
    expect(isSaturday('2026-03-15')).toBe(false);
    expect(isWeekend('2026-03-15')).toBe(true);
  });

  it('should detect weekday', () => {
    // 2026-03-16 is Monday
    expect(isWeekend('2026-03-16')).toBe(false);
  });
});

describe('toKSTDateString', () => {
  it('should return empty for null', () => {
    expect(toKSTDateString(null)).toBe('');
    expect(toKSTDateString(undefined)).toBe('');
  });

  it('should format date object', () => {
    const result = toKSTDateString(new Date('2026-03-15T00:00:00Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
