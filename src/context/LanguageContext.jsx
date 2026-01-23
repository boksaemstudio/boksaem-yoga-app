import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Safe initialization with try-catch
    const [language, setLanguage] = useState(() => {
        try {
            const saved = localStorage.getItem('appLanguage');
            return saved || 'ko';
        } catch {
            console.warn("LocalStorage unavailable, defaulting to 'ko'");
            return 'ko';
        }
    });

    // Translation function with fallbacks
    const t = (key, params = {}) => {
        try {
            let text = key;
            if (translations[language] && translations[language][key]) {
                text = translations[language][key];
            } else if (translations['ko'] && translations['ko'][key]) {
                text = translations['ko'][key];
            }

            // Replace parameters (e.g., {n})
            Object.keys(params).forEach(param => {
                const regex = new RegExp(`{${param}}`, 'g');
                text = text.replace(regex, params[param]);
            });

            return text;
        } catch (e) {
            console.error("Translation error:", e);
            return key;
        }
    };

    // Save language preference
    useEffect(() => {
        try {
            localStorage.setItem('appLanguage', language);
        } catch (e) {
            console.warn("Failed to save language preference:", e);
        }
    }, [language]);

    const value = {
        language,
        setLanguage,
        t
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguageContext() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguageContext must be used within a LanguageProvider');
    }
    return context;
}
