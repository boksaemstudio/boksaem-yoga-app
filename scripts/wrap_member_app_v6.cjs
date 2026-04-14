const fs = require('fs');
const path = require('path');

const koKeys = {
    member_crowd_level_1: "한산",
    member_crowd_level_2: "여유",
    member_crowd_level_3: "보통",
    member_crowd_level_4: "혼잡",
    member_crowd_level_5: "매우 혼잡",
    member_crowd_day_sun: "일",
    member_crowd_day_mon: "월",
    member_crowd_day_tue: "화",
    member_crowd_day_wed: "수",
    member_crowd_day_thu: "목",
    member_crowd_day_fri: "금",
    member_crowd_day_sat: "토",
    member_crowd_hour_range: "{start}-{end}시",
    member_crowd_hour_label: "{hour}시",
    member_crowd_analyzing: "혼잡도 데이터 분석 중...",
    member_crowd_title: "지점별 혼잡도",
    member_crowd_subtitle: "최근 4주 출석 데이터 기반 · 한산한 시간에 방문하세요!",
    member_crowd_visit_now: "지금 방문하면?",
    member_crowd_recommended: "추천 방문 시간"
};

const enKeys = {
    member_crowd_level_1: "Quiet",
    member_crowd_level_2: "Relaxed",
    member_crowd_level_3: "Moderate",
    member_crowd_level_4: "Crowded",
    member_crowd_level_5: "Very Crowded",
    member_crowd_day_sun: "Sun",
    member_crowd_day_mon: "Mon",
    member_crowd_day_tue: "Tue",
    member_crowd_day_wed: "Wed",
    member_crowd_day_thu: "Thu",
    member_crowd_day_fri: "Fri",
    member_crowd_day_sat: "Sat",
    member_crowd_hour_range: "{start}-{end}:00",
    member_crowd_hour_label: "{hour}:00",
    member_crowd_analyzing: "Analyzing crowd data...",
    member_crowd_title: "Crowd Levels by Branch",
    member_crowd_subtitle: "Based on 4-week attendance · Visit during quiet hours!",
    member_crowd_visit_now: "If you visit now?",
    member_crowd_recommended: "Recommended Visit Times"
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('member_crowd_title')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== MEMBER CROWD UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap BranchCrowdChart.jsx
const pPath = path.join(__dirname, '../src/components/profile/BranchCrowdChart.jsx');
let content = fs.readFileSync(pPath, 'utf8');

// The original file does not use the useLanguageStore t hook inside getCrowdLevel since it's defined outside.
// Let's pass `t` down to `getCrowdLevel`!
if (!content.includes('const getCrowdLevel = (val, maxCount, t)')) {
    content = content.replace(
        "const getCrowdLevel = (val, maxCount) => {",
        "const getCrowdLevel = (val, maxCount, t) => {"
    );
    content = content.replace(
        "const level = getCrowdLevel(val, maxCount);",
        "const level = getCrowdLevel(val, maxCount, t);"
    );
    // There are other places that call getCrowdLevel
    content = content.replace(
        "const nowLevel = getCrowdLevel(nowVal, branchData.maxCount);",
        "const nowLevel = getCrowdLevel(nowVal, branchData.maxCount, t);"
    );
    
    // Pass t to HeatCell
    content = content.replace(
        "HeatCell = memo(({ val, maxCount, isNow }) => {",
        "HeatCell = memo(({ val, maxCount, isNow, t }) => {"
    );
    content = content.replace(
        "isNow={isNow}",
        "isNow={isNow} t={t}"
    );
}

const replacements = [
    { regex: /label: '한산'/g, replace: "label: t('member_crowd_level_1') || '한산'" },
    { regex: /label: '여유'/g, replace: "label: t('member_crowd_level_2') || '여유'" },
    { regex: /label: '보통'/g, replace: "label: t('member_crowd_level_3') || '보통'" },
    { regex: /label: '혼잡'/g, replace: "label: t('member_crowd_level_4') || '혼잡'" },
    { regex: /label: '매우 혼잡'/g, replace: "label: t('member_crowd_level_5') || '매우 혼잡'" },
    
    { regex: /const dayLabels = \['일', '월', '화', '수', '목', '금', '토'\];/g, replace: "const dayLabels = [(t('member_crowd_day_sun') || '일'), (t('member_crowd_day_mon') || '월'), (t('member_crowd_day_tue') || '화'), (t('member_crowd_day_wed') || '수'), (t('member_crowd_day_thu') || '목'), (t('member_crowd_day_fri') || '금'), (t('member_crowd_day_sat') || '토')];" },
    { regex: /const dayLabels = \['월', '화', '수', '목', '금', '토', '일'\];/g, replace: "const dayLabels = [(t('member_crowd_day_mon') || '월'), (t('member_crowd_day_tue') || '화'), (t('member_crowd_day_wed') || '수'), (t('member_crowd_day_thu') || '목'), (t('member_crowd_day_fri') || '금'), (t('member_crowd_day_sat') || '토'), (t('member_crowd_day_sun') || '일')];" },
    
    { regex: /const hourLabels = \{ '06': '6-8시', '08': '8-10시', '10': '10-12시', '12': '12-14시', '14': '14-16시', '16': '16-18시', '18': '18-20시', '20': '20-22시' \};/g, replace: "const hourLabels = { '06': t('member_crowd_hour_range', {start:'6', end:'8'}) || '6-8시', '08': t('member_crowd_hour_range', {start:'8', end:'10'}) || '8-10시', '10': t('member_crowd_hour_range', {start:'10', end:'12'}) || '10-12시', '12': t('member_crowd_hour_range', {start:'12', end:'14'}) || '12-14시', '14': t('member_crowd_hour_range', {start:'14', end:'16'}) || '14-16시', '16': t('member_crowd_hour_range', {start:'16', end:'18'}) || '16-18시', '18': t('member_crowd_hour_range', {start:'18', end:'20'}) || '18-20시', '20': t('member_crowd_hour_range', {start:'20', end:'22'}) || '20-22시' };" },
    
    { regex: /const hourLabels = \['6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시'\];/g, replace: "const hourLabels = [t('member_crowd_hour_label', {hour:'6'}) || '6시', t('member_crowd_hour_label', {hour:'8'}) || '8시', t('member_crowd_hour_label', {hour:'10'}) || '10시', t('member_crowd_hour_label', {hour:'12'}) || '12시', t('member_crowd_hour_label', {hour:'14'}) || '14시', t('member_crowd_hour_label', {hour:'16'}) || '16시', t('member_crowd_hour_label', {hour:'18'}) || '18시', t('member_crowd_hour_label', {hour:'20'}) || '20시'];" },
    
    { regex: />혼잡도 데이터 분석 중\.\.\.<\/span>/g, replace: ">{t('member_crowd_analyzing') || '혼잡도 데이터 분석 중...'}</span>" },
    { regex: /📊 지점별 혼잡도/g, replace: "📊 {t('member_crowd_title') || '지점별 혼잡도'}" },
    { regex: /최근 4주 출석 데이터 기반 · 한산한 시간에 방문하세요!/g, replace: "{t('member_crowd_subtitle') || '최근 4주 출석 데이터 기반 · 한산한 시간에 방문하세요!'}" },
    
    { regex: /지금 방문하면\?/g, replace: "{t('member_crowd_visit_now') || '지금 방문하면?'}" },
    { regex: /✨ 추천 방문 시간/g, replace: "✨ {t('member_crowd_recommended') || '추천 방문 시간'}" },
    
    // Bottom legend
    { regex: /\{ label: '한산', color: '#10b981' \}/g, replace: "{ label: (t('member_crowd_level_1') || '한산'), color: '#10b981' }" },
    { regex: /\{ label: '보통', color: '#fbbf24' \}/g, replace: "{ label: (t('member_crowd_level_3') || '보통'), color: '#fbbf24' }" },
    { regex: /\{ label: '혼잡', color: '#f97316' \}/g, replace: "{ label: (t('member_crowd_level_4') || '혼잡'), color: '#f97316' }" },
    { regex: /\{ label: '매우 혼잡', color: '#ef4444' \}/g, replace: "{ label: (t('member_crowd_level_5') || '매우 혼잡'), color: '#ef4444' }" }
];

let matchCount = 0;
for (const r of replacements) {
    const originalContent = content;
    content = content.replace(r.regex, r.replace);
    if (content !== originalContent) {
        matchCount++;
    } else {
        console.log("NOT FOUND REGEX: ", r.regex);
    }
}

fs.writeFileSync(pPath, content);
console.log(`[2] BranchCrowdChart.jsx replaced ${matchCount}/${replacements.length} regexes.`);
