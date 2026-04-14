const fs = require('fs');
const path = require('path');

// SaaS Expert Level Localization Map
const marketingKeys = {
    mkt_title_main: {
        ko: "체육시설 무인화의 궁극적 완성,<br /><span className=\"text-gold\">단 하나의 플랫폼</span>으로 끝냅니다.",
        en: "The Ultimate Unmanned Studio Solution.<br />Master Everything with a <span className=\"text-gold\">Single Platform</span>.",
        ja: "フィットネス無人化の究極の完成。<br /><span className=\"text-gold\">たった一つのプラットフォーム</span>で全てを解決します。",
        zh: "健身房无人化管理的终极形态，<br /><span className=\"text-gold\">一个平台</span>解决所有运营痛点。"
    },
    mkt_title_sub: {
        ko: "안면인식 출석부터 다지점 회원 통합 관리, 수업 클래스 스케줄링, 자동 급여 정산까지. 오직 피트니스와 요가 스튜디오만을 위해 설계된 글로벌 SaaS.",
        en: "From AI facial recognition check-ins to unified multi-branch member management, smart scheduling, and automated payroll. A global SaaS engineered exclusively for fitness and yoga studios.",
        ja: "顔認証チェックインから複数店舗の会員統合管理、クラスのスケジュール予約、そして給与の自動計算まで。フィットネスとヨガスタジオのためだけに設計されたグローバルSaaS。",
        zh: "从AI人脸识别签到、多店会员统一管理、课程预约排期，到自动薪酬结算。专为健身与瑜伽工作室量身打造的全球化SaaS系统。"
    },
    mkt_btn_demo: {
        ko: "관리자/회원 데모 체험하기", en: "Experience Interactive Demo", ja: "管理者/会員デモを体験する", zh: "立即体验管理/会员演示"
    },
    mkt_btn_consult: {
        ko: "맞춤 도입 상담", en: "Get a Custom Consultation", ja: "カスタマイズ導入のご相談", zh: "获取一对一定制方案"
    },
    mkt_badge: {
        ko: "세계 1등 비전 AI 안면인식 시스템", en: "World's #1 Vision AI Recognition System", ja: "世界No.1 ビジョンAI顔認証システム", zh: "全球领先的视觉AI人脸识别平台"
    },
    mkt_feat_title: {
        ko: "스튜디오 운영을 압도적으로 바꿉니다", en: "Revolutionize Your Studio Operations", ja: "スタジオ運営を圧倒的に変革します", zh: "彻底颠覆您的工作室运营模式"
    },
    mkt_feat1_title: { ko: "AI 안면 출석 자동화", en: "AI Facial Check-in Automation", ja: "AI顔認証による自動チェックイン", zh: "AI人脸签到自动化" },
    mkt_feat1_desc: {
        ko: "오직 얼굴 카메라 하나로 신규 회원과 기존 회원을 0.2초만에 구분합니다. 대리 출석 방지는 물론 인사말까지 건네줍니다.",
        en: "Identify new and existing members in just 0.2 seconds using only a camera. Prevents buddy punching while delivering personalized greetings.",
        ja: "カメラ一つで新規会員と既存会員をわずか0.2秒で見分けます。代理チェックインを防ぎ、自動で挨拶まで行います。",
        zh: "仅需一个摄像头，0.2秒内即可精准区分新老会员。彻底杜绝代签现象，并提供温暖的专属问候。"
    },
    mkt_inq_title: { ko: "플랫폼 도입 및 1:1 커스텀 상담", en: "Platform Setup & 1:1 Custom Consultation", ja: "プラットフォーム導入＆1対1カスタマイズ相談", zh: "系统导入及一对一定制咨询" },
    mkt_inq_sub: { 
        ko: "원장님의 스튜디오에 완벽히 맞춘 1:1 맞춤형 SaaS 기능 디자인을 지원합니다.",
        en: "We provide 1:1 tailored SaaS feature designs perfectly aligned with your studio's unique workflow.",
        ja: "オーナー様のスタジオに完全に合わせた1対1のオーダーメイドSaaS機能設計をサポートいたします。",
        zh: "我们提供与您工作室运营流程完美契合的1:1定制化SaaS功能设计。"
    },
    // FEATURES PAGE
    mkt_feat_page_title: {
        ko: "소프트웨어에 스튜디오를 맞추지 마세요.<br /><span className=\"text-gold\">SaaS가 원장님께 맞춥니다.</span>",
        en: "Don't adapt your studio to the software.<br /><span className=\"text-gold\">Let our SaaS adapt to you.</span>",
        ja: "ソフトウェアにスタジオを合わせないでください。<br /><span className=\"text-gold\">SaaSがオーナー様に合わせます。</span>",
        zh: "别让您的工作室去适应软件，<br /><span className=\"text-gold\">让我们的SaaS为您量身改变。</span>"
    },
    mkt_feat_page_sub: {
        ko: "PassFlow는 '안 됩니다' 라고 말하지 않습니다. 현존하는 가장 강력한 기능을 원장님의 관리 방식에 1:1로 피팅(Fitting)해 드립니다.",
        en: "PassFlow never says 'we can't do that'. We custom-fit the most powerful existing features perfectly to your specific management style.",
        ja: "PassFlowは「それはできません」とは言いません。現存する最強の機能を、オーナー様の管理スタイルに1対1でフィッティングさせます。",
        zh: "PassFlow 从不说“这做不到”。我们将最强大的现有功能，一比一完美嵌入您的专属管理模式中。"
    },
    mkt_consult_btn: {ko: "1:1 맞춤 스튜디오 컨설팅 즉시 신청", en: "Request Your 1:1 Studio Consulting Now", ja: "1対1のスタジオコンサルティングを今すぐ申し込む", zh: "立即申请一对一专属工作室咨询"}
};

const translationFilePath = path.join(__dirname, '../src/utils/translations.js');
let translationsCode = fs.readFileSync(translationFilePath, 'utf8');

// The file exports const translations = { ko: {...}, en: {...}, ... }
// We need to inject these keys into each language branch safely.
// Since translations.js might be perfectly formatted, writing a regex logic:

['ko', 'en', 'ja', 'zh', 'ru'].forEach(lang => {
    Object.keys(marketingKeys).forEach(key => {
        const val = marketingKeys[key][lang] || marketingKeys[key]['en'];
        // escape quotes
        const safeVal = val.replace(/"/g, '\\"').replace(/\n/g, ' ');
        // Inject right before the closing bracket of the lang object.
        const langHeaderRegex = new RegExp("(" + lang + ":\\s*\\{[\\s\\S]*?)(\\},\\n\\s*(?:en|ja|ru|zh|ko):|\\}\\s*;)");
        translationsCode = translationsCode.replace(langHeaderRegex, "$1  \"" + key + "\": \"" + safeVal + "\",\n$2");
    });
});

fs.writeFileSync(translationFilePath, translationsCode);
console.log('✅ Marketing Dictionary Injected successfully into translations.js');
