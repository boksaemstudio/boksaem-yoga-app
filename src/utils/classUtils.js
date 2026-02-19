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
    const checkInMinutes = date.getHours() * 60 + date.getMinutes();
    const dayOfWeeks = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayOfWeeks[date.getDay()];
    
    // 해당 지점의 스케줄 가져오기
    const branchSchedule = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[log.branchId] || [];
    const daySchedule = branchSchedule.filter(s => s.days.includes(dayOfWeek));

    if (daySchedule.length === 0) {
        // 스케줄이 아예 없는 날이면 어쩔 수 없이 시각 반환 (거의 발생 안 함)
        const h = String(date.getHours()).padStart(2, '0');
        return `${h}:00`;
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
        const [h, min] = m.startTime.split(':').map(Number);
        const startMin = h * 60 + min;
        
        // 시간 차이 계산
        // 체크인이 수업 시작 전일 수도 있고 후일 수도 있음 (절대값)
        let diff = checkInMinutes - startMin; 

        // [Logic] 수업 전 출석(Early Arrival) vs 수업 후 출석(Late Arrival) 보정
        // 보통 30분 전 ~ 60분 후 정도가 유효 범위.
        // 하지만 "엄격한 매칭"을 위해 범위 제한을 두지 않고 가장 가까운 것을 찾음.
        // 단, '다음 수업'이 '이전 수업'보다 가까울 수 있으므로 단순 절대값 비교가 유효함.
        
        // 예: 21:00 수업. 22:08 체크인 (차이 68분)
        // 만약 22:30 수업이 있다면? (차이 22분) -> 22:30으로 붙을 수 있음.
        // 하지만 강사/수업명이 일치한다면 candidates 필터링에 의해 21:00만 남을 것임.
        
        const absDiff = Math.abs(diff);

        if (absDiff < bestDiff) {
            bestDiff = absDiff;
            bestMatch = m;
        }
    }

    if (bestMatch) {
         return bestMatch.startTime; 
    }
    
    // Fallback (Logic Error 방지용)
    const h = String(date.getHours()).padStart(2, '0');
    return `${h}:00`;
};

/**
 * [New] 스케줄 객체 자체를 반환 (Canonical Name 사용을 위해)
 */
export const guessClassInfo = (log) => {
    if (!log.timestamp) return null;
    
    const time = guessClassTime(log);
    // guessClassTime이 내부적으로 스케줄을 찾지만 문자열만 반환하므로,
    // 여기서 다시 찾거나 guessClassTime을 리팩토링해야 함.
    // 성능상 guessClassTime을 단순 유지하고, 여기서 필요시 Lookup.
    
    const branchSchedule = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[log.branchId] || [];
    // time과 요일로 역추적
    const date = new Date(log.timestamp);
    const dayOfWeeks = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayOfWeeks[date.getDay()];
    
    const exactMatch = branchSchedule.find(s => s.days.includes(dayOfWeek) && s.startTime === time);
    if (exactMatch) return exactMatch;
    
    return { startTime: time, className: log.className, instructor: log.instructor };
};
