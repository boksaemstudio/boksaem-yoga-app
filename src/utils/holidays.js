import { getHolidays } from 'korean-holidays';

// Helper to format date to YYYY-MM-DD in KST
const formatKSTDate = (date) => {
    return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

// Map korean-holidays output to our internal naming convention
const getHolidayKey = (nameKo, isSubstitute) => {
    // If it's a substitute holiday (e.g. '대체공휴일 (3·1절)'), return the literal Korean name
    // The translation function will gracefully fall back to this string
    if (isSubstitute) return nameKo;

    if (nameKo.includes('신정')) return 'holiday_new_year';
    if (nameKo.includes('설날')) return 'holiday_lunar_new_year';
    if (nameKo.includes('3·1절')) return 'holiday_samiljeol';
    if (nameKo.includes('어린이날')) return 'holiday_childrens_day';
    if (nameKo.includes('석가탄신일') || nameKo.includes('부처님오신날')) return 'holiday_buddha';
    if (nameKo.includes('현충일')) return 'holiday_memorial';
    if (nameKo.includes('광복절')) return 'holiday_liberation';
    if (nameKo.includes('추석')) return 'holiday_chuseok';
    if (nameKo.includes('개천절')) return 'holiday_foundation';
    if (nameKo.includes('한글날')) return 'holiday_hangul';
    if (nameKo.includes('성탄절') || nameKo.includes('크리스마스')) return 'holiday_christmas';
    if (nameKo.includes('선거')) return 'holiday_election'; // For election days if any
    return 'holiday_other';
};

// Generate holidays for current year natively and dynamically cache them
const holidayCache = {};

const generateYearHolidays = (year) => {
    if (holidayCache[year]) return holidayCache[year];
    
    const yearHolidays = {};
    try {
        const holidays = getHolidays(year);
        holidays.forEach(h => {
            const dateStr = formatKSTDate(h.date);
            yearHolidays[dateStr] = getHolidayKey(h.nameKo, h.isSubstitute);
        });
    } catch (e) {
        console.error(`Failed to load holidays for ${year}`, e);
    }
    
    holidayCache[year] = yearHolidays;
    return yearHolidays;
};

// Pre-fill cache for surrounding years to ensure components have access immediately
[2024, 2025, 2026, 2027, 2028, 2029].forEach(generateYearHolidays);

// Create a flat dictionary of known holidays from the cache for backward compatibility
const allHolidays = {};
Object.values(holidayCache).forEach(yearDict => {
    Object.assign(allHolidays, yearDict);
});

export const getHolidayName = (dateStr) => {
    if (!dateStr) return null;
    const year = parseInt(dateStr.split('-')[0], 10);
    
    // Generate on demand if not in cache (e.g., future years)
    if (!holidayCache[year]) {
        const newHolidays = generateYearHolidays(year);
        Object.assign(allHolidays, newHolidays);
    }
    
    return allHolidays[dateStr] || null;
};

export const isHoliday = (dateStr) => {
    return !!getHolidayName(dateStr);
};

export default allHolidays;
