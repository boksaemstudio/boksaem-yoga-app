/**
 * Date utility functions for Korean Standard Time (KST)
 * 한국 표준시 기준 날짜 처리 유틸리티
 */

/**
 * KST 기준으로 현재 날짜를 'YYYY-MM-DD' 형식으로 반환
 */
export const getTodayKST = () => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

/**
 * Date 객체를 KST 기준 'YYYY-MM-DD' 형식으로 변환
 * @param {Date|string} date - Date 객체 또는 날짜 문자열
 * @returns {string} 'YYYY-MM-DD' 형식의 날짜 문자열
 */
export const toKSTDateString = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

/**
 * ISO 타임스탬프를 KST 기준 날짜 문자열로 변환
 * @param {string} timestamp - ISO 8601 타임스탬프
 * @returns {string} 'YYYY-MM-DD' 형식의 날짜 문자열
 */
export const timestampToKSTDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

/**
 * ISO 타임스탬프를 KST 기준 시간 문자열로 변환
 * @param {string} timestamp - ISO 8601 타임스탬프
 * @param {boolean} includeSeconds - 초 포함 여부 (기본값: false)
 * @returns {string} 'HH:MM' 또는 'HH:MM:SS' 형식의 시간 문자열
 */
export const timestampToKSTTime = (timestamp, includeSeconds = false) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' }),
        hour12: false
    });
};

/**
 * 두 날짜 문자열을 비교
 * @param {string} date1 - 'YYYY-MM-DD' 형식의 날짜
 * @param {string} date2 - 'YYYY-MM-DD' 형식의 날짜
 * @returns {number} date1이 더 이전이면 -1, 같으면 0, 더 이후면 1
 */
export const compareDates = (date1, date2) => {
    if (date1 === date2) return 0;
    return date1 < date2 ? -1 : 1;
};

/**
 * 날짜 문자열에 일수를 더하거나 뺌
 * @param {string} dateStr - 'YYYY-MM-DD' 형식의 날짜
 * @param {number} days - 더할 일수 (음수면 빼기)
 * @returns {string} 'YYYY-MM-DD' 형식의 결과 날짜
 */
export const addDays = (dateStr, days) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

/**
 * 두 날짜 사이의 일수 차이 계산
 * @param {string} startDate - 'YYYY-MM-DD' 형식의 시작 날짜
 * @param {string} endDate - 'YYYY-MM-DD' 형식의 종료 날짜
 * @returns {number} 일수 차이
 */
export const getDaysDifference = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 오늘부터 특정 날짜까지의 남은 일수 계산
 * @param {string} endDate - 'YYYY-MM-DD' 형식의 종료 날짜
 * @returns {number|null} 남은 일수 (음수면 만료됨), 또는 null/0 for invalid cases
 */
export const getDaysRemaining = (endDate) => {
    // Handle special cases
    if (!endDate || endDate === 'TBD' || endDate === 'unlimited') return null;

    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 요일 이름을 숫자로 변환
 * @param {string} dayName - '일', '월', '화', '수', '목', '금', '토'
 * @returns {number} 0(일요일) ~ 6(토요일)
 */
export const dayNameToNumber = (dayName) => {
    const days = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    return days[dayName] ?? -1;
};

/**
 * 숫자를 요일 이름으로 변환
 * @param {number} dayNumber - 0(일요일) ~ 6(토요일)
 * @returns {string} '일', '월', '화', '수', '목', '금', '토'
 */
export const numberToDayName = (dayNumber) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[dayNumber] ?? '';
};

/**
 * 날짜 문자열에서 요일 이름 가져오기
 * @param {string} dateStr - 'YYYY-MM-DD' 형식의 날짜
 * @returns {string} '일', '월', '화', '수', '목', '금', '토'
 */
export const getDayName = (dateStr) => {
    if (!dateStr) return '';
    // 문자열을 직접 파싱하여 로컬 Date 생성 (타임존 문제 방지)
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return numberToDayName(date.getDay());
};

/**
 * 특정 날짜가 토요일인지 확인
 * @param {string} dateStr - 'YYYY-MM-DD' 형식의 날짜
 * @returns {boolean}
 */
export const isSaturday = (dateStr) => {
    return getDayName(dateStr) === '토';
};

/**
 * 특정 날짜가 일요일인지 확인
 * @param {string} dateStr - 'YYYY-MM-DD' 형식의 날짜
 * @returns {boolean}
 */
export const isSunday = (dateStr) => {
    return getDayName(dateStr) === '일';
};

/**
 * 특정 날짜가 주말인지 확인
 * @param {string} dateStr - 'YYYY-MM-DD' 형식의 날짜
 * @returns {boolean}
 */
export const isWeekend = (dateStr) => {
    const day = getDayName(dateStr);
    return day === '토' || day === '일';
};
