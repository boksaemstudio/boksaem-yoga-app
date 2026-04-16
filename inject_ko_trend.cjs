const fs = require('fs');

const filePath = 'src/utils/translations.js';
let code = fs.readFileSync(filePath, 'utf8');

const koTranslations = {
  "admin_trend_this_week": "이번 주",
  "admin_trend_mon_to_today": "월~오늘",
  "admin_trend_last_week": "지난 주",
  "admin_trend_vs_same_time": "동일 시점 대비",
  "admin_trend_collecting": "집계 중",
  "admin_trend_attendance": "출석",
  "admin_trend_count_unit": "건",
  "admin_trend_in_progress": "진행 중",
  "admin_trend_new": "신규",
  "admin_trend_existing": "기존",
  "admin_trend_7d_avg": "7일 평균",
  "admin_trend_day_mon": "월",
  "admin_trend_day_tue": "화",
  "admin_trend_day_wed": "수",
  "admin_trend_day_thu": "목",
  "admin_trend_day_fri": "금",
  "admin_trend_day_sat": "토",
  "admin_trend_day_sun": "일",
  "admin_trend_hour_suffix": "시",
  "admin_trend_few": "적음",
  "admin_trend_moderate": "보통",
  "admin_trend_peak": "피크",
  "admin_trend_top5_class": "🏆 인기 수업 Top 5",
  "admin_trend_no_data": "데이터 없음",
  "admin_trend_top5_inst": "⭐ 인기 강사 Top 5",
  "admin_trend_ratio_title_pp": "수강 인원 비율 (신규 vs 기존 회원)",
  "admin_trend_distinct_members": "순수 인원(명) 기준",
  "admin_trend_new_pp": "신규 회원",
  "admin_trend_recent_30d": "최근 30일 등록",
  "admin_trend_existing_pp": "기존 회원",
  "admin_trend_same_period": "동일 기간",
  "admin_trend_analyzing": "출석 추세 분석 중...",
  "admin_trend_title": "출석 추세 분석",
  "admin_trend_tab_daily": "일별 추세",
  "admin_trend_tab_heatmap": "히트맵",
  "admin_trend_tab_ranking": "인기 분석",
  "admin_trend_filter_all": "📊 전체 통합",
  "admin_trend_1year": "1년",
  "admin_trend_daily_dot": "○ 점선 = 오늘(집계 중)",
  "admin_trend_general": "일반",
  "admin_trend_unassigned": "미지정",
  "admin_trend_admin": "관리자"
};

// Update or insert into the 'ko' object
// We find the block for 'ko: {'
const koStart = code.indexOf('ko: {');
if (koStart !== -1) {
    let injection = '\n';
    for (const [k, v] of Object.entries(koTranslations)) {
        injection += `        "${k}": "${v}",\n`;
    }
    
    // Insert right after 'ko: {'
    code = code.substring(0, koStart + 5) + injection + code.substring(koStart + 5);
    
    fs.writeFileSync(filePath, code);
    console.log('Successfully injected Korean trend translations.');
} else {
    console.error('Could not find ko: { block');
}
