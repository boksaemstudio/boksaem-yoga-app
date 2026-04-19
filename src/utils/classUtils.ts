interface AttendanceLog {
    timestamp?: string | any;
    classTime?: string;
    className?: string;
    instructor?: string;
    branchId?: string;
    [key: string]: any;
}

interface ClassInfo {
    startTime: string;
    className: string;
    instructor: string;
}

/**
 * 출석 로그에서 수업 시간 추출
 * SaaS: 외부 template 의존 제거 — 로그 자체 데이터만 사용
 */
export const guessClassTime = (log: AttendanceLog): string | null => {
    // 1. classTime이 이미 있으면 그대로 사용
    if (log.classTime && log.classTime !== '00:00') return log.classTime;
    if (!log.timestamp) return null;
    
    // 2. 없으면 timestamp에서 시각 추출
    const date = new Date(log.timestamp);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

/**
 * 출석 로그에서 수업 정보 추출
 * SaaS: 외부 template 의존 제거 — 로그 자체 데이터만 사용
 * (현대 출석 로그에는 className, instructor가 이미 저장됨)
 */
export const guessClassInfo = (log: AttendanceLog): ClassInfo | null => {
    if (!log.timestamp) return null;
    
    const time = guessClassTime(log);
    const className = (log.className && log.className !== 'General' && log.className !== '일반') ? log.className : 'General';
    const instructor = (log.instructor && log.instructor !== 'Instructor') ? log.instructor : 'Unassigned';

    return { 
        startTime: time || '00:00', 
        className, 
        instructor 
    };
};
