import { describe, it, expect } from 'vitest';
import { getLuminance, getContrastText, getTagColor, hslToHex } from './colors';

describe('getLuminance', () => {
  it('should return 0 for black', () => {
    expect(getLuminance('#000000')).toBeCloseTo(0, 3);
  });

  it('should return 1 for white', () => {
    expect(getLuminance('#ffffff')).toBeCloseTo(1, 3);
  });

  it('should handle 3-character hex', () => {
    const result = getLuminance('#fff');
    expect(result).toBeCloseTo(1, 3);
  });

  it('should handle hex without #', () => {
    const result = getLuminance('000000');
    expect(result).toBeCloseTo(0, 3);
  });
});

describe('getContrastText', () => {
  it('should return black for white background', () => {
    expect(getContrastText('#ffffff')).toBe('#000000');
  });

  it('should return white for black background', () => {
    expect(getContrastText('#000000')).toBe('#ffffff');
  });

  it('should return white for dark colors', () => {
    expect(getContrastText('#1a1a1c')).toBe('#ffffff');
  });

  it('should return white for empty input', () => {
    expect(getContrastText('')).toBe('#ffffff');
  });
});

describe('getTagColor', () => {
  it('should return blue for hatha classes', () => {
    const tag = getTagColor('하타 요가');
    expect(tag.text).toBe('#60A5FA');
    expect(tag.bg).toContain('59, 130, 246');
  });

  it('should return blue for English hatha', () => {
    const tag = getTagColor('Hatha Flow');
    expect(tag.text).toBe('#60A5FA');
  });

  it('should return green for vinyasa classes', () => {
    const tag = getTagColor('빈야사');
    expect(tag.text).toBe('#34D399');
  });

  it('should return gold for special classes', () => {
    const tag = getTagColor('특별 수업');
    expect(tag.text).toBe('var(--primary-gold)');
  });

  it('should return default grey for unknown classes', () => {
    const tag = getTagColor('알수없는 수업');
    expect(tag.text).toBe('#9CA3AF');
  });

  it('should handle empty title', () => {
    const tag = getTagColor('');
    expect(tag.text).toBe('#9CA3AF');
  });
});

describe('hslToHex', () => {
  it('should convert red (0, 100, 50) correctly', () => {
    const hex = hslToHex(0, 100, 50);
    expect(hex.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('should convert black (0, 0, 0)', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });
});
