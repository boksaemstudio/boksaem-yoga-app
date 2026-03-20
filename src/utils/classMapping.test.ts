import { describe, it, expect } from 'vitest';
import { classNameMap, getTranslatedClass } from './classMapping';

describe('classNameMap', () => {
  it('should map Korean class names to English keys', () => {
    expect(classNameMap['하타']).toBe('hatha');
    expect(classNameMap['빈야사']).toBe('vinyasa');
    expect(classNameMap['플라잉']).toBe('flying');
    expect(classNameMap['자율수련']).toBe('selfPractice');
    expect(classNameMap['자율수업']).toBe('selfPractice');
  });

  it('should have correct type (Record<string, string>)', () => {
    Object.entries(classNameMap).forEach(([key, value]) => {
      expect(typeof key).toBe('string');
      expect(typeof value).toBe('string');
    });
  });

  it('should return undefined for unmapped names', () => {
    expect(classNameMap['없는수업']).toBeUndefined();
  });
});

describe('getTranslatedClass', () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'selfPractice': 'Self Practice',
      'class_hatha': 'Hatha Yoga',
      'class_vinyasa': 'Vinyasa Flow',
    };
    return translations[key] || key;
  };

  it('should translate 자율수련 using selfPractice key', () => {
    expect(getTranslatedClass('자율수련', mockT)).toBe('Self Practice');
    expect(getTranslatedClass('자율수업', mockT)).toBe('Self Practice');
  });

  it('should translate mapped class names', () => {
    expect(getTranslatedClass('하타', mockT)).toBe('Hatha Yoga');
    expect(getTranslatedClass('빈야사', mockT)).toBe('Vinyasa Flow');
  });

  it('should return original title for unmapped/untranslated names', () => {
    expect(getTranslatedClass('커스텀 수업', mockT)).toBe('커스텀 수업');
  });

  it('should return empty string for empty input', () => {
    expect(getTranslatedClass('', mockT)).toBe('');
  });
});
