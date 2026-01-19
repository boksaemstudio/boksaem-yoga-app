import React, { createContext, useState, useEffect, useContext } from 'react';
import { translations } from '../utils/translations';

// Create Context
const LanguageContext = createContext();

/**
 * Provider Component
 * @param {Object} props
 * @returns {JSX.Element}
 */
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        try {
            return localStorage.getItem('app_language') || 'ko';
        } catch (e) {
            console.warn('LocalStorage access denied in LanguageContext:', e);
            return 'ko';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('app_language', language);
        } catch (e) {
            console.warn('LocalStorage write denied in LanguageContext:', e);
        }
    }, [language]);

    const t = (key, params = {}) => {
        const text = translations[language]?.[key] || translations['ko']?.[key] || key;

        // Parameter replacement
        if (Object.keys(params).length > 0) {
            let result = text;
            for (const [pKey, pVal] of Object.entries(params)) {
                result = result.replace(`{${pKey}}`, pVal);
            }
            return result;
        }

        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom Hook to use the context
/* eslint-disable-next-line react-refresh/only-export-components */
export function useLanguageContext() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguageContext must be used within a LanguageProvider');
    }
    return context;
}
