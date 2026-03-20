import { useLanguageStore } from '../stores/useLanguageStore';

/**
 * useLanguage — Zustand 스토어 래퍼
 * 
 * 기존 useLanguageContext()와 동일한 인터페이스 유지.
 * 내부적으로 Zustand useLanguageStore를 사용.
 */
export const useLanguage = () => {
    return useLanguageStore();
};
