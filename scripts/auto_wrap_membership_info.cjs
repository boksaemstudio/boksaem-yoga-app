const fs = require('fs');
const path = require('path');

const targetFiles = [
    '../src/components/profile/MembershipInfo.jsx',
    '../src/components/member/PushNotificationSettings.jsx',
    '../src/components/MemberScheduleCalendar.jsx',
    '../src/pages/MemberProfile.jsx',
    '../src/components/profile/BranchCrowdChart.jsx',
    '../src/components/profile/tabs/PriceTab.jsx',
];

const koKeys = {
    // Member - MembershipInfo
    member_ai_badge: "💠 AI 출석 등록",
    member_ai_notice_title: "AI 출석 안내",
    member_ai_notice_desc1: "회원님의 사진은 ",
    member_ai_notice_desc2: "저장되지 않습니다.",
    member_ai_notice_desc3: " 얼굴 특징이 128차원 숫자(벡터)로 변환되어 안전하게 보관되며, 원본 이미지는 즉시 삭제됩니다. 숫자 데이터로는 얼굴을 복원할 수 없습니다.",
    member_hold_admin_elapsed: "{start}부터 정지 중 ({elapsed}일째)",
    member_hold_admin_auto_release: "첫 출석 시 재시작",
    member_pace_title: "수강 페이스",
    member_pace_fast_status: "빠름",
    member_pace_fast_msg: "열심히 하고 계세요! 이 페이스로 꾸준히!",
    member_pace_good_status: "적절",
    member_pace_good_msg: "완벽한 페이스예요! 꾸준함이 건강의 비결!",
    member_pace_slow_status: "조금 느림",
    member_pace_slow_msg: "조금 더 분발하면 수강권을 알차게 쓸 수 있어요!",
    member_pace_vslow_status: "느림",
    member_pace_vslow_msg: "수련하러 오세요! 남은 기간에 아직 충분히 할 수 있어요!",
    member_pace_usage: "{count}회 사용 / {total}회 중",
    member_pace_used: "수강 {ratio}%",
    member_pace_period: "기간 {ratio}%",
    member_pace_remaining: "잔여 {count}회",
    member_diligence_title: "근면성실도",
    member_diligence_score: "{score}점 / 100",
    member_diligence_s: "완벽한 근면성실! 당신은 요가 마스터 🧘",
    member_diligence_a: "훌륭해요! 꾸준함이 빛나는 수련자",
    member_diligence_b: "좋은 페이스! 조금만 더 규칙적으로",
    member_diligence_c: "가능성이 있어요! 습관을 만들어보세요",
    member_diligence_d: "다시 시작해봐요! 작은 한 걸음부터",
    member_diligence_ind_week: "주간 출석",
    member_diligence_ind_reg: "규칙성",
    member_diligence_ind_cons: "꾸준함",
    member_diligence_ind_vit: "최근 활력",
    member_diligence_ind_week_desc: "주 {avg}회",
    member_diligence_ind_reg_vgood: "매우 규칙적",
    member_diligence_ind_reg_good: "규칙적",
    member_diligence_ind_reg_bad: "불규칙",
    member_diligence_ind_cons_desc: "최근 4주 중 {count}주 출석",
    member_diligence_ind_vit_desc: "최근 2주 {count}회"
};

