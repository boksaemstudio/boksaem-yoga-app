// src/utils/aiStandbyHelper.js
import * as AIMessages from '../constants/aiMessages';

/**
 * AI 스탠바이 응답을 위한 하드코딩 문구 선택 헬퍼 콜백 
 * - UI나 State 렌더링과 전혀 무관한 순수 자바스크립트 로직입니다.
 */
export const getStaticStandbyMessage = (hour, weatherCode, classTitle) => {
    let staticMsg = "";

    // 1. Weather Context (Priority 1)
    const wCode = parseInt(weatherCode);
    const isRainy = (wCode >= 51 && wCode <= 67) || (wCode >= 80 && wCode <= 82);
    const isSnowy = (wCode >= 71 && wCode <= 77) || (wCode >= 85 && wCode <= 86);

    if (isRainy && Math.random() > 0.3) {
        staticMsg = AIMessages.RAIN_MESSAGES[Math.floor(Math.random() * AIMessages.RAIN_MESSAGES.length)];
    } else if (isSnowy && Math.random() > 0.3) {
        staticMsg = AIMessages.SNOW_MESSAGES[Math.floor(Math.random() * AIMessages.SNOW_MESSAGES.length)];
    }

    // 2. Class Context (Priority 2)
    if (!staticMsg && classTitle && classTitle !== "자율수련" && Math.random() > 0.5) {
        if (classTitle.includes("플라잉")) {
            staticMsg = AIMessages.CLASS_TYPES.FLYING[Math.floor(Math.random() * AIMessages.CLASS_TYPES.FLYING.length)];
        } else if (classTitle.includes("테라피") || classTitle.includes("힐링")) {
            staticMsg = AIMessages.CLASS_TYPES.HEALING[Math.floor(Math.random() * AIMessages.CLASS_TYPES.HEALING.length)];
        } else if (classTitle.includes("명상") || classTitle.includes("빈야사")) {
            staticMsg = AIMessages.CLASS_TYPES.FLOW[Math.floor(Math.random() * AIMessages.CLASS_TYPES.FLOW.length)];
        }
    }

    // 3. Time Context (Priority 3)
    if (!staticMsg) {
        let timeMsgs = [];
        if (hour >= 6 && hour < 11) {
            timeMsgs = AIMessages.TIME_BASED_MESSAGES.MORNING;
        } else if (hour >= 11 && hour < 14) {
            timeMsgs = AIMessages.TIME_BASED_MESSAGES.LUNCH;
        } else if (hour >= 14 && hour < 18) {
            timeMsgs = AIMessages.TIME_BASED_MESSAGES.AFTERNOON;
        } else if (hour >= 18 && hour < 21) {
            timeMsgs = AIMessages.TIME_BASED_MESSAGES.EVENING;
        } else {
            timeMsgs = AIMessages.TIME_BASED_MESSAGES.NIGHT;
        }
        staticMsg = timeMsgs[Math.floor(Math.random() * timeMsgs.length)];
    }

    return staticMsg;
};
