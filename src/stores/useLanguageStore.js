import { create } from 'zustand';
import { translations } from '../utils/translations';

/**
 * @typedef {Object} LanguageState
 * @property {string} language - 현재 언어 코드 ('ko' | 'en')
 * @property {(lang: string) => void} setLanguage - 언어 변경 + localStorage 저장
 * @property {(key: string, params?: Record<string, string>) => string} t - 번역 함수
 */

/**
 * useLanguageStore — Zustand 다국어 스토어
 * Provider 불필요. 어디서든 import하여 사용 가능.
 * 
 * @example
 * const { t, setLanguage } = useLanguageStore();
 * const t = useLanguageStore(s => s.t); // selector 최적화
 * 
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<LanguageState>>}
 */
export const useLanguageStore = create((set, get) => ({
    language: (() => {
        try {
            // [ROOT FIX] URL ?lang= 파라미터가 최우선 → localStorage → 기본값 'ko'
            const urlLang = new URLSearchParams(window.location.search).get('lang');
            if (urlLang && translations[urlLang]) {
                localStorage.setItem('appLanguage', urlLang);
                return urlLang;
            }
            return localStorage.getItem('appLanguage') || 'ko';
        }
        catch { return 'ko'; }
    })(),

    setLanguage: (lang) => {
        set({ language: lang });
        try { localStorage.setItem('appLanguage', lang); }
        catch { /* storage full or unavailable */ }
    },

    t: (key, params = {}) => {
        const { language } = get();
        let text = translations[language]?.[key] || translations['en']?.[key] || translations['ko']?.[key] || key;

        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });

        return text;
    },
}));
