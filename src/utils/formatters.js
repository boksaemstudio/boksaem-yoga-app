/**
 * Global formatters for internationalization (i18n)
 */

const currencyMap = {
    'ko': { currency: 'KRW', locale: 'ko-KR', style: 'currency' },
    'en': { currency: 'USD', locale: 'en-US', style: 'currency' },
    'ja': { currency: 'JPY', locale: 'ja-JP', style: 'currency' },
    'zh': { currency: 'CNY', locale: 'zh-CN', style: 'currency' },
    'fr': { currency: 'EUR', locale: 'fr-FR', style: 'currency' },
    'es': { currency: 'EUR', locale: 'es-ES', style: 'currency' },
    'de': { currency: 'EUR', locale: 'de-DE', style: 'currency' },
    'pt': { currency: 'EUR', locale: 'pt-PT', style: 'currency' },
    'vi': { currency: 'VND', locale: 'vi-VN', style: 'currency' },
    'th': { currency: 'THB', locale: 'th-TH', style: 'currency' },
    'ru': { currency: 'RUB', locale: 'ru-RU', style: 'currency' },
};

/**
 * Format a number as local currency based on language code
 * @param {number|string} amount 
 * @param {string} langCode 
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, langCode = 'ko') => {
    if (amount === undefined || amount === null) return '';
    const num = Number(amount);
    if (isNaN(num)) return amount;

    const config = currencyMap[langCode] || currencyMap['en'];
    
    // Some Asian currencies don't use decimals, USD/EUR do.
    const fractionDigits = ['KRW', 'JPY', 'VND'].includes(config.currency) ? 0 : 2;

    try {
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.currency,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(num);
    } catch (e) {
        // Fallback if Intl fails
        return num.toLocaleString() + (langCode === 'ko' ? '원' : '');
    }
};

/**
 * Format a date string or timestamp into a local date format
 * @param {string|number|Date} dateVal 
 * @param {string} langCode 
 * @param {boolean} includeTime 
 * @returns {string} Formatted date
 */
export const formatDate = (dateVal, langCode = 'ko', includeTime = false) => {
    if (!dateVal) return '';
    try {
        const date = new Date(dateVal);
        if (isNaN(date.getTime())) return String(dateVal);

        const locale = currencyMap[langCode]?.locale || 'en-US';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }

        return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (e) {
        return String(dateVal);
    }
};

/**
 * Format phone number according to local standards
 * @param {string} phone 
 * @param {string} langCode 
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone, langCode = 'ko') => {
    if (!phone) return '';
    // Strip non-digits
    const digits = phone.replace(/\D/g, '');
    if (!digits) return phone;

    switch (langCode) {
        case 'en':
            // +1 (XXX) XXX-XXXX
            if (digits.length === 10) return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
            if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
            return phone; // Fallback
        case 'ja':
            // 090-XXXX-XXXX
            if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
            return phone;
        case 'ko':
            // 010-XXXX-XXXX
            if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
            if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
            return phone;
        case 'fr':
        case 'es':
        case 'de':
            // e.g. 06 12 34 56 78 (Europe)
            if (digits.length >= 9) {
                return digits.match(/.{1,2}/g)?.join(' ') || phone;
            }
            return phone;
        case 'zh':
            // 13X XXXX XXXX
            if (digits.length === 11) return `${digits.slice(0,3)} ${digits.slice(3,7)} ${digits.slice(7)}`;
            return phone;
        default:
            return digits; // Unformatted digits for unknown formats
    }
};

/**
 * Determine if the language is Right-To-Left (RTL)
 * @param {string} langCode 
 * @returns {boolean}
 */
export const isRTL = (langCode) => {
    const rtlLangs = ['ar', 'he', 'fa', 'ur'];
    return rtlLangs.includes(langCode);
};

