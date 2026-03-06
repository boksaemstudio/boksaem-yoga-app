import { STUDIO_CONFIG } from '../studioConfig';

/**
 *  출석 로그의 시간 정보(timestamp)와 스튜디오 스케줄을 비교하여
 * 해당 출석이 어떤 수업 시간대에 속하는지 추측합니다.
 * 
 * [2024-02-19 Update] "자율수련" 또는 "생성된 시간" 제거를 위해
 * 무조건 스케줄 상의 시간 중 하나로 매핑합니다. (Strict Mode)
 * 
 * @param {Object} log - 출석 로그 객체 (timestamp, className, branchId 포함)
 * @returns {string|null} HH:mm 형식의 시간 문자열 또는 null
 */
export const guessClassTime = (log) => {
    if (log.classTime && log.classTime !== '00:00') return log.classTime; // 이미 유효한 classTime이 있으면 사용
    if (!log.timestamp) return null;
    
    const date = new Date(log.timestamp);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const actualTime = `${h}:${m}`;

    // [FIX] 자율수련, 자율수업인 경우 정규 스케줄에 억지로 끼워맞추지 않고 무조건 실제 출석 시간 반환
    if (log.className === '자율수련' || log.className === '자율수업') {
        return actualTime;
    }

    const checkInMinutes = date.getHours() * 60 + date.getMinutes();
    const dayOfWeeks = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayOfWeeks[date.getDay()];
    
    // 해당 지점의 스케줄 가져오기
    const branchSchedule = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[log.branchId] || [];
    const daySchedule = branchSchedule.filter(s => s.days.includes(dayOfWeek));

    if (daySchedule.length === 0) {
        // 스케줄이 아예 없는 날이면 어쩔 수 없이 시각 반환 (거의 발생 안 함)
        return actualTime;
    }

    // 1. 수업명 + 강사명 모두 일치하는 스케줄 찾기 (Best Case)
    // 2. 수업명 또는 강사명이 일치하는 스케줄 찾기 (Normal Case)
    // 3. 그냥 시간상 가장 가까운 스케줄 찾기 (Fallback)

    let candidates = daySchedule.filter(s => {
        const nameMatch = log.className && s.className && (log.className.includes(s.className) || s.className.includes(log.className));
        const instructorMatch = log.instructor && s.instructor && (log.instructor === s.instructor || log.instructor.includes(s.instructor));
        return nameMatch || instructorMatch;
    });

    if (candidates.length === 0) {
        // 일치하는 정보가 없으면, 오늘 스케줄 전체를 후보로
        candidates = daySchedule;
    }

    // 후보군 중에서 시간 차이가 가장 적은 것 선택
    let bestMatch = null;
    let bestDiff = Infinity;

    for (const m of candidates) {
        const [schH, schMin] = m.startTime.split(':').map(Number);
        const startMin = schH * 60 + schMin;
        
        let diff = checkInMinutes - startMin; 
        const absDiff = Math.abs(diff);

        if (absDiff < bestDiff) {
            bestDiff = absDiff;
            bestMatch = m;
        }
    }

    // [Fix] Enforce 120-minute window. If check-in is too far from class, treat as separate/self-practice.
    if (bestMatch && bestDiff <= 120) {
         return bestMatch.startTime; 
    }
    
    // Fallback: Use actual check-in time if no close match found
    return actualTime;
};

/**
 * [New] 스케줄 객체 자체를 반환 (Canonical Name 사용을 위해)
 */
export const guessClassInfo = (log) => {
    if (!log.timestamp) return null;
    
    const time = guessClassTime(log);
    
    // [FIX] 자율수련인 경우 DB에 저장된 그대로 반환 (스태틱 템플릿 참조 X)
    if (log.className === '자율수련' || log.className === '자율수업') {
        return {
            startTime: time,
            className: log.className,
            instructor: log.instructor || '회원' // 보통 자율수련은 강사가 없습니다
        };
    }
    
    const branchSchedule = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[log.branchId] || [];
    // time과 요일로 역추적
    const date = new Date(log.timestamp);
    const dayOfWeeks = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayOfWeeks[date.getDay()];
    
    const exactMatch = branchSchedule.find(s => s.days.includes(dayOfWeek) && s.startTime === time);
    
    // [FIX] Prioritize the log's actual data over the static template, because
    // the log data is generated from the dynamic daily_classes schedule.
    // The static template is only a fallback for old/incomplete logs.
    const className = (log.className && log.className !== '일반') ? log.className : (exactMatch?.className || '일반');
    const instructor = (log.instructor && log.instructor !== '선생님') ? log.instructor : (exactMatch?.instructor || '미지정');

    return { 
        startTime: time, 
        className, 
        instructor 
    };
};
