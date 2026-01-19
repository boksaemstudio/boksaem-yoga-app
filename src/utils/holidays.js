// 2026년 한국 공휴일 데이터
const holidays2026 = {
    '2026-01-01': 'holiday_new_year',
    '2026-02-16': 'holiday_lunar_new_year',
    '2026-02-17': 'holiday_lunar_new_year',
    '2026-02-18': 'holiday_lunar_new_year',
    '2026-03-01': 'holiday_samiljeol',
    '2026-04-05': 'holiday_arbor_day',
    '2026-05-05': 'holiday_childrens_day',
    '2026-05-19': 'holiday_buddha',
    '2026-06-06': 'holiday_memorial',
    '2026-08-15': 'holiday_liberation',
    '2026-09-21': 'holiday_chuseok',
    '2026-09-22': 'holiday_chuseok',
    '2026-09-23': 'holiday_chuseok',
    '2026-10-03': 'holiday_foundation',
    '2026-10-09': 'holiday_hangul',
    '2026-12-25': 'holiday_christmas'
};

// 2027년 공휴일 (미리 추가)
const holidays2027 = {
    '2027-01-01': 'holiday_new_year',
    '2027-02-16': 'holiday_lunar_new_year',
    '2027-02-17': 'holiday_lunar_new_year',
    '2027-02-18': 'holiday_lunar_new_year',
    '2027-03-01': 'holiday_samiljeol',
    '2027-05-05': 'holiday_childrens_day',
    '2027-05-08': 'holiday_buddha',
    '2027-06-06': 'holiday_memorial',
    '2027-08-15': 'holiday_liberation',
    '2027-09-14': 'holiday_chuseok',
    '2027-09-15': 'holiday_chuseok',
    '2027-09-16': 'holiday_chuseok',
    '2027-10-03': 'holiday_foundation',
    '2027-10-09': 'holiday_hangul',
    '2027-12-25': 'holiday_christmas'
};

const allHolidays = {
    ...holidays2026,
    ...holidays2027
};

export const getHolidayName = (dateStr) => {
    return allHolidays[dateStr] || null;
};

export const isHoliday = (dateStr) => {
    return dateStr in allHolidays;
};

export default allHolidays;