const enKeys = {
    member_ai_badge: "💠 AI Face Registered",
    member_ai_notice_title: "AI Attendance Notice",
    member_ai_notice_desc1: "Your photo is ",
    member_ai_notice_desc2: "not saved.",
    member_ai_notice_desc3: " Facial features are converted to a 128-dimensional vector and stored safely. The original image is deleted immediately. Faces cannot be reconstructed from vector data.",
    member_hold_admin_elapsed: "Suspended since {start} ({elapsed} days)",
    member_hold_admin_auto_release: "Resumes on first check-in",
    member_pace_title: "Class Pace",
    member_pace_fast_status: "Fast",
    member_pace_fast_msg: "You're doing great! Keep up this amazing pace!",
    member_pace_good_status: "Good",
    member_pace_good_msg: "Perfect pace! Consistency is the key to health!",
    member_pace_slow_status: "Slightly Slow",
    member_pace_slow_msg: "A little more effort and you'll make the most of your pass!",
    member_pace_vslow_status: "Slow",
    member_pace_vslow_msg: "Come practice! You still have time before it expires!",
    member_pace_usage: "Used {count} / {total} total",
    member_pace_used: "{ratio}% Used",
    member_pace_period: "{ratio}% Elapsed",
    member_pace_remaining: "{count} left",
    member_diligence_title: "Diligence Score",
    member_diligence_score: "{score} pts / 100",
    member_diligence_s: "Perfect diligence! You are a Yoga Master 🧘",
    member_diligence_a: "Excellent! A shining example of consistency",
    member_diligence_b: "Good pace! Try to be a little more regular",
    member_diligence_c: "You have potential! Let's build a habit",
    member_diligence_d: "Let's restart! Take it one step at a time",
    member_diligence_ind_week: "Weekly",
    member_diligence_ind_reg: "Regularity",
    member_diligence_ind_cons: "Consistency",
    member_diligence_ind_vit: "Vitality",
    member_diligence_ind_week_desc: "{avg}x / week",
    member_diligence_ind_reg_vgood: "Very regular",
    member_diligence_ind_reg_good: "Regular",
    member_diligence_ind_reg_bad: "Irregular",
    member_diligence_ind_cons_desc: "{count} weeks in last 4",
    member_diligence_ind_vit_desc: "{count}x in last 2 weeks"
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('member_ai_badge')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== MEMBER PROFILE UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap MembershipInfo.jsx
const miPath = path.join(__dirname, '../src/components/profile/MembershipInfo.jsx');
let content = fs.readFileSync(miPath, 'utf8');

// Replacements mappings
const replacements = [
    { target: '💠 AI 출석 등록', replace: "{t('member_ai_badge') || '💠 AI 출석 등록'}" },
    { target: '<span style={{ color: \\'#818CF8\\', fontWeight: \\'bold\\' }}>AI 출석 안내</span> —', replace: "<span style={{ color: '#818CF8', fontWeight: 'bold' }}>{t('member_ai_notice_title') || 'AI 출석 안내'}</span> —" },
    { target: '회원님의 사진은 <b style={{ color: \\'rgba(255,255,255,0.85)\\' }}>저장되지 않습니다.</b> 얼굴 특징이 128차원 숫자(벡터)로 변환되어 안전하게 보관되며, 원본 이미지는 즉시 삭제됩니다. 숫자 데이터로는 얼굴을 복원할 수 없습니다.', replace: "{t('member_ai_notice_desc1') || '회원님의 사진은 '}<b style={{ color: 'rgba(255,255,255,0.85)' }}>{t('member_ai_notice_desc2') || '저장되지 않습니다.'}</b>{t('member_ai_notice_desc3') || ' 얼굴 특징이 128차원 숫자(벡터)로 변환되어 안전하게 보관되며, 원본 이미지는 즉시 삭제됩니다. 숫자 데이터로는 얼굴을 복원할 수 없습니다.'}" },
    { target: '\\`${holdInfo.startDate}부터 정지 중 (${holdInfo.elapsed}일째)\\`', replace: "(t('member_hold_admin_elapsed', { start: holdInfo.startDate, elapsed: holdInfo.elapsed }) || `${holdInfo.startDate}부터 정지 중 (${holdInfo.elapsed}일째)`)" },
    { target: 'holdInfo.isAdminHold ? \\'첫 출석 시 재시작\\' : t(\\'holdAutoRelease\\')', replace: "holdInfo.isAdminHold ? (t('member_hold_admin_auto_release') || '첫 출석 시 재시작') : t('holdAutoRelease')" },
    
    { target: 'paceStatus = \\'빠름\\';', replace: "paceStatus = t('member_pace_fast_status') || '빠름';" },
    { target: 'paceMessage = \\'열심히 하고 계세요! 이 페이스로 꾸준히!\\';', replace: "paceMessage = t('member_pace_fast_msg') || '열심히 하고 계세요! 이 페이스로 꾸준히!';" },
    { target: 'paceStatus = \\'적절\\';', replace: "paceStatus = t('member_pace_good_status') || '적절';" },
    { target: 'paceMessage = \\'완벽한 페이스예요! 꾸준함이 건강의 비결!\\';', replace: "paceMessage = t('member_pace_good_msg') || '완벽한 페이스예요! 꾸준함이 건강의 비결!';" },
    { target: 'paceStatus = \\'조금 느림\\';', replace: "paceStatus = t('member_pace_slow_status') || '조금 느림';" },
    { target: 'paceMessage = \\'조금 더 분발하면 수강권을 알차게 쓸 수 있어요!\\';', replace: "paceMessage = t('member_pace_slow_msg') || '조금 더 분발하면 수강권을 알차게 쓸 수 있어요!';" },
    { target: 'paceStatus = \\'느림\\';', replace: "paceStatus = t('member_pace_vslow_status') || '느림';" },
    { target: 'paceMessage = \\'수련하러 오세요! 남은 기간에 아직 충분히 할 수 있어요!\\';', replace: "paceMessage = t('member_pace_vslow_msg') || '수련하러 오세요! 남은 기간에 아직 충분히 할 수 있어요!';" },

    { target: '<span style={{ fontSize: \\'0.85rem\\', fontWeight: \\'700\\', color: \\'white\\' }}>수강 페이스</span>', replace: "<span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{t('member_pace_title') || '수강 페이스'}</span>" },
    { target: '{attendanceCount}회 사용 / {totalCredits}회 중', replace: "{t('member_pace_usage', { count: attendanceCount, total: totalCredits }) || `${attendanceCount}회 사용 / ${totalCredits}회 중`}" },
    
    { target: '수강 {usageRatio}%', replace: "{t('member_pace_used', { ratio: usageRatio }) || `수강 ${usageRatio}%`}" },
    { target: '기간 {timeRatio}%', replace: "{t('member_pace_period', { ratio: timeRatio }) || `기간 ${timeRatio}%`}" },
    { target: '잔여 {remainingCredits}회', replace: "{t('member_pace_remaining', { count: remainingCredits }) || `잔여 ${remainingCredits}회`}" },

    { target: '\\'완벽한 근면성실! 당신은 요가 마스터 🧘\\';', replace: "t('member_diligence_s') || '완벽한 근면성실! 당신은 요가 마스터 🧘';" },
    { target: '\\'훌륭해요! 꾸준함이 빛나는 수련자\\';', replace: "t('member_diligence_a') || '훌륭해요! 꾸준함이 빛나는 수련자';" },
    { target: '\\'좋은 페이스! 조금만 더 규칙적으로\\';', replace: "t('member_diligence_b') || '좋은 페이스! 조금만 더 규칙적으로';" },
    { target: '\\'가능성이 있어요! 습관을 만들어보세요\\';', replace: "t('member_diligence_c') || '가능성이 있어요! 습관을 만들어보세요';" },
    { target: '\\'다시 시작해봐요! 작은 한 걸음부터\\';', replace: "t('member_diligence_d') || '다시 시작해봐요! 작은 한 걸음부터';" },

    { target: 'label: \\'주간 출석\\'', replace: "label: t('member_diligence_ind_week') || '주간 출석'" },
    { target: 'label: \\'규칙성\\'', replace: "label: t('member_diligence_ind_reg') || '규칙성'" },
    { target: 'label: \\'꾸준함\\'', replace: "label: t('member_diligence_ind_cons') || '꾸준함'" },
    { target: 'label: \\'최근 활력\\'', replace: "label: t('member_diligence_ind_vit') || '최근 활력'" },

    { target: '\\`주 ${weeklyAvg.toFixed(1)}회\\`', replace: "t('member_diligence_ind_week_desc', { avg: weeklyAvg.toFixed(1) }) || `주 ${weeklyAvg.toFixed(1)}회`" },
    { target: '\\'매우 규칙적\\'', replace: "t('member_diligence_ind_reg_vgood') || '매우 규칙적'" },
    { target: '\\'규칙적\\'', replace: "t('member_diligence_ind_reg_good') || '규칙적'" },
    { target: '\\'불규칙\\'', replace: "t('member_diligence_ind_reg_bad') || '불규칙'" },
    { target: '\\`최근 4주 중 ${recentWeeks.reduce((a, b) => a + b, 0)}주 출석\\`', replace: "t('member_diligence_ind_cons_desc', { count: recentWeeks.reduce((a, b) => a + b, 0) }) || `최근 4주 중 ${recentWeeks.reduce((a, b) => a + b, 0)}주 출석`" },
    { target: '\\`최근 2주 ${recentCount}회\\`', replace: "t('member_diligence_ind_vit_desc', { count: recentCount }) || `최근 2주 ${recentCount}회`" },

    { target: '<span style={{ fontSize: \\'0.85rem\\', fontWeight: \\'700\\', color: \\'white\\' }}>근면성실도</span>', replace: "<span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{t('member_diligence_title') || '근면성실도'}</span>" },
    { target: '<span style={{ fontSize: \\'0.75rem\\', color: \\'#71717a\\' }}>{totalScore}점 / 100</span>', replace: "<span style={{ fontSize: '0.75rem', color: '#71717a' }}>{t('member_diligence_score', { score: totalScore }) || `${totalScore}점 / 100`}</span>" }
];

let replacedCount = 0;
for (const r of replacements) {
    if (content.includes(r.target)) {
        content = content.replace(r.target, r.replace);
        replacedCount++;
    } else {
        console.log("NOT FOUND: ", r.target);
    }
}
fs.writeFileSync(miPath, content);
console.log(`[2] MembershipInfo.jsx replaced ${replacedCount}/${replacements.length} strings.`);
