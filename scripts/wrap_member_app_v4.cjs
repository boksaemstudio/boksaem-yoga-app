const fs = require('fs');
const path = require('path');

const koKeys = {
    member_calendar_booking_fail: "예약 실패: ",
    member_calendar_booking_cancel_error: "취소 처리 중 오류가 발생했습니다",
    member_calendar_booking_unknown: "알 수 없는 오류",
    member_calendar_modal_cap: "정원",
    member_calendar_modal_cap_people: "명",
    member_calendar_modal_close: "닫기",
    member_calendar_modal_processing: "처리 중...",
    member_calendar_modal_cancel_wait: "대기 취소",
    member_calendar_modal_cancel_book: "예약 취소",
    member_calendar_modal_book_wait: "대기 등록",
    member_calendar_modal_book_full: "정원 마감",
    member_calendar_modal_book_btn: "예약하기",
    member_calendar_badge_wait: "대기",
    member_calendar_badge_book: "예약",
    member_calendar_legend_my_book: "내 예약"
};

const enKeys = {
    member_calendar_booking_fail: "Booking failed: ",
    member_calendar_booking_cancel_error: "An error occurred while canceling.",
    member_calendar_booking_unknown: "Unknown error",
    member_calendar_modal_cap: "Capacity",
    member_calendar_modal_cap_people: " pax",
    member_calendar_modal_close: "Close",
    member_calendar_modal_processing: "Processing...",
    member_calendar_modal_cancel_wait: "Cancel Waitlist",
    member_calendar_modal_cancel_book: "Cancel Booking",
    member_calendar_modal_book_wait: "Join Waitlist",
    member_calendar_modal_book_full: "Class Full",
    member_calendar_modal_book_btn: "Book Class",
    member_calendar_badge_wait: "Waiting",
    member_calendar_badge_book: "Booked",
    member_calendar_legend_my_book: "My Bookings"
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('member_calendar_booking_fail')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== MEMBER CALENDAR UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap MemberScheduleCalendar.jsx
const pnsPath = path.join(__dirname, '../src/components/MemberScheduleCalendar.jsx');
let content = fs.readFileSync(pnsPath, 'utf8');

const replacements = [
    { regex: /\`예약 실패: \$\{e\.message \|\| '알 수 없는 오류'\}\`/g, replace: "`${t('member_calendar_booking_fail') || '예약 실패: '}${e.message || (t('member_calendar_booking_unknown') || '알 수 없는 오류')}`" },
    { regex: /'취소 처리 중 오류가 발생했습니다'/g, replace: "(t('member_calendar_booking_cancel_error') || '취소 처리 중 오류가 발생했습니다')" },
    
    { regex: />정원</g, replace: ">{t('member_calendar_modal_cap') || '정원'}<" },
    { regex: /\}명/g, replace: "}{t('member_calendar_modal_cap_people') || '명'}" },
    
    // buttons
    { regex: />닫기</g, replace: ">{t('member_calendar_modal_close') || '닫기'}<" },
    
    { regex: /'처리 중\.\.\.'/g, replace: "(t('member_calendar_modal_processing') || '처리 중...')" },
    { regex: /'대기 취소'/g, replace: "(t('member_calendar_modal_cancel_wait') || '대기 취소')" },
    { regex: /'예약 취소'/g, replace: "(t('member_calendar_modal_cancel_book') || '예약 취소')" },
    { regex: /'대기 등록'/g, replace: "(t('member_calendar_modal_book_wait') || '대기 등록')" },
    { regex: /'정원 마감'/g, replace: "(t('member_calendar_modal_book_full') || '정원 마감')" },
    { regex: /'예약하기'/g, replace: "(t('member_calendar_modal_book_btn') || '예약하기')" },
    { regex: /'대기' : '예약'/g, replace: "t('member_calendar_badge_wait') || '대기' : t('member_calendar_badge_book') || '예약'" },
    
    { regex: />\s*내 예약\s*</g, replace: "> {t('member_calendar_legend_my_book') || '내 예약'} <" },
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

fs.writeFileSync(pnsPath, content);
console.log(`[2] MemberScheduleCalendar.jsx replaced ${matchCount}/${replacements.length} regexes.`);
