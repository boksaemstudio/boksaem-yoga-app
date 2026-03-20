import { describe, it, expect, beforeEach } from 'vitest';
import { useLanguageStore } from './useLanguageStore';

describe('useLanguageStore', () => {
    beforeEach(() => {
        useLanguageStore.setState({ language: 'ko' });
    });

    it('초기 언어가 ko이다', () => {
        expect(useLanguageStore.getState().language).toBe('ko');
    });

    it('setLanguage로 언어 변경', () => {
        useLanguageStore.getState().setLanguage('en');
        expect(useLanguageStore.getState().language).toBe('en');
    });

    it('t 함수가 번역 키를 반환한다', () => {
        const t = useLanguageStore.getState().t;
        expect(typeof t).toBe('function');
        // 존재하지 않는 키는 키 자체를 반환
        expect(t('nonexistent_key')).toBe('nonexistent_key');
    });

    it('t 함수가 파라미터를 치환한다', () => {
        const t = useLanguageStore.getState().t;
        // {n}을 치환
        const result = t('nonexistent_{n}', { n: '5' });
        expect(result).toBe('nonexistent_5');
    });
});
