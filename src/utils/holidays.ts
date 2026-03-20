import { getHolidays } from 'korean-holidays';

type HolidayKey = string;

const formatKSTDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

const getHolidayKey = (nameKo: string, isSubstitute: boolean): HolidayKey => {
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
    if (nameKo.includes('선거')) return 'holiday_election';
    return 'holiday_other';
};

const holidayCache: Record<number, Record<string, HolidayKey>> = {};

const generateYearHolidays = (year: number): Record<string, HolidayKey> => {
    if (holidayCache[year]) return holidayCache[year];
    
    const yearHolidays: Record<string, HolidayKey> = {};
    try {
        const holidays = getHolidays(year);
        holidays.forEach((h: any) => {
            const dateStr = formatKSTDate(h.date);
            yearHolidays[dateStr] = getHolidayKey(h.nameKo, h.isSubstitute);
        });
    } catch (e) {
        console.error(`Failed to load holidays for ${year}`, e);
    }
    
    holidayCache[year] = yearHolidays;
    return yearHolidays;
};

[2024, 2025, 2026, 2027, 2028, 2029].forEach(generateYearHolidays);

const allHolidays: Record<string, HolidayKey> = {};
Object.values(holidayCache).forEach(yearDict => {
    Object.assign(allHolidays, yearDict);
});

export const getHolidayName = (dateStr: string | null | undefined): HolidayKey | null => {
    if (!dateStr) return null;
    const year = parseInt(dateStr.split('-')[0], 10);
    
    if (!holidayCache[year]) {
        const newHolidays = generateYearHolidays(year);
        Object.assign(allHolidays, newHolidays);
    }
    
    return allHolidays[dateStr] || null;
};

export const isHoliday = (dateStr: string): boolean => {
    return !!getHolidayName(dateStr);
};

export default allHolidays;
