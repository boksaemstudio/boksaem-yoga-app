/**
 * Date utility functions for Korean Standard Time (KST)
 * 한국 표준시 기준 날짜 처리 유틸리티
 */

interface FirestoreTimestamp {
    toDate?: () => Date;
    seconds?: number;
    nanoseconds?: number;
}

type DateInput = Date | string | FirestoreTimestamp | null | undefined;

/**
 * Robust Date Parsing - handles Firestore Timestamps, ISO strings, and YYYY-MM-DD strings
 */
export const safeParseDate = (timestamp: DateInput): Date => {
    if (!timestamp) return new Date(NaN);
    if (typeof timestamp === 'string') {
        if (timestamp.includes('T')) return new Date(timestamp);
        const parts = timestamp.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts.map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date(timestamp);
    }
    if (typeof timestamp === 'object') {
        if ('toDate' in timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
        if ('seconds' in timestamp && timestamp.seconds) return new Date(timestamp.seconds * 1000);
    }
    return new Date(timestamp as any);
};

/**
 * KST 기준으로 현재 날짜를 'YYYY-MM-DD' 형식으로 반환
 */
export const getTodayKST = (): string => {
    return toKSTDateString(new Date());
};

/**
 * Date 객체를 KST 기준 'YYYY-MM-DD' 형식으로 변환
 */
export const toKSTDateString = (date: DateInput): string => {
    if (!date) return '';
    let d: Date;
    if (typeof date === 'string') d = new Date(date);
    else if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') d = date.toDate();
    else if (typeof date === 'object' && 'seconds' in date && date.seconds) d = new Date(date.seconds * 1000);
    else d = new Date(date as any);
    
    if (isNaN(d.getTime())) return '';
    
    const kstDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().split('T')[0];
};

/**
 * ISO 타임스탬프를 KST 기준 날짜 문자열로 변환
 */
export const timestampToKSTDate = (timestamp: DateInput): string => {
    return toKSTDateString(timestamp);
};

/**
 * ISO 타임스탬프를 KST 기준 시간 문자열로 변환
 */
export const timestampToKSTTime = (timestamp: DateInput, includeSeconds: boolean = false): string => {
    return toKSTTimeString(timestamp, includeSeconds);
};

/**
 * Date 객체를 KST 기준 'HH:MM' 또는 'HH:MM:SS' 형식으로 변환
 */
export const toKSTTimeString = (date: DateInput, includeSeconds: boolean = false): string => {
    if (!date) return '';
    const d = safeParseDate(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' }),
        hour12: false
    });
};

/**
 * 두 날짜 문자열을 비교
 */
export const compareDates = (date1: string, date2: string): number => {
    if (date1 === date2) return 0;
    return date1 < date2 ? -1 : 1;
};

/**
 * 날짜 문자열에 일수를 더하거나 뺌
 */
export const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return toKSTDateString(date);
};

/**
 * 두 날짜 사이의 일수 차이 계산
 */
export const getDaysDifference = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 오늘부터 특정 날짜까지의 남은 일수 계산
 */
export const getDaysRemaining = (endDate: string | null | undefined): number | null => {
    if (!endDate || endDate === 'TBD' || endDate === 'unlimited') return null;

    const parts = String(endDate).split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return null;
    const end = new Date(y, m - 1, d);
    if (isNaN(end.getTime())) return null;

    const todayStr = getTodayKST();
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const today = new Date(ty, tm - 1, td);

    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

type KoreanDayName = '일' | '월' | '화' | '수' | '목' | '금' | '토';

const DAY_NAMES: KoreanDayName[] = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MAP: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };

/**
 * 요일 이름을 숫자로 변환
 */
export const dayNameToNumber = (dayName: string): number => {
    return DAY_MAP[dayName] ?? -1;
};

/**
 * 숫자를 요일 이름으로 변환
 */
export const numberToDayName = (dayNumber: number): string => {
    return DAY_NAMES[dayNumber] ?? '';
};

/**
 * 날짜 문자열에서 요일 이름 가져오기
 */
export const getDayName = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return numberToDayName(date.getDay());
};

export const isSaturday = (dateStr: string): boolean => getDayName(dateStr) === '토';
export const isSunday = (dateStr: string): boolean => getDayName(dateStr) === '일';
export const isWeekend = (dateStr: string): boolean => {
    const day = getDayName(dateStr);
    return day === '토' || day === '일';
};

/**
 * KST 기준 현재 시(Hour)를 반환 (0-23)
 */
export const getKSTHour = (): number => {
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.getUTCHours();
};

/**
 * KST 기준 현재 분(Minute)을 반환 (0-59)
 */
export const getKSTMinutes = (): number => {
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.getUTCMinutes();
};

/**
 * KST 기준 현재 총 분(Total Minutes)을 반환 (Hour * 60 + Minute)
 */
export const getKSTTotalMinutes = (): number => {
    return getKSTHour() * 60 + getKSTMinutes();
};
