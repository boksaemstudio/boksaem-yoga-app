import Holidays from 'date-holidays';

const formatKSTDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

const getCountryCode = (lang: string): string => {
    switch (lang) {
        case 'ko': return 'KR';
        case 'en': return 'US';
        case 'ja': return 'JP';
        case 'zh': return 'CN';
        case 'es': return 'ES';
        case 'fr': return 'FR';
        case 'de': return 'DE';
        case 'ru': return 'RU';
        case 'vi': return 'VN';
        case 'th': return 'TH';
        case 'id': return 'ID';
        default: return 'KR';
    }
};

let hd = new Holidays('KR');
let currentLang = 'ko';

export const initHolidays = (lang: string) => {
    if (lang && lang !== currentLang) {
        currentLang = lang;
        hd.init(getCountryCode(lang));
    }
};

export const getHolidayName = (dateStr: string | null | undefined, lang?: string): string | null => {
    if (!dateStr) return null;
    
    const targetLang = lang || (() => {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem('language_storage');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return parsed?.state?.language || 'ko';
                }
            }
        } catch(e) {}
        return 'ko';
    })();
    
    initHolidays(targetLang);
    
    const date = new Date(dateStr);
    // isHoliday returns an array or false
    const holidays = hd.isHoliday(date);
    
    if (holidays && holidays.length > 0) {
        return holidays[0].name;
    }
    
    return null;
};

export const isHoliday = (dateStr: string, lang?: string): boolean => {
    return !!getHolidayName(dateStr, lang);
};

export default {};
