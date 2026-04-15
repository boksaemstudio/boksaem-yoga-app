/**
 * FeaturesPage + ContactModal 현지화 키를 translations.js에 추가
 * 
 * 핵심 원칙: "번역"이 아닌 "현지화"
 * - EN: 미국 SaaS B2B 마케팅 톤 (직접적, 액션 지향, Salesforce/HubSpot 스타일)
 * - JA: 일본 비즈니스 경어 (丁寧語), 신뢰감 강조
 * - ZH: 간체 중국어, 전문적이면서 현대적
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// ═══════════════════════════════════════════════
// FEATURES PAGE 키
// ═══════════════════════════════════════════════
const newKeys = {
    ko: {
        // FeaturesPage
        feat_nav_title: "PassFlow 기능 안내",
        feat_nav_consult: "1:1 커스텀 개발 상담",
        feat_hero_title: '소프트웨어에 스튜디오를 맞추지 마세요.<br /><span class="text-gold">SaaS가 원장님께 맞춥니다.</span>',
        feat_hero_sub: 'PassFlow는 "저희는 이런 기능 안 됩니다" 라고 말하지 않습니다. 현존하는 가장 강력한 AI 기반 기능을 100% 원장님의 고유 운영 철학과 관리 방식에 1:1로 피팅(Fitting)해 드립니다.',
        feat_squad_title: "1:1 맞춤형 개발 스쿼드 지원",
        feat_squad_desc: '단순히 월 구독료를 내고 쓰는 시스템이 아닙니다. 스튜디오의 독특한 그룹 수업 룰이나 매출 정산 방식이 있으신가요? 전담 컨설팅을 통해 <strong>모든 니즈에 1대1로 대응하여 기능을 커스텀 디자인 및 추가</strong>해 드립니다.',
        feat_squad_check1: "스튜디오별 고유 맞춤 데이터 테이블 신설",
        feat_squad_check2: "특수 목적 결제 PG 및 마케팅 툴 연동",
        feat_squad_check3: "프라이빗 회원 가입 플로우 디자인",
        feat_dashboard_preview: "원장님 전용 대시보드 맞춤 구성 예시",
        feat_edge_ai_title: "세계 최고 수준의 On-Device Edge AI",
        feat_edge_ai_desc: '비용이 비싼 서버 AI 통신이 아닙니다. 아이패드나 스마트폰의 <strong>자체 브라우저 NPU</strong>를 극한까지 활용하는 On-Device 안면인식을 통해, 인터넷이 끊기는 상황에서도 0.1초만에 회원을 판별하고 출석을 승인합니다.',
        feat_ai_rendering: "AI 모델 실시간 렌더링 최적화 탑재",
        feat_multi_tenant_title: "멀티-테넌트 다이렉트 확장성",
        feat_multi_tenant_desc: '지금은 지점이 1개지만, 프랜차이즈화를 꿈꾸시나요? 단 한 번의 버튼 클릭으로 동일한 브랜딩이 적용된 <strong>제 2, 제 3의 지점 통합 서버 공간</strong>이 생성됩니다.',
        feat_tenant_check1: "전 지점 크로스 회원권(Cross-Membership) 지원",
        feat_tenant_check2: "강사별 로테이션 출강 자동 급여 계산",
        feat_cta_title: "지금 바로 전문가 조직과 상담하세요",
        feat_cta_btn: "1:1 맞춤 스튜디오 컨설팅 즉시 신청",
        feat_inquiry_success: "성공적으로 접수되었습니다.",
        feat_inquiry_followup: "비즈니스 파트너 전담팀에서 1영업일 이내 연락드리겠습니다.",
        feat_inquiry_title: "1:1 맞춤형 커스텀 문의",
        feat_inquiry_desc: "원하시는 어떤 기능이든, 스튜디오 프로세스에 맞추어 플랫폼을 1:1로 조정해 드리는 프리미엄 플랜을 상담받아 보세요.",
        feat_inquiry_studio: "스튜디오 / 기업명",
        feat_inquiry_feature_label: "원하시는 맞춤 기능 / 연동 내용",
        feat_inquiry_feature_ph: "예: 저희는 그룹 스케줄 외에 개인 PT 특화된 달력이 필요합니다.",
        feat_inquiry_submit: "개발 컨설팅 요청하기",
        // ContactModal
        contact_success: "성공적으로 접수되었습니다.",
        contact_followup: "전담팀에서 영업일 기준 1일 내에 연락드리겠습니다.",
        contact_title: "플랫폼 도입 및 1:1 커스텀 상담",
        contact_desc: "원장님의 스튜디오에 완벽히 맞춘 1:1 맞춤형 SaaS 기능 가이드를 지원합니다.",
        contact_name_label: "이름 (또는 스튜디오명)",
        contact_phone_label: "연락처 (선택)",
        contact_email_label: "답변받을 이메일",
        contact_message_label: "도입 목적 및 문의사항",
        contact_placeholder: "필요하신 스케줄이나 특별한 요구사항을 적어주세요.",
        contact_submit: "상담 요청하기",
    },
    en: {
        // FeaturesPage — Natural American SaaS marketing voice
        feat_nav_title: "PassFlow Features",
        feat_nav_consult: "Custom Development",
        feat_hero_title: 'Don\'t adapt your studio to software.<br /><span class="text-gold">Let SaaS adapt to you.</span>',
        feat_hero_sub: 'PassFlow never says "we don\'t support that." We fit the most powerful AI-driven tools 100% to your unique operational philosophy—built around how <em>you</em> run your business.',
        feat_squad_title: "Your Dedicated Development Squad",
        feat_squad_desc: 'This isn\'t a one-size-fits-all subscription. Have unique group class policies or revenue models? Through dedicated consulting, we <strong>custom-design and build every feature</strong> to fit your exact needs. That\'s what sets us apart.',
        feat_squad_check1: "Custom data architecture tailored to your studio",
        feat_squad_check2: "Bespoke payment gateway & marketing integrations",
        feat_squad_check3: "Private branded member onboarding flows",
        feat_dashboard_preview: "Custom Dashboard Configuration Preview",
        feat_edge_ai_title: "World-Class On-Device Edge AI",
        feat_edge_ai_desc: 'No expensive cloud API calls. By leveraging your iPad or smartphone\'s <strong>built-in browser NPU</strong> to its fullest, our on-device facial recognition identifies members in 0.1 seconds — even offline. Enterprise-grade tech, startup-friendly pricing.',
        feat_ai_rendering: "Real-time AI model rendering optimization",
        feat_multi_tenant_title: "Multi-Tenant, Instant Scalability",
        feat_multi_tenant_desc: 'One location today, a franchise tomorrow? A single click deploys your next branded branch with <strong>unified server infrastructure</strong>. Manage revenue and attendance across every location from one Super Admin account.',
        feat_tenant_check1: "Cross-location membership support",
        feat_tenant_check2: "Automated payroll for rotating instructors",
        feat_cta_title: "Talk to Our Solutions Team Today",
        feat_cta_btn: "Schedule Your Custom Consultation",
        feat_inquiry_success: "Your request has been submitted.",
        feat_inquiry_followup: "Our solutions team will be in touch within 1 business day.",
        feat_inquiry_title: "Custom Feature Consultation",
        feat_inquiry_desc: "Whatever you envision for your studio, we tailor the platform to match. Explore our premium customization plans.",
        feat_inquiry_studio: "Studio / Business Name",
        feat_inquiry_feature_label: "Features & Integrations Needed",
        feat_inquiry_feature_ph: "e.g. We need a 1-on-1 session calendar alongside group schedules.",
        feat_inquiry_submit: "Request a Custom Build",
        // ContactModal
        contact_success: "Request submitted successfully.",
        contact_followup: "Our team will be in touch within 1 business day.",
        contact_title: "Platform Setup & Customization",
        contact_desc: "We design tailored SaaS features around your studio's exact workflow. Let us show you what's possible.",
        contact_name_label: "Name / Studio Name",
        contact_phone_label: "Phone (Optional)",
        contact_email_label: "Email Address",
        contact_message_label: "Message / Requirements",
        contact_placeholder: "Describe your scheduling needs, integrations, or any special operations requirements.",
        contact_submit: "Request Consultation",
    },
    ja: {
        // FeaturesPage — 日本のB2B SaaS 丁寧語
        feat_nav_title: "PassFlow 機能詳細",
        feat_nav_consult: "カスタム開発相談",
        feat_hero_title: 'ソフトウェアにスタジオを合わせないでください。<br /><span class="text-gold">SaaSがオーナー様に合わせます。</span>',
        feat_hero_sub: 'PassFlowは「その機能は対応していません」とは言いません。最も強力なAI基盤機能を、オーナー様固有の運営哲学と管理方式に100%フィッティングいたします。',
        feat_squad_title: "専属カスタム開発チーム",
        feat_squad_desc: '単なる月額サブスクリプションではありません。独自のグループレッスンルールや売上精算方式をお持ちですか？専任コンサルティングにより、<strong>すべてのニーズに1対1で対応し、機能をカスタム設計・追加</strong>いたします。',
        feat_squad_check1: "スタジオ別カスタムデータアーキテクチャ構築",
        feat_squad_check2: "決済ゲートウェイ＆マーケティングツール専用連携",
        feat_squad_check3: "プライベート会員登録フローデザイン",
        feat_dashboard_preview: "オーナー様専用ダッシュボード構成例",
        feat_edge_ai_title: "世界最高水準のオンデバイスEdge AI",
        feat_edge_ai_desc: '高額なサーバーAI通信ではありません。iPadやスマートフォンの<strong>内蔵ブラウザNPU</strong>を最大限活用したオンデバイス顔認識で、オフラインでも0.1秒で会員を識別し出席を承認します。',
        feat_ai_rendering: "AIモデルリアルタイムレンダリング最適化搭載",
        feat_multi_tenant_title: "マルチテナント・ダイレクト拡張性",
        feat_multi_tenant_desc: '現在1店舗でもフランチャイズ展開をお考えですか？ワンクリックで同一ブランディングの<strong>統合サーバー空間</strong>が構築されます。全店舗の売上と出席をスーパーアドミンで一元管理できます。',
        feat_tenant_check1: "全店舗クロスメンバーシップ対応",
        feat_tenant_check2: "講師ローテーション勤務の自動給与計算",
        feat_cta_title: "今すぐ専門チームにご相談ください",
        feat_cta_btn: "カスタムコンサルティングを予約する",
        feat_inquiry_success: "正常に受付されました。",
        feat_inquiry_followup: "ソリューションチームが1営業日以内にご連絡いたします。",
        feat_inquiry_title: "カスタム機能コンサルティング",
        feat_inquiry_desc: "どのような機能でも、スタジオのワークフローに合わせてプラットフォームをカスタマイズいたします。",
        feat_inquiry_studio: "スタジオ名・企業名",
        feat_inquiry_feature_label: "必要な機能・連携内容",
        feat_inquiry_feature_ph: "例：グループスケジュール以外にプライベートレッスン専用カレンダーが必要です。",
        feat_inquiry_submit: "カスタム開発を相談する",
        // ContactModal
        contact_success: "正常に受付されました。",
        contact_followup: "担当チームが1営業日以内にご連絡いたします。",
        contact_title: "プラットフォーム導入・カスタム相談",
        contact_desc: "スタジオのワークフローに完全に適合した1:1カスタムSaaS機能設計をサポートいたします。",
        contact_name_label: "お名前（またはスタジオ名）",
        contact_phone_label: "電話番号（任意）",
        contact_email_label: "メールアドレス",
        contact_message_label: "お問い合わせ内容",
        contact_placeholder: "スケジュール要件や特別な運営ニーズをご記入ください。",
        contact_submit: "相談を申し込む",
    },
};

// 각 언어 섹션에 키 주입
function injectKeys(content, langCode, keys) {
    // 해당 언어 섹션의 시작 위치 찾기
    const sectionStart = content.indexOf(`    ${langCode}: {`);
    if (sectionStart === -1) {
        console.log(`⚠️ ${langCode} 섹션을 찾을 수 없습니다`);
        return content;
    }
    
    // 첫 번째 { 뒤에 주입
    const bracePos = content.indexOf('{', sectionStart + 5);
    if (bracePos === -1) return content;
    
    // 이미 주입되었는지 확인
    const sectionEnd = content.indexOf('\n    },', sectionStart);
    const section = content.substring(sectionStart, sectionEnd > -1 ? sectionEnd : sectionStart + 5000);
    
    const firstKey = Object.keys(keys)[0];
    if (section.includes(`"${firstKey}"`) || section.includes(`${firstKey}:`)) {
        console.log(`ℹ️  ${langCode} 섹션에 이미 ${firstKey} 키가 존재합니다`);
        return content;
    }
    
    // 키-값 문자열 생성
    let keyStr = '\n        // Features Page & Contact Modal i18n';
    for (const [key, val] of Object.entries(keys)) {
        const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        keyStr += `\n        "${key}": "${escaped}",`;
    }
    
    content = content.substring(0, bracePos + 1) + keyStr + content.substring(bracePos + 1);
    console.log(`✅ ${langCode} 섹션에 ${Object.keys(keys).length}개 키 추가 완료`);
    return content;
}

content = injectKeys(content, 'ko', newKeys.ko);
content = injectKeys(content, 'en', newKeys.en);
content = injectKeys(content, 'ja', newKeys.ja);

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ 총 ${Object.keys(newKeys.ko).length * 3}개 번역 키 추가 완료!`);
