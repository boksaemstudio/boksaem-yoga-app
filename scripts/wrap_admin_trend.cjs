const fs = require('fs');
const path = require('path');

const koKeys = {
    admin_trend_this_week: "이번 주",
    admin_trend_mon_to_today: "월~오늘",
    admin_trend_last_week: "지난 주",
    admin_trend_vs_same_time: "동일 시점 대비",
    admin_trend_collecting: "집계 중",
    admin_trend_in_progress: "진행 중",
    admin_trend_attendance: "출석",
    admin_trend_new: "신규",
    admin_trend_existing: "기존",
    admin_trend_7d_avg: "7일 평균",
    admin_trend_day_mon: "월",
    admin_trend_day_tue: "화",
    admin_trend_day_wed: "수",
    admin_trend_day_thu: "목",
    admin_trend_day_fri: "금",
    admin_trend_day_sat: "토",
    admin_trend_day_sun: "일",
    admin_trend_hour_suffix: "시",
    admin_trend_few: "적음",
    admin_trend_moderate: "보통",
    admin_trend_peak: "피크",
    admin_trend_top5_class: "🏆 인기 수업 Top 5",
    admin_trend_top5_inst: "⭐ 인기 강사 Top 5",
    admin_trend_no_data: "데이터 없음",
    admin_trend_ratio_title: "출석 비중 (신규 vs 기존)",
    admin_trend_new_att: "신규 출석",
    admin_trend_recent_30d: "최근 30일 등록",
    admin_trend_existing_att: "기존 출석",
    admin_trend_count_unit: "건",
    admin_trend_same_period: "동일 기간",
    admin_trend_general: "일반",
    admin_trend_unassigned: "미지정",
    admin_trend_admin: "관리자",
    admin_trend_analyzing: "출석 추세 분석 중...",
    admin_trend_title: "출석 추세 분석",
    admin_trend_tab_daily: "일별 추세",
    admin_trend_tab_heatmap: "히트맵",
    admin_trend_tab_ranking: "인기 분석",
    admin_trend_filter_all: "📊 전체 통합",
    admin_trend_1year: "1년",
    admin_trend_daily_dot: "○ 점선 = 오늘(집계 중)"
};

