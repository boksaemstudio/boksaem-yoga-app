interface AttendanceLog {
    timestamp?: string | any;
    classTime?: string;
    className?: string;
    instructor?: string;
    branchId?: string;
    [key: string]: any;
}

interface ScheduleEntry {
    days: string[];
    startTime: string;
    className?: string;
    instructor?: string;
    [key: string]: any;
}

interface ClassInfo {
    startTime: string;
    className: string;
    instructor: string;
}

type ScheduleTemplate = Record<string, ScheduleEntry[]>;

/**
 * 출석 로그의 시간 정보와 스케줄을 비교하여 수업 시간대 추측
 */
export const guessClassTime = (log: AttendanceLog, scheduleTemplate: ScheduleTemplate = {}): string | null => {
    if (log.classTime && log.classTime !== '00:00') return log.classTime;
    if (!log.timestamp) return null;
    
    const date = new Date(log.timestamp);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const actualTime = `${h}:${m}`;

    if (log.className === '자율수련' || log.className === '자율수업') {
        return actualTime;
    }

    const checkInMinutes = date.getHours() * 60 + date.getMinutes();
    const dayOfWeeks = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayOfWeeks[date.getDay()];
    
    const branchSchedule = scheduleTemplate[log.branchId || ''] || [];
    const daySchedule = branchSchedule.filter(s => s.days.includes(dayOfWeek));

    if (daySchedule.length === 0) {
        return actualTime;
    }

    const norm = (str: string | undefined): string => (str || '').replace(/\s+/g, '');
    const logNameNorm = norm(log.className);
    const logInstNorm = norm(log.instructor);

    let candidates = daySchedule.filter(s => {
        const schNameNorm = norm(s.className);
        const schInstNorm = norm(s.instructor);
        const nameMatch = logNameNorm && schNameNorm && (logNameNorm.includes(schNameNorm) || schNameNorm.includes(logNameNorm));
        const instructorMatch = logInstNorm && schInstNorm && (logInstNorm === schInstNorm || logInstNorm.includes(schInstNorm));
        return nameMatch || instructorMatch;
    });

    if (candidates.length === 0) {
        return actualTime;
    }

    let bestMatch: ScheduleEntry | null = null;
    let bestDiff = Infinity;

    for (const match of candidates) {
        const [schH, schMin] = match.startTime.split(':').map(Number);
        const startMin = schH * 60 + schMin;
        const absDiff = Math.abs(checkInMinutes - startMin);

        if (absDiff < bestDiff) {
            bestDiff = absDiff;
            bestMatch = match;
        }
    }

    if (bestMatch && bestDiff <= 120) {
         return bestMatch.startTime; 
    }
    
    return actualTime;
};

/**
 * 스케줄 객체 자체를 반환 (Canonical Name 사용을 위해)
 */
export const guessClassInfo = (log: AttendanceLog, scheduleTemplate: ScheduleTemplate = {}): ClassInfo | null => {
    if (!log.timestamp) return null;
    
    const time = guessClassTime(log, scheduleTemplate);
    
    if (log.className === '자율수련' || log.className === '자율수업') {
        return {
            startTime: time || '00:00',
            className: log.className,
            instructor: log.instructor || '회원'
        };
    }
    
    const branchSchedule = scheduleTemplate[log.branchId || ''] || [];
    const date = new Date(log.timestamp);
    const dayOfWeeks = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayOfWeeks[date.getDay()];
    
    const exactMatch = branchSchedule.find(s => s.days.includes(dayOfWeek) && s.startTime === time);
    
    const className = (log.className && log.className !== '일반') ? log.className : (exactMatch?.className || '일반');
    const instructor = (log.instructor && log.instructor !== '선생님') ? log.instructor : (exactMatch?.instructor || '미지정');

    return { 
        startTime: time || '00:00', 
        className, 
        instructor 
    };
};
