const fs = require('fs');
const path = require('path');

// 1. Target files
const membersTabPath = path.join(__dirname, '../src/components/admin/tabs/MembersTab.jsx');

// I will write a regex list exactly focusing on the korean strings found.
// But wait, the admin strings might be many. 
const replacements = [
    { regex: /'데이터 로딩 중\.\.\.'/g, replace: "(t('admin_members_loading') || '데이터 로딩 중...')" },
    { regex: /'신규 회원 등록하기'/g, replace: "(t('admin_members_btn_add') || '신규 회원 등록하기')" },
    
    // Stats grid
    { regex: /'활동중인 회원'/g, replace: "(t('admin_members_stat_active') || '활동중인 회원')" },
    { regex: /\{summary\.activeMembers\}\{t\('명'\)\}/g, replace: "{summary.activeMembers}{(t('단위_명') || '명')}" },
    
    { regex: /'오늘 등록·결제'/g, replace: "(t('admin_members_stat_today_reg') || '오늘 등록·결제')" },
    { regex: /\{summary\.todayRegistration\}\{t\('명'\)\}/g, replace: "{summary.todayRegistration}{(t('단위_명') || '명')}" },
    
    { regex: /'AI 이탈 경고'/g, replace: "(t('admin_members_stat_churn_warn') || 'AI 이탈 경고')" },
    { regex: /\{riskCount\}\{t\('명'\)\}/g, replace: "{riskCount}{(t('단위_명') || '명')}" },
    
    { regex: /'얼굴 미등록'/g, replace: "(t('admin_members_stat_bio_missing') || '얼굴 미등록')" },
    { regex: /\{summary\.bioMissingCount\}\{t\('명'\)\}/g, replace: "{summary.bioMissingCount}{(t('단위_명') || '명')}" },

    { regex: /'오늘 전체 등록'/g, replace: "(t('admin_members_today_total') || '오늘 전체 등록')" },
    { regex: /'오늘 새로 등록하거나'/g, replace: "(t('admin_members_today_desc1') || '오늘 새로 등록하거나')" },
    { regex: /'수강권을 재결제한 회원'/g, replace: "(t('admin_members_today_desc2') || '수강권을 재결제한 회원')" },
    { regex: /'접기'/g, replace: "(t('admin_btn_collapse') || '접기')" },
    { regex: /'펼치기'/g, replace: "(t('admin_btn_expand') || '펼치기')" },
    
    { regex: /\{t\('신규'\)\}/g, replace: "{(t('admin_tab_new') || '신규')}" },
    { regex: /\{t\('재등록'\)\}/g, replace: "{(t('admin_tab_rereg') || '재등록')}" },
    { regex: /'누적 재등록률'/g, replace: "(t('admin_tab_rereg_rate') || '누적 재등록률')" },
    { regex: /\{t\('결제 회원'\)\}/g, replace: "{(t('admin_tab_paid_members') || '결제 회원')}" },
    { regex: /\{t\('최근3개월'\)\}/g, replace: "{(t('admin_tab_recent_3m') || '최근3개월')}" },
    
    { regex: /'🧠 AI 이탈 예측'/g, replace: "(t('admin_tab_ai_churn') || '🧠 AI 이탈 예측')" },
    { regex: /'AI 이탈 예측이란\?'/g, replace: "(t('admin_tab_churn_what') || 'AI 이탈 예측이란?')" },
    { regex: /'활성 회원 중 최근 출석이 없는'/g, replace: "(t('admin_tab_churn_desc1') || '활성 회원 중 최근 출석이 없는')" },
    { regex: /'회원을 위험도별로 분류합니다\.'/g, replace: "(t('admin_tab_churn_desc2') || '회원을 위험도별로 분류합니다.')" },
    { regex: /'⚠ 위험'/g, replace: "(t('admin_tab_churn_critical') || '⚠ 위험')" },
    { regex: /': 30일\+ 미출석 또는'/g, replace: "(t('admin_tab_churn_critical_desc1') || ': 30일+ 미출석 또는')" },
    { regex: /'잔여 1회 이하 \+ 14일\+ 미출석'/g, replace: "(t('admin_tab_churn_critical_desc2') || '잔여 1회 이하 + 14일+ 미출석')" },
    { regex: /'🔶 주의'/g, replace: "(t('admin_tab_churn_high') || '🔶 주의')" },
    { regex: /': 21~29일 미출석'/g, replace: "(t('admin_tab_churn_high_desc') || ': 21~29일 미출석')" },
    { regex: /'💤 관찰'/g, replace: "(t('admin_tab_churn_medium') || '💤 관찰')" },
    { regex: /': 14~20일 미출석'/g, replace: "(t('admin_tab_churn_medium_desc') || ': 14~20일 미출석')" },
    { regex: /'카드를 터치하면 상세 목록과'/g, replace: "(t('admin_tab_churn_tip1') || '카드를 터치하면 상세 목록과')" },
    { regex: /'맞춤 안부 메시지 전송 기능을'/g, replace: "(t('admin_tab_churn_tip2') || '맞춤 안부 메시지 전송 기능을')" },
    { regex: /'사용할 수 있습니다\.'/g, replace: "(t('admin_tab_churn_tip3') || '사용할 수 있습니다.')" },
    
    { regex: /\{totalCount\}\{t\('명'\)\}/g, replace: "{totalCount}{(t('단위_명') || '명')}" },
    
    { regex: /'AI가 회원 데이터를 분석하고 있습니다\.\.\.'/g, replace: "(t('admin_tab_churn_analyzing') || 'AI가 회원 데이터를 분석하고 있습니다...')" },
    { regex: /'✨ 모든 회원이 꾸준히 출석 중입니다\.'/g, replace: "(t('admin_tab_churn_all_good') || '✨ 모든 회원이 꾸준히 출석 중입니다.')" },
    { regex: /'이탈 위험 회원'/g, replace: "(t('admin_tab_churn_risk_members') || '이탈 위험 회원')" },
    { regex: /\{t\('명 감지됨'\)\}/g, replace: "{(t('admin_tab_churn_detected') || '명 감지됨')}" },
    
    { regex: /'알림 수신 가능'/g, replace: "(t('admin_tab_push_enabled') || '알림 수신 가능')" },
    { regex: /'앱 설치 \+ 알림 켜짐 상태로'/g, replace: "(t('admin_tab_push_desc1') || '앱 설치 + 알림 켜짐 상태로')" },
    { regex: /'메시지를 받을 수 있는 인원'/g, replace: "(t('admin_tab_push_desc2') || '메시지를 받을 수 있는 인원')" },
    { regex: /\{t\('회원'\)\}/g, replace: "{(t('admin_label_member') || '회원')}" },
    { regex: /\{summary\.pushEnabledCount\}\{t\('명'\)\}/g, replace: "{summary.pushEnabledCount}{(t('단위_명') || '명')}" },
    { regex: /\{t\('선생님'\)\}/g, replace: "{(t('admin_label_instructor') || '선생님')}" },
    { regex: /\{summary\.instructorPushCount \|\| 0\}\{t\('명'\)\}/g, replace: "{summary.instructorPushCount || 0}{(t('단위_명') || '명')}" },
    { regex: /'앱 설치 회원'/g, replace: "(t('admin_tab_push_installed') || '앱 설치 회원')" },
    
    { regex: /'안면 미등록 회원'/g, replace: "(t('admin_tab_bio_missing') || '안면 미등록 회원')" },
    { regex: /'키오스크 얼굴인식 출석을'/g, replace: "(t('admin_tab_bio_desc1') || '키오스크 얼굴인식 출석을')" },
    { regex: /'위해 얼굴 등록이 아직'/g, replace: "(t('admin_tab_bio_desc2') || '위해 얼굴 등록이 아직')" },
    { regex: /'안 된 활성 회원 수'/g, replace: "(t('admin_tab_bio_desc3') || '안 된 활성 회원 수')" },
    
    { regex: /\{t\('월 매출 현황'\)\}/g, replace: "{(t('admin_tab_monthly_revenue') || '월 매출 현황')}" },
    { regex: /\{t\('원'\)\}/g, replace: "{(t('단위_원') || '원')}" },
    { regex: /'현재 매출'/g, replace: "(t('admin_tab_current_revenue') || '현재 매출')" },
    { regex: /\{t\('일 경과'\)\}/g, replace: "{(t('admin_tab_days_passed') || '일 경과')}" },
    { regex: /\{t\('잔여'\)\}/g, replace: "{(t('admin_tab_days_left') || '잔여')}" },
    { regex: /\{t\('일'\)\}/g, replace: "{(t('단위_일') || '일')}" },
    
    { regex: /'📊 월별 재등록 추이 \(최근 6개월\)'/g, replace: "(t('admin_tab_monthly_rereg_trend') || '📊 월별 재등록 추이 (최근 6개월)')" },
    { regex: /'만료 회원'/g, replace: "(t('admin_tab_expired_member') || '만료 회원')" },
    
    // search input
    { regex: /'🔍 이름 또는 전화번호 검색\.\.\.'/g, replace: "(t('admin_tab_search_ph') || '🔍 이름 또는 전화번호 검색...')" },
    
    // filters sorting legend
    { regex: /'현재'/g, replace: "(t('admin_tab_curr') || '현재')" },
    { regex: /'전체 회원'/g, replace: "(t('admin_tab_all_member') || '전체 회원')" },
    { regex: /'활성 회원'/g, replace: "(t('admin_tab_active_member') || '활성 회원')" },
    { regex: /'오늘 출석 회원'/g, replace: "(t('admin_tab_today_att_member') || '오늘 출석 회원')" },
    { regex: /'오늘 등록 회원'/g, replace: "(t('admin_tab_today_reg_member') || '오늘 등록 회원')" },
    { regex: /'만료\/횟수 임박 회원'/g, replace: "(t('admin_tab_expiring_member') || '만료/횟수 임박 회원')" },
    { regex: /'잠든 회원'/g, replace: "(t('admin_tab_dormant_member') || '잠든 회원')" },
    { regex: /'AI 이탈 예측 회원'/g, replace: "(t('admin_tab_ai_risk_member') || 'AI 이탈 예측 회원')" },
    { regex: /'앱 설치 회원'/g, replace: "(t('admin_tab_installed_member') || '앱 설치 회원')" },
    { regex: /'최신 출석 순'/g, replace: "(t('admin_tab_sort_latest_att') || '최신 출석 순')" },
    { regex: /'최신 설치 순'/g, replace: "(t('admin_tab_sort_latest_inst') || '최신 설치 순')" },
    { regex: /'최신 등록순'/g, replace: "(t('admin_tab_sort_latest_reg') || '최신 등록순')" },
    { regex: /'이름을 가나다순'/g, replace: "(t('admin_tab_sort_name') || '이름을 가나다순')" },
    { regex: /'잔여 횟수 적은 순'/g, replace: "(t('admin_tab_sort_credit_asc') || '잔여 횟수 적은 순')" },
    { regex: /'잔여 횟수 많은 순'/g, replace: "(t('admin_tab_sort_credit_desc') || '잔여 횟수 많은 순')" },
    { regex: /'마감일 임박 순'/g, replace: "(t('admin_tab_sort_end_asc') || '마감일 임박 순')" },
    { regex: /'마감일 여유 순'/g, replace: "(t('admin_tab_sort_end_desc') || '마감일 여유 순')" },
    { regex: /'으로 보고 계십니다\.'/g, replace: "(t('admin_tab_viewing_msg') || '으로 보고 계십니다.')" },
    { regex: /'기본 정렬'/g, replace: "(t('admin_tab_sort_default') || '기본 정렬')" },
    
    // member list actions
    { regex: /전체 선택 \(\{finalFiltered\.length\}명\)/g, replace: "{t('admin_tab_select_all') || '전체 선택'} ({finalFiltered.length}{t('단위_명') || '명'})" },
    { regex: /메시지 보내기 \(\{selectedMemberIds\.length\}\)/g, replace: "{t('admin_tab_btn_send_msg') || '메시지 보내기'} ({selectedMemberIds.length})" },
    { regex: /페이지 \{currentPage\} \/ \{totalPages \|\| 1\}/g, replace: "{t('admin_tab_page') || '페이지'} {currentPage} / {totalPages || 1}" },
    { regex: /'검색 결과가 없거나 회원을 등록해주세요\.'/g, replace: "(t('admin_tab_empty_result') || '검색 결과가 없거나 회원을 등록해주세요.')" },
    
    // Member Item Badges
    { regex: /'🧠 안면인식'/g, replace: "(t('admin_badge_bio') || '🧠 안면인식')" },
    { regex: /'선생님'/g, replace: "(t('admin_label_instructor') || '선생님')" },
    { regex: /'회원'/g, replace: "(t('admin_label_member') || '회원')" },
    { regex: /'메모 작성\/수정'/g, replace: "(t('admin_tt_memo') || '메모 작성/수정')" },
    { regex: /'활동중'/g, replace: "(t('admin_badge_active') || '활동중')" },
    { regex: /'시작 대기중'/g, replace: "(t('admin_badge_pending_start') || '시작 대기중')" },
    { regex: /'만료\/소진'/g, replace: "(t('admin_badge_expired') || '만료/소진')" },
    { regex: /'만료\/임박'/g, 기replace: "(t('admin_badge_expiring') || '만료/임박')" },
    { regex: /'선등록 대기중'/g, replace: "(t('admin_badge_pre_reg') || '선등록 대기중')" },
    { regex: /'⏸️ 홀딩 중'/g, replace: "(t('admin_badge_holding') || '⏸️ 홀딩 중')" }
];

let content = fs.readFileSync(membersTabPath, 'utf8');
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
fs.writeFileSync(membersTabPath, content);
console.log(`[Admin MembersTab.jsx]: replaced ${matchCount}/${replacements.length}`);
