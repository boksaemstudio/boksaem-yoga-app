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
            // [ROOT FIX] 1. URL ?lang= parameter 
            const urlLang = new URLSearchParams(window.location.search).get('lang');
            if (urlLang && translations[urlLang]) {
                localStorage.setItem('appLanguage', urlLang);
                return urlLang;
            }
            // 2. localStorage
            const stored = localStorage.getItem('appLanguage');
            if (stored && translations[stored]) {
                return stored;
            }

            // [AUTO-DETECT] 3. navigator.language (접속 국가 자동 감지)
            if (navigator && navigator.language) {
                const browserLang = navigator.language.split('-')[0].toLowerCase();
                if (translations[browserLang]) {
                    localStorage.setItem('appLanguage', browserLang);
                    return browserLang;
                }
            }
            return 'ko'; // Fallback
        }
        catch { return 'ko'; }
    })(),

    setLanguage: (lang) => {
        set({ language: lang });
        try { localStorage.setItem('appLanguage', lang); }
        catch { /* storage full or unavailable */ }
    },

    t: (key, params = {}) => {
        if (!key) return undefined;
        const { language } = get();

        // 1. 현재 언어 사전에서 찾기
        let text = translations[language]?.[key];

        // 2. [핵심] 한국어 사용자 + 한국어 키인데 ko 사전에 없으면
        //    → en fallback으로 가면 영어가 나오므로, 키 자체를 바로 반환
        if (text === undefined && language === 'ko' && /[\uAC00-\uD7AF]/.test(key) && !key.includes('_')) {
            text = key;
        }

        // 3. 비한국어 사용자: en → ko fallback. 단, 한국어 사용자(ko)는 en으로 폴백하지 않음!
        if (text === undefined && language !== 'en' && language !== 'ko') {
            text = translations['en']?.[key];
        }
        if (text === undefined && language !== 'ko') {
            text = translations['ko']?.[key];
        }

        // 4. 어떤 사전에도 없는 경우:
        //    - 한국어 자연어(언더스코어 없음) → 키 자체가 번역
        //    - 프로그래밍 키 → undefined 반환 (|| fallback 작동)
        if (text === undefined) {
            const isKoreanSentence = /[\uAC00-\uD7AF]/.test(key) && !key.includes('_');
            if (isKoreanSentence && language === 'ko') {
                text = key;
            } else {
                return undefined;
            }
        }

        // 4. 파라미터 치환 (예: {name} → 실제 이름)
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(param => {
                text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
            });
        }

        return text;
    },
}));
