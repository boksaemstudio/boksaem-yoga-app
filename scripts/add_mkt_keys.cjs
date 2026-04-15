/**
 * 랜딩페이지 현지화에 필요한 신규 번역 키를 translations.js에 추가하는 스크립트
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// ---- KO 섹션에 추가 ----
const koKeys = `
        // Marketing / Landing Page
        "mkt_nav_features": "상세기능 보기",
        "mkt_nav_contact": "도입 문의",
        "mkt_nav_admin_login": "관리자 로그인",
        "mkt_feat2_title": "클라우드 다국어 데이터 동기화",
        "mkt_feat2_desc": "해외 어느 로케이션에 지점을 내셔도 완벽합니다. 전 세계 어디서든 언어 장벽 없이 스튜디오를 100% 원격 관리하십시오.",
        "mkt_feat3_title": "강사 앱 & 급여 자동화",
        "mkt_feat3_desc": "강사는 본인 휴대폰에서 스케줄과 출석부를 확인하고, 원장님은 강사를 위한 맞춤 권한과 급여 명세서를 평생 자동으로 산출합니다.",
        "mkt_inquiry_title": "플랫폼 도입 및 1:1 커스텀 상담",
        "mkt_inquiry_desc": "원장님의 스튜디오에 완벽히 맞춘 1:1 맞춤형 SaaS 기능 디자인을 지원합니다. 언제든 편히 문의해 주세요.",
        "mkt_inquiry_name": "성함 (또는 스튜디오명)",
        "mkt_inquiry_phone": "연락처",
        "mkt_inquiry_email": "이메일",
        "mkt_inquiry_message": "문의 및 요청사항",
        "mkt_inquiry_placeholder": "운영 중인 지점 수, 필요한 커스텀 기능 등을 편하게 적어주세요.",
        "mkt_inquiry_submit": "상담 메시지 보내기",
        "mkt_inquiry_success": "성공적으로 전송되었습니다!",
        "mkt_inquiry_followup": "담당자가 곧 연락드리겠습니다.",
        "mkt_inquiry_fail": "메시지 전송에 실패했습니다.",`;

// ---- EN 섹션에 추가 ----
const enKeys = `
        // Marketing / Landing Page
        "mkt_nav_features": "Features",
        "mkt_nav_contact": "Contact",
        "mkt_nav_admin_login": "Admin Login",
        "mkt_feat2_title": "Cloud Multi-language Data Sync",
        "mkt_feat2_desc": "Open branches anywhere in the world. Manage your studio 100% remotely without language barriers.",
        "mkt_feat3_title": "Instructor App & Payroll Automation",
        "mkt_feat3_desc": "Instructors check schedules and attendance from their phone. Owners get custom permissions and automatic lifetime payroll statements.",
        "mkt_inquiry_title": "Platform Consultation",
        "mkt_inquiry_desc": "We provide 1:1 custom SaaS feature design tailored to your studio. Feel free to reach out anytime.",
        "mkt_inquiry_name": "Name (or Studio Name)",
        "mkt_inquiry_phone": "Phone",
        "mkt_inquiry_email": "Email",
        "mkt_inquiry_message": "Inquiry & Requests",
        "mkt_inquiry_placeholder": "Number of branches, custom features needed, etc.",
        "mkt_inquiry_submit": "Send Inquiry",
        "mkt_inquiry_success": "Successfully sent!",
        "mkt_inquiry_followup": "We will contact you shortly.",
        "mkt_inquiry_fail": "Message sending failed.",`;

// ---- JA 섹션에 추가 ----
const jaKeys = `
        // Marketing / Landing Page
        "mkt_nav_features": "機能詳細",
        "mkt_nav_contact": "お問い合わせ",
        "mkt_nav_admin_login": "管理者ログイン",
        "mkt_feat2_title": "クラウド多言語データ同期",
        "mkt_feat2_desc": "世界中どこに支店を開設しても完璧です。言語の壁なく、どこからでもスタジオを100%リモート管理できます。",
        "mkt_feat3_title": "講師アプリ＆給与自動化",
        "mkt_feat3_desc": "講師はスマホでスケジュールと出席簿を確認。オーナーはカスタム権限と給与明細を永久に自動生成します。",
        "mkt_inquiry_title": "プラットフォーム導入相談",
        "mkt_inquiry_desc": "スタジオに完全にカスタマイズされた1:1 SaaS機能設計をサポートします。お気軽にお問い合わせください。",
        "mkt_inquiry_name": "お名前（またはスタジオ名）",
        "mkt_inquiry_phone": "電話番号",
        "mkt_inquiry_email": "メールアドレス",
        "mkt_inquiry_message": "お問い合わせ・ご要望",
        "mkt_inquiry_placeholder": "運営中の店舗数、必要なカスタム機能など、お気軽にご記入ください。",
        "mkt_inquiry_submit": "相談メッセージを送信",
        "mkt_inquiry_success": "正常に送信されました！",
        "mkt_inquiry_followup": "担当者がすぐにご連絡いたします。",
        "mkt_inquiry_fail": "メッセージの送信に失敗しました。",`;


// ko 섹션의 privacyPolicy 키 뒤에 추가
const koAnchor = '"privacyPolicy": "개인정보처리방침",';
if (content.includes(koAnchor)) {
    content = content.replace(koAnchor, koAnchor + koKeys);
    console.log('✅ ko 섹션에 마케팅 키 추가 완료');
} else {
    console.log('⚠️ ko 앵커를 찾을 수 없습니다');
}

// en 섹션에서 적절한 앵커 찾기: "mkt_btn_consult" 키 근처
// 이미 mkt_btn_demo, mkt_btn_consult 등이 있을 수 있으니 확인
const enAnchorCheck = content.indexOf('"mkt_inquiry_title"');
if (enAnchorCheck === -1) {
    // en 섹션의 privacyPolicy 뒤에 추가
    const enPrivacy = 'privacyPolicy: "Privacy Policy",';
    if (content.includes(enPrivacy)) {
        content = content.replace(enPrivacy, enPrivacy + enKeys);
        console.log('✅ en 섹션에 마케팅 키 추가 완료');
    } else {
        console.log('⚠️ en 앵커를 찾을 수 없습니다');
    }
} else {
    console.log('ℹ️ en 섹션에 mkt_inquiry_title이 이미 존재합니다');
}

// ja 섹션 확인
const jaStart = content.indexOf('    ja: {');
if (jaStart > -1) {
    // ja 섹션의 첫 번째 키 앞에 추가
    const jaFirstKey = content.indexOf('"', jaStart + 10);
    if (jaFirstKey > -1) {
        // ja 섹션의 마지막 키/닫는 괄호 앞에 추가 필요 - 간단히 ja: { 바로 뒤에 추가
        const jaInsertPoint = content.indexOf('{', jaStart) + 1;
        // 이미 있는지 확인
        const jaSection = content.substring(jaStart, content.indexOf('\n    },', jaStart));
        if (!jaSection.includes('mkt_nav_features')) {
            content = content.substring(0, jaInsertPoint) + jaKeys + content.substring(jaInsertPoint);
            console.log('✅ ja 섹션에 마케팅 키 추가 완료');
        } else {
            console.log('ℹ️ ja 섹션에 이미 마케팅 키가 존재합니다');
        }
    }
} else {
    console.log('⚠️ ja 섹션을 찾을 수 없습니다');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ 모든 마케팅 키 추가 작업 완료!');