const enKeys = {
    admin_trend_this_week: "This Week",
    admin_trend_mon_to_today: "Mon~Today",
    admin_trend_last_week: "Last Week",
    admin_trend_vs_same_time: "Vs Same Period",
    admin_trend_collecting: "Collecting",
    admin_trend_in_progress: "In Progress",
    admin_trend_attendance: "Attendance",
    admin_trend_new: "New",
    admin_trend_existing: "Existing",
    admin_trend_7d_avg: "7D Avg",
    admin_trend_day_mon: "Mon",
    admin_trend_day_tue: "Tue",
    admin_trend_day_wed: "Wed",
    admin_trend_day_thu: "Thu",
    admin_trend_day_fri: "Fri",
    admin_trend_day_sat: "Sat",
    admin_trend_day_sun: "Sun",
    admin_trend_hour_suffix: ":00",
    admin_trend_few: "Low",
    admin_trend_moderate: "Moderate",
    admin_trend_peak: "Peak",
    admin_trend_top5_class: "🏆 Top 5 Classes",
    admin_trend_top5_inst: "⭐ Top 5 Instructors",
    admin_trend_no_data: "No Data",
    admin_trend_ratio_title: "Attendance Ratio (New vs Existing)",
    admin_trend_new_att: "New Attendances",
    admin_trend_recent_30d: "Registered <30d",
    admin_trend_existing_att: "Existing Attendances",
    admin_trend_count_unit: "times",
    admin_trend_same_period: "Same Period",
    admin_trend_general: "General",
    admin_trend_unassigned: "Unassigned",
    admin_trend_admin: "Admin",
    admin_trend_analyzing: "Analyzing trend...",
    admin_trend_title: "Attendance Trend",
    admin_trend_tab_daily: "Daily",
    admin_trend_tab_heatmap: "Heatmap",
    admin_trend_tab_ranking: "Ranking",
    admin_trend_filter_all: "📊 All Branches",
    admin_trend_1year: "1 Year",
    admin_trend_daily_dot: "○ Dotted = Today"
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('admin_trend_this_week')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== ADMIN ATTENDANCE TREND ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap AttendanceTrendChart.jsx and Fix UI Bugs
const pPath = path.join(__dirname, '../src/components/admin/tabs/AttendanceTrendChart.jsx');
let content = fs.readFileSync(pPath, 'utf8');

// Fixing Unit Issue: "명" to "건" in Tooltip
content = content.replace(
    /\{t\('출석'\)\}: \{d\.count\}\{t\('명'\)\}/g,
    "{t('admin_trend_attendance') || '출석'}: {d.count}{t('admin_trend_count_unit') || '건'}"
);
content = content.replace(
    /\{t\('신규'\)\}: \{d\.newCount\}\{t\('명'\)\}/g,
    "{t('admin_trend_new') || '신규'}: {d.newCount}{t('admin_trend_count_unit') || '건'}"
);
content = content.replace(
    /\{t\('기존'\)\}: \{d\.existingCount\}\{t\('명'\)\}/g,
    "{t('admin_trend_existing') || '기존'}: {d.existingCount}{t('admin_trend_count_unit') || '건'}"
);

// Fixing layout logic overlap issue
content = content.replace(
    /newPct >= 10 \? `\$\{t\('신규'\)\} \$\{newPct\}%` : ''/g,
    "newPct >= 18 ? `${t('admin_trend_new') || '신규'} ${newPct}%` : ''"
);
content = content.replace(
    /existPct >= 10 \? `\$\{t\('기존'\)\} \$\{existPct\}%` : ''/g,
    "existPct >= 18 ? `${t('admin_trend_existing') || '기존'} ${existPct}%` : ''"
);

// Replace hardcoded strings
const replacements = [
    { regex: /'이번 주'/g, replace: "(t('admin_trend_this_week') || '이번 주')" },
    { regex: /'월~오늘'/g, replace: "(t('admin_trend_mon_to_today') || '월~오늘')" },
    { regex: /'지난 주'/g, replace: "(t('admin_trend_last_week') || '지난 주')" },
    { regex: /'동일 시점 대비'/g, replace: "(t('admin_trend_vs_same_time') || '동일 시점 대비')" },
    { regex: /'집계 중'/g, replace: "(t('admin_trend_collecting') || '집계 중')" },
    { regex: /'진행 중'/g, replace: "(t('admin_trend_in_progress') || '진행 중')" },
    { regex: /'7일 평균'/g, replace: "(t('admin_trend_7d_avg') || '7일 평균')" },
    
    // Arrays
    { regex: /\[t\('월'\), t\('화'\), t\('수'\), t\('목'\), t\('금'\), t\('토'\), t\('일'\)\]/g, replace: "[(t('admin_trend_day_mon') || '월'), (t('admin_trend_day_tue') || '화'), (t('admin_trend_day_wed') || '수'), (t('admin_trend_day_thu') || '목'), (t('admin_trend_day_fri') || '금'), (t('admin_trend_day_sat') || '토'), (t('admin_trend_day_sun') || '일')]" },
    { regex: /\[t\('일'\), t\('월'\), t\('화'\), t\('수'\), t\('목'\), t\('금'\), t\('토'\)\]/g, replace: "[(t('admin_trend_day_sun') || '일'), (t('admin_trend_day_mon') || '월'), (t('admin_trend_day_tue') || '화'), (t('admin_trend_day_wed') || '수'), (t('admin_trend_day_thu') || '목'), (t('admin_trend_day_fri') || '금'), (t('admin_trend_day_sat') || '토')]" },
    { regex: /'시'/g, replace: "(t('admin_trend_hour_suffix') || '시')" },
    
    { regex: /'적음'/g, replace: "(t('admin_trend_few') || '적음')" },
    { regex: /'보통'/g, replace: "(t('admin_trend_moderate') || '보통')" },
    { regex: /'피크'/g, replace: "(t('admin_trend_peak') || '피크')" },
    { regex: /'🏆 인기 수업 Top 5'/g, replace: "(t('admin_trend_top5_class') || '🏆 인기 수업 Top 5')" },
    { regex: /'⭐ 인기 강사 Top 5'/g, replace: "(t('admin_trend_top5_inst') || '⭐ 인기 강사 Top 5')" },
    { regex: /'데이터 없음'/g, replace: "(t('admin_trend_no_data') || '데이터 없음')" },
    { regex: /'출석 비중 \(신규 vs 기존\)'/g, replace: "(t('admin_trend_ratio_title') || '출석 비중 (신규 vs 기존)')" },
    { regex: /'신규 출석'/g, replace: "(t('admin_trend_new_att') || '신규 출석')" },
    { regex: /'최근 30일 등록'/g, replace: "(t('admin_trend_recent_30d') || '최근 30일 등록')" },
    { regex: /'기존 출석'/g, replace: "(t('admin_trend_existing_att') || '기존 출석')" },
    { regex: /'건'/g, replace: "(t('admin_trend_count_unit') || '건')" },
    { regex: /'동일 기간'/g, replace: "(t('admin_trend_same_period') || '동일 기간')" },
    { regex: /'일반'/g, replace: "(t('admin_trend_general') || '일반')" },
    { regex: /'미지정'/g, replace: "(t('admin_trend_unassigned') || '미지정')" },
    { regex: /'관리자'/g, replace: "(t('admin_trend_admin') || '관리자')" },
    { regex: /'출석 추세 분석 중\.\.\.'/g, replace: "(t('admin_trend_analyzing') || '출석 추세 분석 중...')" },
    { regex: /'출석 추세 분석'/g, replace: "(t('admin_trend_title') || '출석 추세 분석')" },
    { regex: /'일별 추세'/g, replace: "(t('admin_trend_tab_daily') || '일별 추세')" },
    { regex: /'히트맵'/g, replace: "(t('admin_trend_tab_heatmap') || '히트맵')" },
    { regex: /'인기 분석'/g, replace: "(t('admin_trend_tab_ranking') || '인기 분석')" },
    { regex: /'📊 전체 통합'/g, replace: "(t('admin_trend_filter_all') || '📊 전체 통합')" },
    { regex: /'1년'/g, replace: "(t('admin_trend_1year') || '1년')" },
    { regex: /'일별 출석'/g, replace: "(t('admin_trend_tab_daily') || '일별 추세')" },
    { regex: /'○ 점선 = 오늘\(집계 중\)'/g, replace: "(t('admin_trend_daily_dot') || '○ 점선 = 오늘(집계 중)')" }
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

// Fixing specific tooltips text that use `{c.count}{t('명')}` -> `c.count + t('건')` because it's popularity ranking of attendances!
// Actually, for instructor ranking, it is also total count of attendances.
content = content.replace(/\{c\.count\}\{t\('명'\)\}/g, "{c.count}{(t('admin_trend_count_unit') || '건')}");

fs.writeFileSync(pPath, content);
console.log(`[2] AttendanceTrendChart.jsx replaced ${matchCount}/${replacements.length} regexes.`);
