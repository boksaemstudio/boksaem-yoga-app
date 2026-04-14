const fs = require('fs');

const missingKeys = 'collapse, expand, addToHomeScreen, addToHomeShort, collapseAll, expandAll, collapseAllCards, expandAllCards, collapseAllCardsDesc, expandAllCardsDesc, aiRefreshConfirm, aiAnalysisShort, aiRefreshTitle, aiRefreshDesc, notificationsOn, notificationsOff, allBranches, admin_members_loading, admin_members_btn_add, admin_members_stat_active, admin_members_stat_today_reg, admin_members_stat_churn_warn, admin_members_stat_bio_missing, admin_members_today_total, admin_members_today_desc1, admin_members_today_desc2, admin_btn_collapse, admin_btn_expand, admin_tab_new, admin_tab_rereg, admin_tab_rereg_rate, admin_tab_paid_members, admin_tab_recent_3m, admin_tab_ai_churn, admin_tab_churn_what, admin_tab_churn_desc1, admin_tab_churn_desc2, admin_tab_churn_critical, admin_tab_churn_critical_desc1, admin_tab_churn_critical_desc2, admin_tab_churn_high, admin_tab_churn_high_desc, admin_tab_churn_medium, admin_tab_churn_medium_desc, admin_tab_churn_tip1, admin_tab_churn_tip2, admin_tab_churn_tip3, admin_tab_churn_analyzing, admin_tab_churn_all_good, admin_tab_churn_risk_members, admin_tab_churn_detected, admin_tab_push_enabled, admin_tab_push_desc1, admin_tab_push_desc2, admin_label_member, admin_label_instructor, admin_tab_push_installed, admin_tab_installed_member, admin_tab_bio_missing, admin_tab_bio_desc1, admin_tab_bio_desc2, admin_tab_bio_desc3, admin_tab_monthly_revenue, admin_tab_current_revenue, admin_tab_days_passed, admin_tab_days_left, admin_tab_monthly_rereg_trend, admin_tab_expired_member, admin_tab_search_ph, admin_tab_curr, admin_tab_all_member, admin_tab_active_member, admin_tab_today_att_member, admin_tab_today_reg_member, admin_tab_expiring_member, admin_tab_dormant_member, admin_tab_ai_risk_member, admin_tab_sort_latest_att, admin_tab_sort_latest_inst, admin_tab_sort_latest_reg, admin_tab_sort_name, admin_tab_sort_credit_asc, admin_tab_sort_credit_desc, admin_tab_sort_end_asc, admin_tab_sort_end_desc, admin_tab_viewing_msg, admin_tab_sort_default, admin_tab_select_all, admin_tab_btn_send_msg, admin_tab_page, admin_tab_empty_result, admin_badge_bio, admin_tt_memo, admin_badge_active, admin_badge_pending_start, admin_badge_expired, admin_badge_pre_reg, admin_badge_holding, attendance, noAttendanceRecords, activityLog';

const lines = fs.readFileSync('src/utils/translations.js', 'utf8').split('\n');

const koAdditions = [];
const enAdditions = [];

missingKeys.split(',').map(k => k.trim()).forEach(key => {
    let textKo = key;
    let textEn = key;
    if (key === 'expandAll') { textKo = '전체 펼치기'; textEn = 'Expand All'; }
    if (key === 'collapseAll') { textKo = '전체 접기'; textEn = 'Collapse All'; }
    if (key === 'expandAllCards') { textKo = '전체 카드 펼치기'; textEn = 'Expand All Cards'; }
    if (key === 'collapseAllCards') { textKo = '전체 카드 접기'; textEn = 'Collapse All Cards'; }
    if (key === 'expandAllCardsDesc') { textKo = '화면의 모든 카드를 펼쳐 상세 정보를 봅니다.'; textEn = 'Expand all cards to see details.'; }
    if (key === 'collapseAllCardsDesc') { textKo = '화면의 모든 카드를 접어 요약 정보만 봅니다.'; textEn = 'Collapse all cards to see summaries.'; }
    if (key === 'navPricing') { textKo = '가격표'; textEn = 'Pricing'; }
    if (key === 'navTrash') { textKo = '휴지통'; textEn = 'Trash'; }
    
    koAdditions.push(`        "${key}": "${textKo}",`);
    enAdditions.push(`        "${key}": "${textEn}",`);
});

const output = [];
for(let line of lines) {
    if (line.includes('ko: {')) {
        output.push(line);
        output.push(koAdditions.join('\n'));
    } else if (line.includes('en: {')) {
        output.push(line);
        output.push(enAdditions.join('\n'));
    } else {
        output.push(line);
    }
}
fs.writeFileSync('src/utils/translations.js', output.join('\n'));
console.log('Injected translations.');
