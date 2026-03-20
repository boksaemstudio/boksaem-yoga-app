import { describe, it, expect } from 'vitest';
import { getHolidayName, isHoliday } from './holidays';

describe('getHolidayName', () => {
  it('should return holiday name for New Year', () => {
    const name = getHolidayName('2026-01-01');
    expect(name).not.toBeNull();
    expect(name).toContain('holiday');
  });

  it('should return holiday for Samiljeol (March 1st)', () => {
    const name = getHolidayName('2026-03-01');
    expect(name).toBe('holiday_samiljeol');
  });

  it('should return holiday for Children\'s Day', () => {
    const name = getHolidayName('2026-05-05');
    expect(name).toBe('holiday_childrens_day');
  });

  it('should return holiday for Memorial Day', () => {
    const name = getHolidayName('2026-06-06');
    expect(name).toBe('holiday_memorial');
  });

  it('should return holiday for Liberation Day', () => {
    const name = getHolidayName('2026-08-15');
    expect(name).toBe('holiday_liberation');
  });

  it('should return holiday for Foundation Day', () => {
    const name = getHolidayName('2026-10-03');
    expect(name).toBe('holiday_foundation');
  });

  it('should return holiday for Hangul Day', () => {
    const name = getHolidayName('2026-10-09');
    expect(name).toBe('holiday_hangul');
  });

  it('should return holiday for Christmas', () => {
    const name = getHolidayName('2026-12-25');
    expect(name).toBe('holiday_christmas');
  });

  it('should return null for non-holidays', () => {
    expect(getHolidayName('2026-03-15')).toBeNull();
  });

  it('should return null for empty input', () => {
    expect(getHolidayName('')).toBeNull();
    expect(getHolidayName(null)).toBeNull();
  });

  it('should handle future years dynamically', () => {
    const name = getHolidayName('2030-01-01');
    expect(name).not.toBeNull();
  });
});

describe('isHoliday', () => {
  it('should return true for known holidays', () => {
    expect(isHoliday('2026-01-01')).toBe(true);
    expect(isHoliday('2026-03-01')).toBe(true);
    expect(isHoliday('2026-12-25')).toBe(true);
  });

  it('should return false for regular days', () => {
    expect(isHoliday('2026-03-15')).toBe(false);
    expect(isHoliday('2026-07-07')).toBe(false);
  });
});
