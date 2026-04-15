/**
 * 영어 번역 사전(en)에서 한국어로 남아있는 키를 영어로 일괄 교체 - ROBUST VERSION
 * 줄바꿈 차이(CR/LF)에 안전하게 정규식 기반으로 교체합니다.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.bak2', content, 'utf8');

const fixes = [
    // UI 기본
    ['collapse', '접기', 'Collapse'],
    ['expand', '펼치기', 'Expand'],
    ['addToHomeScreen', '홈 화면에 추가', 'Add to Home Screen'],
    ['addToHomeShort', '홈에 추가', 'Add to Home'],
    
    // AI 관련
    ['aiRefreshConfirm', 'AI 분석을 새로 요청하시겠습니까?', 'Refresh AI analysis?'],
    ['aiAnalysisShort', 'AI 분석', 'AI Analysis'],
    ['aiRefreshTitle', 'AI 분석 새로고침', 'Refresh AI Analysis'],
    ['aiRefreshDesc', '최신 데이터로 AI 브리핑을 다시 생성합니다.', 'Regenerate AI briefing with latest data.'],
    
    // 알림 관련
    ['notificationsOn', '알림 켜기', 'Notifications On'],
    ['notificationsOff', '알림 끄기', 'Notifications Off'],
    ['allBranches', '전체 지점', 'All Branches'],

    // Admin
    ['admin_members_loading', '데이터 로딩 중...', 'Loading data...'],
    ['admin_members_btn_add', '신규 회원 등록', 'Add New Member'],
    ['admin_members_stat_active', '활동중인 회원', 'Active Members'],
    ['admin_members_stat_today_reg', '오늘 등록·결제', "Today's Registrations"],
    ['admin_members_stat_churn_warn', 'AI 이탈 경고', 'AI Churn Alert'],
    ['admin_members_stat_bio_missing', '얼굴 미등록', 'Face Not Registered'],
    ['admin_members_today_total', '오늘 전체 등록', 'Total Registrations Today'],
    ['admin_members_today_desc1', '오늘 새로 등록하거나', 'Members newly registered'],
    ['admin_members_today_desc2', '재등록한 회원입니다.', 'or renewed today.'],
    ['admin_btn_collapse', '접기', 'Collapse'],
    ['admin_btn_expand', '펼치기', 'Expand'],
    ['admin_tab_new', '신규', 'New'],
    ['admin_tab_rereg', '재등록', 'Renewed'],
    ['admin_tab_rereg_rate', '누적 재등록률', 'Cumulative Renewal Rate'],
    ['admin_tab_paid_members', '유료 등록 회원', 'Paid Members'],
    ['admin_tab_recent_3m', '최근 3개월', 'Last 3 Months'],
    ['admin_tab_ai_churn', '🧠 AI 이탈 예측', '🧠 AI Churn Prediction'],
    ['admin_tab_churn_what', 'AI 이탈 예측이란?', 'What is AI Churn Prediction?'],
    ['admin_tab_churn_desc1', '활성 회원 중 최근 출석이 뜸한 회원을 AI가 분석합니다.', 'AI analyzes active members with recent low attendance.'],
    ['admin_tab_churn_desc2', '위험도에 따라 선제적 관리가 가능합니다.', 'Proactive management based on risk level.'],
    ['admin_tab_churn_critical', '⚠ 위험', '⚠ Critical'],
    ['admin_tab_churn_critical_desc1', '30일 이상 미출석 또는', '30+ days absent or'],
    ['admin_tab_churn_critical_desc2', '잔여 1회 이하 + 14일 미출석', '≤1 credit remaining + 14 days absent'],
    ['admin_tab_churn_high', '🔶 주의', '🔶 Warning'],
    ['admin_tab_churn_high_desc', '21~29일 미출석', '21–29 days absent'],
    ['admin_tab_churn_medium', '💤 관찰', '💤 Watch'],
    ['admin_tab_churn_medium_desc', '14~20일 미출석', '14–20 days absent'],
    ['admin_tab_churn_tip1', '카드를 터치하면 상세 목록을 볼 수 있습니다.', 'Tap a card to view the detail list.'],
    ['admin_tab_churn_tip2', '위험 회원에게 안부 메시지를 보내보세요.', 'Send a check-in message to at-risk members.'],
    ['admin_tab_churn_tip3', '정기적으로 확인하면 이탈을 줄일 수 있습니다.', 'Regular monitoring helps reduce churn.'],
    ['admin_tab_churn_analyzing', 'AI가 회원 데이터를 분석 중...', 'AI is analyzing member data...'],
    ['admin_tab_churn_all_good', '✅ 이탈 위험 회원이 없습니다!', '✅ No at-risk members detected!'],
    ['admin_tab_churn_risk_members', '이탈 위험 회원', 'At-risk Members'],
    ['admin_tab_churn_detected', '명 감지', ' detected'],
    ['admin_tab_push_enabled', '알림 수신 가능', 'Notifications Enabled'],
    ['admin_tab_push_desc1', '앱 설치 + 알림 켜짐 상태로', 'App installed + notifications enabled,'],
    ['admin_tab_push_desc2', '푸시 알림을 수신할 수 있는 회원입니다.', 'these members can receive push notifications.'],
    ['admin_label_member', '회원', 'Member'],
    ['admin_label_instructor', '강사', 'Instructor'],
    ['admin_tab_push_installed', '앱 설치 회원', 'App Installed Members'],
    ['admin_tab_installed_member', '앱 설치 회원', 'App Installed Members'],
    ['admin_tab_bio_missing', '안면 미등록 회원', 'Face Not Registered'],
    ['admin_tab_bio_desc1', '키오스크 얼굴인식 출석을 위해', 'For kiosk facial recognition check-in,'],
    ['admin_tab_bio_desc2', '아직 얼굴 등록이 안 된 회원입니다.', 'these members have not registered their face.'],
    ['admin_tab_bio_desc3', '등록을 안내해보세요.', 'Guide them to register.'],
    ['admin_tab_monthly_revenue', '월간 매출', 'Monthly Revenue'],
    ['admin_tab_current_revenue', '현재 매출', 'Current Revenue'],
    ['admin_tab_days_passed', '일 경과', 'days passed'],
    ['admin_tab_days_left', '일 남음', 'days left'],
    ['admin_tab_monthly_rereg_trend', '월별 재등록 추이', 'Monthly Renewal Trend'],
    ['admin_tab_expired_member', '만료 회원', 'Expired Members'],
    ['admin_tab_search_ph', '🔍 회원 검색 (이름, 전화번호)', '🔍 Search members (name, phone)'],
    ['admin_tab_curr', '현재', 'Current'],
    ['admin_tab_all_member', '전체 회원', 'All Members'],
    ['admin_tab_active_member', '활동 회원', 'Active Members'],
    ['admin_tab_today_att_member', '오늘 출석 회원', "Today's Attendees"],
    ['admin_tab_today_reg_member', '오늘 등록 회원', "Today's Registrations"],
    ['admin_tab_expiring_member', '만료 임박 회원', 'Expiring Soon'],
    ['admin_tab_dormant_member', '장기 미출석 회원', 'Long-term Inactive'],
    ['admin_tab_ai_risk_member', 'AI 이탈 위험 회원', 'AI At-risk Members'],
    ['admin_tab_sort_latest_att', '최근 출석순', 'Recent Attendance'],
    ['admin_tab_sort_latest_inst', '최근 수업순', 'Recent Classes'],
    ['admin_tab_sort_latest_reg', '최근 등록순', 'Recent Registration'],
    ['admin_tab_sort_name', '이름순', 'By Name'],
    ['admin_tab_sort_credit_asc', '잔여 횟수 적은 순', 'Fewest Credits'],
    ['admin_tab_sort_credit_desc', '잔여 횟수 많은 순', 'Most Credits'],
    ['admin_tab_sort_end_asc', '마감일 임박 순', 'Expiring Soonest'],
    ['admin_tab_sort_end_desc', '마감일 여유 순', 'Expiring Latest'],
    ['admin_tab_viewing_msg', '으로 보고 계십니다.', 'viewing filter applied.'],
    ['admin_tab_sort_default', '기본 정렬', 'Default Sort'],
    ['admin_tab_select_all', '전체 선택', 'Select All'],
    ['admin_tab_btn_send_msg', '메시지 보내기', 'Send Message'],
    ['admin_tab_page', '페이지', 'Page'],
    ['admin_tab_empty_result', '검색 결과가 없거나 회원이 없습니다.', 'No results found or no members registered.'],
    ['admin_badge_bio', '🧠 안면인식', '🧠 Face ID'],
    ['admin_tt_memo', '메모 작성/수정', 'Add/Edit Memo'],
    ['admin_badge_active', '활동중', 'Active'],
    ['admin_badge_pending_start', '시작 대기중', 'Pending Start'],
    ['admin_badge_expired', '만료/소진', 'Expired/Used Up'],
    ['admin_badge_pre_reg', '선등록 대기중', 'Pre-registered'],
    ['admin_badge_holding', '⏸️ 홀딩 중', '⏸️ On Hold'],
    ['attendance', '출석', 'Attendance'],
    ['noAttendanceRecords', '출석 기록이 없습니다.', 'No attendance records.'],
    ['activityLog', '활동 기록', 'Activity Log'],
];

let count = 0;
let failed = 0;

for (const [key, koVal, enVal] of fixes) {
    // 정규식으로 키와 한국어 값을 정확히 매칭 (줄바꿈/공백에 무관하게)
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedKo = koVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 패턴: "key": "한국어값" (줄 어디에나 있을 수 있음)
    const regex = new RegExp(`("${escapedKey}"\\s*:\\s*)"${escapedKo}"`, 'g');
    
    if (regex.test(content)) {
        // Reset regex lastIndex
        regex.lastIndex = 0;
        content = content.replace(regex, `$1"${enVal}"`);
        count++;
    } else {
        console.log(`⚠️ 매칭 실패: "${key}"`);
        failed++;
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ ${count}개 키 수정 완료! (실패: ${failed}개)`);
