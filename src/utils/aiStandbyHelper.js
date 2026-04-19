// src/utils/aiStandbyHelper.js
import * as AIMessages from '../constants/aiMessages';

/**
 * AI 스탠바이 응답을 위한 하드코딩 문구 선택 헬퍼 콜백 
 * - UI나 State 렌더링과 전혀 무관한 순수 자바스크립트 로직입니다.
 */
export const getStaticStandbyMessage = (hour, weatherCode, classTitle, language = 'ko') => {
    if (language !== 'ko') {
        const fallbacks = {
            en: "May you find a precious moment to meet yourself on the mat today.",
            ja: "今日もマットの上で自分自身と向き合う大切な時間となりますように。",
            zh: "愿你今天在垫子上找到与自己相遇的珍贵时刻。",
            es: "Que encuentres un momento precioso para encontrarte contigo mismo en la colchoneta hoy.",
            pt: "Que você encontre um momento precioso para se encontrar no tapete hoje.",
            ru: "Желаю вам найти драгоценный момент для встречи с собой на коврике сегодня.",
            fr: "Puissiez-vous trouver un moment précieux pour vous retrouver sur le tapis aujourd'hui.",
            de: "Mögen Sie heute einen kostbaren Moment finden, um sich selbst auf der Matte zu begegnen.",
            vi: "Chúc bạn tìm thấy một khoảnh khắc quý giá để gặp gỡ chính mình trên thảm hôm nay.",
            th: "ขอให้คุณพบช่วงเวลาอันมีค่าในการพบกับตัวเองบนเสื่อในวันนี้"
        };
        return fallbacks[language] || fallbacks['en'];
    }

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
    if (!staticMsg && classTitle && classTitle !== "Self Practice" && Math.random() > 0.5) {
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
