import { useLanguageStore } from '../stores/useLanguageStore';
import { formatCurrency, formatDate, formatPhoneNumber, isRTL } from '../utils/formatters';

export const useFormatters = () => {
    const language = useLanguageStore(s => s.language);
    return {
        formatCurrency: (amount) => formatCurrency(amount, language),
        formatDate: (dateVal, includeTime) => formatDate(dateVal, language, includeTime),
        formatPhoneNumber: (phone) => formatPhoneNumber(phone, language),
        isRTL: isRTL(language)
    };
};
