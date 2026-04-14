const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/utils/translations.js');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('kiosk_select_title')) {
    const koKeys = {
        kiosk_select_title: "회원 선택",
        kiosk_select_desc: "해당하는 회원님을 선택해주세요",
        kiosk_select_timeout: "({timeLeft}초 후 자동 취소)",
        kiosk_select_active_members: "✨ 이용 가능 회원",
        kiosk_select_unlimited: "무제한",
        kiosk_select_sessions_count: "{credits}회",
        kiosk_select_no_active_members: "활성 회원이 없습니다.",
        kiosk_select_inactive_title: "💤 만료/비활성",
        kiosk_select_inactive_badge: "만료/비활성",
        kiosk_select_none: "해당 없음",
        kiosk_select_cancel: "취소 (닫기)",
        kiosk_select_confirm: "선택한 회원으로 출석하기",
        kiosk_select_disabled: "회원을 먼저 선택해주세요",

        kiosk_dup_title: "잠깐만요! 방금 출석하셨어요",
        kiosk_dup_subtitle1_part1: "혹시 ",
        kiosk_dup_subtitle1_highlight: "가족/친구분",
        kiosk_dup_subtitle1_part2: "과 함께 오셨나요?",
        kiosk_dup_subtitle2_part1: "아니라면, 아래 ",
        kiosk_dup_subtitle2_highlight: "빨간 버튼",
        kiosk_dup_subtitle2_part2: "을 눌러주세요!",
        kiosk_dup_cancel_btn: "😱 아차, 잘못 눌렀어요!",
        kiosk_dup_cancel_desc: "(출석 취소하기)",
        kiosk_dup_confirm_btn: "🙆‍♀️ 네, 두명 맞아요",
        kiosk_dup_confirm_desc: "(동반 출석)",
        kiosk_dup_footer_text: "아무것도 안 누르면...",
        kiosk_dup_footer_timer_part1: "초 뒤 자동으로 ",
        kiosk_dup_footer_timer_highlight: "출석 처리",
        kiosk_dup_footer_timer_part2: "됩니다",

        kiosk_success_tbd: "확정 전",
        kiosk_success_unlimited: "무제한",
        kiosk_success_expired: "만료",
        kiosk_success_credits_title: "잔여 횟수",
        kiosk_success_credits_count: "{credits}회",
        kiosk_success_days_title: "잔여 일수",
        kiosk_success_confirm_btn: "확인"
    };
    
    const enKeys = {
        kiosk_select_title: "Select Member",
        kiosk_select_desc: "Please select the corresponding member",
        kiosk_select_timeout: "(Auto-cancels in {timeLeft}s)",
        kiosk_select_active_members: "✨ Available Members",
        kiosk_select_unlimited: "Unlimited",
        kiosk_select_sessions_count: "{credits} sessions",
        kiosk_select_no_active_members: "No active members found.",
        kiosk_select_inactive_title: "💤 Expired/Inactive",
        kiosk_select_inactive_badge: "Expired/Inactive",
        kiosk_select_none: "None",
        kiosk_select_cancel: "Cancel (Close)",
        kiosk_select_confirm: "Check in as selected member",
        kiosk_select_disabled: "Please select a member first",

        kiosk_dup_title: "Wait! You just checked in.",
        kiosk_dup_subtitle1_part1: "Did you come with ",
        kiosk_dup_subtitle1_highlight: "family/friends",
        kiosk_dup_subtitle1_part2: "?",
        kiosk_dup_subtitle2_part1: "If not, please tap the ",
        kiosk_dup_subtitle2_highlight: "red button",
        kiosk_dup_subtitle2_part2: " below!",
        kiosk_dup_cancel_btn: "😱 Oops, wrong button!",
        kiosk_dup_cancel_desc: "(Cancel check-in)",
        kiosk_dup_confirm_btn: "🙆‍♀️ Yes, there are two of us",
        kiosk_dup_confirm_desc: "(Companion check-in)",
        kiosk_dup_footer_text: "If you do nothing...",
        kiosk_dup_footer_timer_part1: "Checked in automatically in ",
        kiosk_dup_footer_timer_highlight: " ",
        kiosk_dup_footer_timer_part2: " seconds",

        kiosk_success_tbd: "TBD",
        kiosk_success_unlimited: "Unlimited",
        kiosk_success_expired: "Expired",
        kiosk_success_credits_title: "Remaining Sessions",
        kiosk_success_credits_count: "{credits}",
        kiosk_success_days_title: "Remaining Days",
        kiosk_success_confirm_btn: "Confirm"
    };

    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        
        let injectStr = '\\n        // =============== KIOSK MODAL UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }

        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        content = content.replace(regex, "$1" + injectStr);
    }

    fs.writeFileSync(file, content);
    console.log('Successfully injected Kiosk Modal keys into translations.js for all languages.');
} else {
    console.log('Keys already exist.');
}
