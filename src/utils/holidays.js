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

// 2024년 공휴일
const holidays2024 = {
    '2024-01-01': 'holiday_new_year',
    '2024-02-09': 'holiday_lunar_new_year',
    '2024-02-10': 'holiday_lunar_new_year',
    '2024-02-11': 'holiday_lunar_new_year',
    '2024-02-12': 'holiday_lunar_new_year', // 대체공휴일
    '2024-03-01': 'holiday_samiljeol',
    '2024-04-10': 'holiday_election', // 국회의원 선거일
    '2024-05-05': 'holiday_childrens_day',
    '2024-05-06': 'holiday_childrens_day', // 대체공휴일
    '2024-05-15': 'holiday_buddha',
    '2024-06-06': 'holiday_memorial',
    '2024-08-15': 'holiday_liberation',
    '2024-09-16': 'holiday_chuseok',
    '2024-09-17': 'holiday_chuseok',
    '2024-09-18': 'holiday_chuseok',
    '2024-10-03': 'holiday_foundation',
    '2024-10-09': 'holiday_hangul',
    '2024-12-25': 'holiday_christmas'
};

// 2025년 공휴일
const holidays2025 = {
    '2025-01-01': 'holiday_new_year',
    '2025-01-28': 'holiday_lunar_new_year',
    '2025-01-29': 'holiday_lunar_new_year',
    '2025-01-30': 'holiday_lunar_new_year',
    '2025-03-01': 'holiday_samiljeol',
    '2025-03-03': 'holiday_samiljeol', // 대체공휴일?? (토요일이라 3일 아님? 3.1절은 대체공휴일 대상 아님 - 개정됨: 3.1절, 광복절, 개천절, 한글날 확대적용됨 2021년) -> 2025.3.1(토) -> 3.3(월) 대체공휴일 예상
    '2025-05-05': 'holiday_childrens_day',
    '2025-05-06': 'holiday_buddha', // 5.5(월) 어린이날, 5.6(화) 부처님오신날
    '2025-06-06': 'holiday_memorial',
    '2025-08-15': 'holiday_liberation',
    '2025-10-03': 'holiday_foundation',
    '2025-10-05': 'holiday_chuseok',
    '2025-10-06': 'holiday_chuseok',
    '2025-10-07': 'holiday_chuseok',
    '2025-10-08': 'holiday_chuseok', // 대체공휴일 등 (10.3~10.9 연휴 예상) 정확한 날짜는 추석 2025: 10.6(월)이 추석 당일. 10.5~10.7 연휴. 
    // 정정: 2025 추석은 10.6(월). 10.5(일)~10.7(화). 10.3(금) 개천절. 10.4(토). 10.5(일). 10.6(월). 10.7(화). 10.8(수) 대체공휴일(10.5 일욜 겹침). 10.9(목) 한글날. 
    // 따라서 10.3~10.9 황금연휴.
    '2025-10-09': 'holiday_hangul',
    '2025-12-25': 'holiday_christmas'
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
    ...holidays2024,
    ...holidays2025,
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
